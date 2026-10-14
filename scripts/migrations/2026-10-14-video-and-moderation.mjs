// Directus schema for the media worker, upload moderation, text materials,
// conversations, and the «Բարեւ» / «Լրատու» collections + publish flow.
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
    { text: 'Message from a facilitator', value: 'message' },
    { text: 'New Բարեւ video', value: 'parev' }, { text: 'News', value: 'news' },
    { text: 'Text to review', value: 'material_review' }, { text: 'Text approved', value: 'material_approved' }, { text: 'Text rejected', value: 'material_rejected' },
  ] } },
});
console.log('~ platform_notifications.kind choices');

// --- text materials (reviewed like files) + who created a material
await field('materials', { field: 'text', type: 'text', schema: { is_nullable: true }, meta: { interface: 'input-multiline', width: 'full', note: 'A written material (instead of a link or file)' } });
await field('materials', {
  field: 'author', type: 'integer', schema: { is_nullable: true },
  meta: { interface: 'select-dropdown-m2o', readonly: true, width: 'half', display: 'related-values', display_options: { template: '{{full_name}}' }, note: 'Facilitator who added it on the platform' },
});
await relation('materials', 'author', 'platform_members', 'SET NULL');
await field('materials', {
  field: 'review_status', type: 'string', schema: { is_nullable: true },
  meta: {
    interface: 'select-dropdown', readonly: true, width: 'half', display: 'labels',
    note: 'Text materials: participants see them only when approved (empty = counts as approved)',
    options: { choices: [{ text: 'Waiting for review', value: 'pending' }, { text: 'Approved', value: 'approved' }, { text: 'Rejected', value: 'rejected' }] },
  },
});
await field('materials', { field: 'review_note', type: 'text', schema: { is_nullable: true }, meta: { interface: 'input-multiline', readonly: true, width: 'full' } });
await field('materials', { field: 'reviewed_at', type: 'timestamp', schema: { is_nullable: true }, meta: { readonly: true, width: 'half' } });
await field('materials', {
  field: 'reviewed_by', type: 'integer', schema: { is_nullable: true },
  meta: { interface: 'select-dropdown-m2o', readonly: true, width: 'half', display: 'related-values', display_options: { template: '{{full_name}}' } },
});
await relation('materials', 'reviewed_by', 'platform_members', 'SET NULL');

// --- conversations a facilitator starts with one participant
await field('submissions', {
  field: 'participant', type: 'integer', schema: { is_nullable: true },
  meta: { interface: 'select-dropdown-m2o', readonly: true, width: 'half', display: 'related-values', display_options: { template: '{{full_name}}' }, note: 'The participant this conversation is with (the author, unless a facilitator started it)' },
});
await relation('submissions', 'participant', 'platform_members', 'SET NULL');
const noParticipant = (await api('GET', '/items/submissions?filter[participant][_null]=true&fields=id,author&limit=-1')).data ?? [];
for (const s of noParticipant) if (s.author) await api('PATCH', `/items/submissions/${s.id}`, { participant: s.author });
console.log(`~ submissions.participant filled for ${noParticipant.length} existing conversation(s)`);

