# Video worker

Compresses videos uploaded on the platform. The site marks a finished video
upload `processing` (`src/pages/api/platform/files/[id]/complete.ts`); this
worker polls Directus every 20 s, converts the video to 720p H.264/AAC MP4
(`+faststart`, portrait kept, never upscaled), stores a 480 px WebP poster as
the file's `thumb_key`, swaps `storage_key`/`filename`/`mime`/`size` to the
new file, sets `ready`, and deletes the original. Unreadable files become
`failed`; a compression error keeps the original (`ready`) and records
`processing_error`.

## Deploying (Railway, project zonal-learning)

1. Directus → `platform_files`: add `processing_started_at` (timestamp) and
   `processing_error` (text), both hidden/read-only.
2. New service `video-worker` from the `vahaknk/zrt` repo, **root directory
   `workers/video`** (it has its own Dockerfile). No public domain needed.
3. Variables (Railway references, nothing copied):
   - `DIRECTUS_URL=${{zrt.DIRECTUS_URL}}`
   - `DIRECTUS_TOKEN=${{zrt.DIRECTUS_TOKEN}}`
   - `PLATFORM_S3_ENDPOINT=${{Directus.STORAGE_S3_ENDPOINT}}` (likewise `_REGION`, `_BUCKET`, `_KEY`, `_SECRET`)
4. Deploy the worker before (or together with) the site change, so videos
   marked `processing` get picked up.

## Testing locally

`docker build -t zrt-video-worker .` and run it with the env above pointing at
a local S3 (e.g. adobe/s3mock) and a stand-in for Directus.
