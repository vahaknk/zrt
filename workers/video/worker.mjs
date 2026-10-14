// Zartsants video worker.
//
// Uploaded platform videos and audio (incl. recordings made in the browser)
// arrive as `platform_files` with status "processing". This worker picks
// them up one at a time:
// - video → a 720p H.264/AAC MP4 that plays in every browser (iPhone HEVC
//   doesn't play in Chrome/Firefox on Windows) + a WebP poster for previews;
// - audio → AAC in .m4a (browser recordings are WebM/Ogg Opus, which older
//   Safari/iPhones can't play); MP3 and AAC files are already fine and kept.
// It replaces the original in the bucket (originals are not kept) and marks
// the file "ready". A file ffmpeg can't read becomes "failed"; one that fails
// half-way stays as uploaded ("ready") with the error noted.
//
// Env: DIRECTUS_URL, DIRECTUS_TOKEN, PLATFORM_S3_ENDPOINT, PLATFORM_S3_REGION,
// PLATFORM_S3_BUCKET, PLATFORM_S3_KEY, PLATFORM_S3_SECRET, optional POLL_SECONDS.

import { spawn } from 'node:child_process';
import { createWriteStream, createReadStream } from 'node:fs';
import { mkdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { S3Client, GetObjectCommand, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const env = process.env;
const POLL_MS = Number(env.POLL_SECONDS ?? 20) * 1000;
// A job claimed this long ago without finishing (worker restarted mid-way)
// is picked up again.
const STALE_MS = 2 * 3600 * 1000;

const s3 = new S3Client({
  endpoint: env.PLATFORM_S3_ENDPOINT,
  region: env.PLATFORM_S3_REGION,
  forcePathStyle: true,
  credentials: { accessKeyId: env.PLATFORM_S3_KEY, secretAccessKey: env.PLATFORM_S3_SECRET },
});
const Bucket = env.PLATFORM_S3_BUCKET;

const log = (...a) => console.log(new Date().toISOString(), ...a);

async function directus(method, path, body) {
  const res = await fetch(`${env.DIRECTUS_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${env.DIRECTUS_TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Directus ${method} ${path} → ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err = (err + d).slice(-4000)));
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} exited ${code}: ${err.trim().split('\n').slice(-3).join(' | ')}`))));
  });
}

// ---------------------------------------------------------------- media