// --- «Բարեւ» videos and «Լրատու» news, written in Directus
async function collection(name, meta, fields) {
  const exists = await api('GET', `/collections/${name}`).then(() => true, () => false);
  if (exists) return console.log(`= collection ${name} exists`);
  await api('POST', '/collections', { collection: name, schema: {}, meta, fields });
  console.log(`+ collection ${name}`);
}
const pk = { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true, readonly: true } };
const statusField = {
  field: 'status', type: 'string', schema: { default_value: 'draft', is_nullable: false },
  meta: {
    interface: 'select-dropdown', width: 'half', display: 'labels',
    options: { choices: [{ text: 'Draft', value: 'draft' }, { text: 'Published', value: 'published' }] },
    display_options: { choices: [{ text: 'Draft', value: 'draft', foreground: '#555555', background: '#ebe7df' }, { text: 'Published', value: 'published', foreground: '#ffffff', background: '#2e9e4f' }] },
    note: 'Publishing notifies everyone it is for (once)',
  },
};
const created = { field: 'date_created', type: 'timestamp', schema: {}, meta: { special: ['date-created'], readonly: true, width: 'half' } };
const fileField = (name, note, sort) => ({ field: name, type: 'uuid', schema: { is_nullable: true }, meta: { interface: 'file', width: 'half', sort, note, special: ['file'] } });
await collection('parev_videos', {
  icon: 'waving_hand', note: '«Բարեւ» page videos, for everyone. Set to Published to show them and notify everyone.',
  translations: [{ language: 'en-US', translation: 'Բարեւ videos' }], display_template: '{{title}}', sort_field: null,
}, [
  pk,
  { field: 'title', type: 'string', schema: { is_nullable: false }, meta: { interface: 'input', required: true, width: 'full', sort: 1 } },
  { field: 'description', type: 'text', schema: { is_nullable: true }, meta: { interface: 'input-multiline', width: 'full', sort: 2 } },
  statusField,
  created,
  hidden('notified_at', 'timestamp', 'When everyone was notified'),
  hidden('platform_file', 'uuid', 'The compressed copy the platform plays'),
]);
await field('parev_videos', fileField('video', 'The video (any phone/camera format; it is compressed for the platform)', 3));
await relation('parev_videos', 'video', 'directus_files', 'SET NULL');
await relation('parev_videos', 'platform_file', 'platform_files', 'SET NULL');
await collection('news', {
  icon: 'campaign', note: '«Լրատու» posts. Set to Published to show them and notify their audience.',
  translations: [{ language: 'en-US', translation: 'Լրատու' }], display_template: '{{title}}',
}, [
  pk,
  { field: 'title', type: 'string', schema: { is_nullable: false }, meta: { interface: 'input', required: true, width: 'full', sort: 1 } },
  { field: 'body', type: 'text', schema: { is_nullable: true }, meta: { interface: 'input-multiline', width: 'full', sort: 2 } },
  {
    field: 'audience', type: 'string', schema: { default_value: 'all', is_nullable: false },
    meta: {
      interface: 'select-dropdown', width: 'half', sort: 5,
      options: { choices: [
        { text: 'Everyone', value: 'all' }, { text: 'Participants', value: 'students' },
        { text: 'Facilitators', value: 'facilitators' }, { text: 'One workshop/cloud', value: 'group' },
      ] },
      note: 'For “One workshop/cloud”, choose it below',
    },
  },
  statusField,
  created,
  hidden('notified_at', 'timestamp', 'When the audience was notified'),
]);
await field('news', fileField('image', 'Optional picture', 3));
await field('news', fileField('attachment', 'Optional file to download', 4));
await relation('news', 'image', 'directus_files', 'SET NULL');
await relation('news', 'attachment', 'directus_files', 'SET NULL');
for (const [f, rel] of [['workshop', 'workshops'], ['cloud', 'clouds']]) {
  await field('news', { field: f, type: 'integer', schema: { is_nullable: true }, meta: { interface: 'select-dropdown-m2o', width: 'half', sort: 6, display: 'related-values', display_options: { template: '{{name}}' }, options: { template: '{{name}}' } } });
  await relation('news', f, rel, 'SET NULL');
}
for (const [f, rel] of [['parev_video', 'parev_videos'], ['news', 'news']]) {
  await field('platform_notifications', { field: f, type: 'integer', schema: { is_nullable: true }, meta: { interface: 'select-dropdown-m2o', readonly: true, width: 'half' } });
  await relation('platform_notifications', f, rel, 'CASCADE');
}
// Tells the site when a video/post is saved (it publishes + notifies once).
const flows = (await api('GET', `/flows?filter[name][_eq]=${encodeURIComponent('Platform: publish Բարեւ / Լրատու')}&fields=id`)).data ?? [];
if (flows.length) console.log('= flow Platform: publish exists');
else {
  const secret = env.ZARDIPUM_HOOK_SECRET || readFileSync(`${process.env.HOME}/.config/zardipum-hook-secret`, 'utf8').trim();
  const flow = (await api('POST', '/flows', {
    name: 'Platform: publish Բարեւ / Լրատու', icon: 'campaign', status: 'active', trigger: 'event', accountability: 'all',
    options: { type: 'action', scope: ['items.create', 'items.update'], collections: ['parev_videos', 'news'] },
  })).data;
  const op = (await api('POST', '/operations', {
    flow: flow.id, key: 'call_publish_hook', name: 'call_publish_hook', type: 'request', position_x: 19, position_y: 1,
    options: { method: 'POST', url: `${env.SITE_URL || 'https://zartsants.com'}/api/platform/publish-hook`,
      headers: [{ header: 'x-zardipum-secret', value: secret }, { header: 'Content-Type', value: 'application/json' }], body: '{{$trigger}}' },
  })).data;
  await api('PATCH', `/flows/${flow.id}`, { operation: op.id });
  console.log('+ flow Platform: publish');
}

await api('PATCH', `/items/platform_members/${SARIN_MEMBER_ID}`, { moderator: true });
console.log(`~ member ${SARIN_MEMBER_ID} (Sarin) is moderator`);
console.log('done');
