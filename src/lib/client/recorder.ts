// In-browser sound recording for the platform: opens a small dialog (record →
// stop → listen back → use / record again / cancel) and resolves to an audio
// File for the normal upload path, or null. Labels come from the
// #recorder-labels JSON in PlatformLayout. The media worker converts the
// result to AAC so it plays everywhere.

export const MAX_RECORDING_SECONDS = 5 * 60;

interface Labels {
  title: string;
  start: string;
  stop: string;
  use: string;
  again: string;
  cancel: string;
  denied: string;
  unsupported: string;
  limit: string;
  fileName: string;
}

const FORMATS: Array<[string, string]> = [
  ['audio/mp4;codecs=mp4a.40.2', 'm4a'],
  ['audio/mp4', 'm4a'],
  ['audio/webm;codecs=opus', 'weba'],
  ['audio/webm', 'weba'],
  ['audio/ogg;codecs=opus', 'ogg'],
];

function labels(): Labels {
  try {
    return JSON.parse(document.getElementById('recorder-labels')?.textContent ?? '{}');
  } catch {
    return {} as Labels;
  }
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

let styled = false;
function addStyles() {
  if (styled) return;
  styled = true;
  const css = document.createElement('style');
  css.textContent = `
    .rec-dialog { border: none; border-radius: 16px; padding: 1.5rem; width: min(380px, calc(100vw - 2rem)); box-sizing: border-box; font-family: inherit; }
    .rec-dialog::backdrop { background: rgba(0,0,0,0.35); }
    .rec-dialog h3 { font-size: 1rem; font-weight: 700; margin: 0 0 1rem; }
    .rec-time { font-size: 2rem; font-variant-numeric: tabular-nums; text-align: center; margin: 0.5rem 0 0.25rem; }
    .rec-limit { font-size: 0.75rem; color: #9a9a94; text-align: center; margin-bottom: 1rem; }
    .rec-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #c0392b; margin-right: 0.5rem; vertical-align: middle; animation: rec-blink 1s infinite; }
    @keyframes rec-blink { 50% { opacity: 0.2; } }
    .rec-dialog audio { width: 100%; margin: 0.5rem 0 1rem; }
    .rec-msg { font-size: 0.85rem; color: #c00; margin-bottom: 1rem; }
    .rec-buttons { display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap; }
    .rec-buttons button { border: none; border-radius: 999px; padding: 0.55rem 1.1rem; font-weight: 700; font-size: 0.82rem; cursor: pointer; font-family: inherit; }
    .rec-primary { background: #1a1a1a; color: #fff; }
    .rec-stop { background: #c0392b; color: #fff; }
    .rec-secondary { background: #f1ede5; color: #1a1a1a; }
  `;
  document.head.appendChild(css);
}

export function recordAudio(): Promise<File | null> {
  const t = labels();
  addStyles();
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'rec-dialog';
    document.body.appendChild(dialog);
    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let timer: number | undefined;
    let result: File | null = null;
    let previewUrl: string | null = null;

    const finish = (file: File | null) => {
      clearInterval(timer);
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      stream?.getTracks().forEach((tr) => tr.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      dialog.close();
      dialog.remove();
      resolve(file);
    };
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      finish(null);
    });

    const render = (html: string) => {
      dialog.innerHTML = `<h3>${t.title ?? ''}</h3>${html}`;
      dialog.querySelector('[data-cancel]')?.addEventListener('click', () => finish(null));
    };

    const showIdle = (message = '') => {
      render(`
        ${message ? `<p class="rec-msg">${message}</p>` : ''}
        <div class="rec-time">0:00</div>
        <div class="rec-limit">${t.limit ?? ''}</div>
        <div class="rec-buttons">
          <button type="button" class="rec-secondary" data-cancel>${t.cancel ?? ''}</button>
          <button type="button" class="rec-primary" data-start>${t.start ?? ''}</button>
        </div>`);
      dialog.querySelector('[data-start]')!.addEventListener('click', start);
    };

    const showPreview = (file: File) => {
      result = file;
      previewUrl = URL.createObjectURL(file);
      render(`
        <audio controls src="${previewUrl}"></audio>
        <div class="rec-buttons">
          <button type="button" class="rec-secondary" data-cancel>${t.cancel ?? ''}</button>
          <button type="button" class="rec-secondary" data-again>${t.again ?? ''}</button>
          <button type="button" class="rec-primary" data-use>${t.use ?? ''}</button>
        </div>`);
      dialog.querySelector('[data-again]')!.addEventListener('click', () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = null;
        result = null;
        start();
      });
      dialog.querySelector('[data-use]')!.addEventListener('click', () => finish(result));
    };

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return showIdle(t.unsupported);
      try {
        stream ??= await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      } catch {
        return showIdle(t.denied);
      }
      const [mime, ext] = FORMATS.find(([m]) => MediaRecorder.isTypeSupported(m)) ?? ['', 'weba'];
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 96000 } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        clearInterval(timer);
        const type = recorder!.mimeType || mime || 'audio/webm';
        const now = new Date();
        const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
        showPreview(new File(chunks, `${t.fileName ?? 'Recording'} ${stamp}.${ext}`, { type: type.split(';')[0] }));
      };
      render(`
        <div class="rec-time"><span class="rec-dot"></span><span data-time>0:00</span></div>
        <div class="rec-limit">${t.limit ?? ''}</div>
        <div class="rec-buttons">
          <button type="button" class="rec-secondary" data-cancel>${t.cancel ?? ''}</button>
          <button type="button" class="rec-stop" data-stop>${t.stop ?? ''}</button>
        </div>`);
      const timeEl = dialog.querySelector<HTMLElement>('[data-time]')!;
      const started = Date.now();
      timer = window.setInterval(() => {
        const secs = (Date.now() - started) / 1000;
        timeEl.textContent = mmss(secs);
        if (secs >= MAX_RECORDING_SECONDS) recorder?.stop();
      }, 250);
      dialog.querySelector('[data-stop]')!.addEventListener('click', () => recorder?.stop());
      recorder.start(1000);
    }

    showIdle();
    dialog.showModal();
  });
}