export async function probe(path) {
  const info = JSON.parse(await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', path]));
  const video = info.streams?.find((s) => s.codec_type === 'video' && s.disposition?.attached_pic !== 1);
  const audio = info.streams?.find((s) => s.codec_type === 'audio');
  return { video, audio, duration: Number(info.format?.duration ?? video?.duration ?? 0) };
}

// 720p on the short side (portrait phone videos stay portrait), never
// upscaled; even dimensions as H.264 requires. ffmpeg applies the phone's
// rotation itself.
const SCALE = "scale='if(gte(iw,ih),-2,min(720,iw))':'if(gte(iw,ih),min(720,ih),-2)'";

export async function compress(input, output, hasAudio) {
  await run('ffmpeg', [
    '-hide_banner', '-y', '-i', input,
    '-map', '0:v:0', ...(hasAudio ? ['-map', '0:a:0'] : []),
    '-vf', `${SCALE},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-profile:v', 'high', '-maxrate', '3M', '-bufsize', '6M',
    ...(hasAudio ? ['-c:a', 'aac', '-b:a', '128k', '-ac', '2'] : []),
    '-movflags', '+faststart',
    output,
  ]);
}

export async function compressAudio(input, output) {
  await run('ffmpeg', ['-hide_banner', '-y', '-i', input, '-map', '0:a:0', '-vn', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', output]);
}

// Audio that every browser already plays as is.
function audioIsFine(media, filename) {
  const ext = filename.toLowerCase().split('.').pop();
  const codec = media.audio?.codec_name;
  return (codec === 'mp3' && ext === 'mp3') || (codec === 'aac' && ['m4a', 'mp4', 'aac'].includes(ext));
}

export async function poster(input, output, duration) {
  const at = duration > 2 ? 1 : Math.max(0, duration / 2);
  await run('ffmpeg', [
    '-hide_banner', '-y', '-ss', String(at), '-i', input, '-frames:v', '1',
    '-vf', 'scale=480:480:force_original_aspect_ratio=decrease',
    '-c:v', 'libwebp', '-quality', '75', output,
  ]);
}

// ---------------------------------------------------------------- jobs

async function nextJob() {
  const staleBefore = new Date(Date.now() - STALE_MS).toISOString();
  const filter = encodeURIComponent(
    JSON.stringify({
      _and: [
        { kind: { _in: ['video', 'audio'] } },
        { status: { _eq: 'processing' } },
        { _or: [{ processing_started_at: { _null: true } }, { processing_started_at: { _lt: staleBefore } }] },
      ],
    })
  );
  const res = await directus('GET', `/items/platform_files?filter=${filter}&sort=date_created&limit=1&fields=id,filename,kind,storage_key,size`);
  return res.data?.[0] ?? null;
}

const baseName = (filename) => filename.replace(/\.[^.]+$/, '') || 'video';

async function processJob(file) {
  const work = join(tmpdir(), `zrt-video-${file.id}`);
  await mkdir(work, { recursive: true });
  const input = join(work, 'input');
  const isAudio = file.kind === 'audio';
  const output = join(work, isAudio ? 'output.m4a' : 'output.mp4');
  const thumb = join(work, 'poster.webp');
  await directus('PATCH', `/items/platform_files/${file.id}`, { processing_started_at: new Date().toISOString(), processing_error: null });
  const started = Date.now();
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket, Key: file.storage_key }));
    await pipeline(obj.Body, createWriteStream(input));

    let media;
    try {
      media = await probe(input);
      if (isAudio ? !media.audio : !media.video) throw new Error(isAudio ? 'no audio stream' : 'no video stream');
    } catch (e) {
      log(file.id, 'unreadable:', e.message);
      await directus('PATCH', `/items/platform_files/${file.id}`, { status: 'failed', processing_error: String(e.message).slice(0, 500) });
      return;
    }

    if (isAudio && audioIsFine(media, file.filename)) {
      await directus('PATCH', `/items/platform_files/${file.id}`, { status: 'ready', processing_started_at: null });
      log(file.id, 'audio already plays everywhere — kept as is');
      return;
    }

    const ext = isAudio ? 'm4a' : 'mp4';
    const mime = isAudio ? 'audio/mp4' : 'video/mp4';
    if (isAudio) await compressAudio(input, output);
    else await compress(input, output, !!media.audio);
    const { size } = await stat(output);

    const folder = file.storage_key.slice(0, file.storage_key.lastIndexOf('/'));
    let key = `${folder}/${baseName(file.filename).slice(0, 110)}.${ext}`;
    if (key === file.storage_key) key = key.replace(new RegExp(`\\.${ext}$`), `-web.${ext}`);
    await new Upload({
      client: s3,
      params: { Bucket, Key: key, Body: createReadStream(output), ContentType: mime },
      partSize: 16 * 1024 * 1024,
    }).done();

    let thumbKey = null;
    if (!isAudio) {
      try {
        await poster(output, thumb, media.duration);
        thumbKey = `${folder}/preview.webp`;
        await s3.send(new PutObjectCommand({ Bucket, Key: thumbKey, Body: createReadStream(thumb), ContentType: 'image/webp' }));
      } catch (e) {
        log(file.id, 'poster failed:', e.message);
        thumbKey = null;
      }
    }

    await directus('PATCH', `/items/platform_files/${file.id}`, {
      status: 'ready',
      storage_key: key,
      filename: `${baseName(file.filename)}.${ext}`,
      mime,
      size,
      ...(isAudio ? {} : { thumb_key: thumbKey }),
      processing_started_at: null,
    });
    // The original goes only once the record points at the new file.
    await s3.send(new DeleteObjectCommand({ Bucket, Key: file.storage_key }));
    log(file.id, `done in ${Math.round((Date.now() - started) / 1000)} s: ${Math.round(file.size / 1e6)} MB → ${Math.round(size / 1e6)} MB`);
  } catch (e) {
    // Keep the video as uploaded rather than losing it.
    log(file.id, 'compression failed, keeping original:', e.message);
    await directus('PATCH', `/items/platform_files/${file.id}`, {
      status: 'ready',
      processing_started_at: null,
      processing_error: String(e.message).slice(0, 500),
    }).catch((err) => log(file.id, 'could not record failure:', err.message));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

let stopping = false;
process.on('SIGTERM', () => {
  stopping = true;
  log('SIGTERM: stopping after the current job');
});

export async function main() {
  log(`video worker started, polling every ${POLL_MS / 1000} s`);
  while (!stopping) {
    let job = null;
    try {
      job = await nextJob();
      if (job) {
        log(job.id, `compressing "${job.filename}" (${Math.round(job.size / 1e6)} MB)`);
        await processJob(job);
      }
    } catch (e) {
      log('poll failed:', e.message);
    }
    if (!job) await new Promise((r) => setTimeout(r, POLL_MS));
  }
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
