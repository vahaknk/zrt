// Browser side of platform uploads: asks the server for presigned part URLs,
// PUTs the parts straight to the bucket (3 at a time, each retried), then
// asks the server to finish. Used by the Փեթակ page (and later submissions).

export class UploadError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

function putPart(url: string, blob: Blob, onBytes: (n: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    let last = 0;
    xhr.upload.onprogress = (e) => {
      onBytes(e.loaded - last);
      last = e.loaded;
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`part ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('network'));
    xhr.send(blob);
  });
}

export async function uploadFile(file: File, onProgress: (fraction: number) => void): Promise<string> {
  const start = await fetch('/api/platform/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, size: file.size, mime: file.type }),
  });
  const info = await start.json().catch(() => ({}));
  if (!start.ok) throw new UploadError(info.error ?? 'upload_failed');
  const { id, partSize, urls } = info as { id: string; partSize: number; urls: string[] };

  let sent = 0;
  const report = (n: number) => {
    sent += n;
    onProgress(Math.min(1, sent / file.size));
  };

  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const i = next++;
      const blob = file.slice(i * partSize, Math.min(file.size, (i + 1) * partSize));
      for (let attempt = 0; ; attempt++) {
        let partSent = 0;
        try {
          await putPart(urls[i], blob, (n) => {
            partSent += n;
            report(n);
          });
          break;
        } catch (e) {
          report(-partSent); // that part starts over
          if (attempt >= 3) throw e;
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        }
      }
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.min(3, urls.length) }, worker));
  } catch {
    await fetch(`/api/platform/files/${id}`, { method: 'DELETE' }).catch(() => {});
    throw new UploadError('upload_failed');
  }

  const done = await fetch(`/api/platform/files/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!done.ok) throw new UploadError('upload_failed');
  onProgress(1);
  return id;
}
