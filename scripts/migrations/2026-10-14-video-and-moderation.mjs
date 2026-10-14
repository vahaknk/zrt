// Directus schema for the video worker and upload moderation.
// Run ONCE, before deploying the site/worker code that uses these fields
// (the site requests `moderator` on every page — without it, login breaks):
//   cd ~/astro-projects/zrt && node scripts/migrations/2026-10-14-video-and-moderation.mjs
// Safe to re-run: existing fields/relations are skipped.
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n')
    .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/))
    .filter(Boolean).map((m) => [m[1], m[2]])
);
const SARIN_MEMBER_ID = 7; // sarinakbas — the moderator

async function api(method, path, body) {
  const res = await fetch(`${env.DIRECTUS_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${env.DIRECTUS_TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
async function field(collection, def) {
  const exists = await api('GET', `/fields/${collection}/${def.field}`).then(() => true, () => false);
  if (exists) return console.log(`= ${collection}.${def.field} exists`);
  await api('POST', `/fields/${collection}`, def);
  console.log(`+ ${collection}.${def.field}`);
}
async function relation(collection, fieldName, related, onDelete) {
  const exists = await api('GET', `/relations/${collection}/${fieldName}`).then((r) => !!r?.data, () => false);
  if (exists) return console.log(`= relation ${collection}.${fieldName} exists`);
  await api('POST', '/relations', { collection, field: fieldName, related_collection: related, schema: { on_delete: onDelete } });
  console.log(`+ relation ${collection}.${fieldName} → ${related}`);
}
const hidden = (fieldName, type, note) => ({ field: fieldName, type, schema: { is_nullable: true }, meta: { hidden: true, readonly: true, note } });

// --- video worker
await field('platform_files', hidden('processing_started_at', 'timestamp', 'Set by the video worker while compressing'));
await field('platform_files', hidden('processing_error', 'text', 'Why compression failed (original kept)'));

// --- moderation
await field('platform_members', {
  field: 'moderator', type: 'boolean', schema: { default_value: false, is_nullable: false },
  meta: { interface: 'boolean', width: 'half', note: "Reviews facilitators' uploaded files before participants see them (gets an email per upload)" },
});
await field('platform_files', {
  field: 'review_status', type: 'string', schema: { is_nullable: true },
  meta: {
    interface: 'select-dropdown', width: 'half', readonly: true, display: 'labels',
    note: 'Library files: participants see them only when approved (empty = from before moderation, counts as approved)',
    options: { choices: [{ text: 'Waiting for review', value: 'pending' }, { text: 'Approved', value: 'approved' }, { text: 'Rejected', value: 'rejected' }] },
  },
});
await field('platform_files', { field: 'review_note', type: 'text', schema: { is_nullable: true }, meta: { interface: 'input-multiline', readonly: true, width: 'full' } });
await field('platform_files', { field: 'reviewed_at', type: 'timestamp', schema: { is_nullable: true }, meta: { readonly: true, width: 'half' } });
await field('platform_files', {
  field: 'reviewed_by', type: 'integer', schema: { is_nullable: true },
  meta: { interface: 'select-dropdown-m2o', readonly: true, width: 'half', display: 'related-values', display_options: { template: '{{full_name}}' } },
});
await relation('platform_files', 'reviewed_by', 'platform_members', 'SET NULL');
await field('platform_notifications', {
  field: 'file', type: 'uuid', schema: { is_nullable: true },
  meta: { interface: 'select-dropdown-m2o', readonly: true, width: 'half', display: 'related-values', display_options: { template: '{{filename}}' } },
});
await relation('platform_notifications', 'file', 'platform_files', 'CASCADE');
await api('PATCH', '/fields/platform_notifications/kind', {
  meta: { options: { choices: [
    { text: 'New submission', value: 'submission' }, { text: 'New reply', value: 'reply' },
    { text: 'New material', value: 'material' }, { text: 'Meeting invitation', value: 'meeting' },
    { text: 'File to review', value: 'file_review' }, { text: 'File approved', value: 'file_approved' }, { text: 'File rejected', value: 'file_rejected' },
  ] } },
});
console.log('~ platform_notifications.kind choices');

await api('PATCH', `/items/platform_members/${SARIN_MEMBER_ID}`, { moderator: true });
console.log(`~ member ${SARIN_MEMBER_ID} (Sarin) is moderator`);
console.log('done');
