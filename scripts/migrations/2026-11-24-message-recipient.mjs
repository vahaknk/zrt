// Directus: `submissions.recipient` — the facilitator a participant wrote to
// (a message started from the ✉ next to a facilitator's name). Empty for work
// sent to the whole group and for messages a facilitator started.
// Run ONCE, before deploying the site code that reads it (every conversation
// query requests it — without it, inboxes and threads break):
//   cd ~/astro-projects/zrt && node scripts/migrations/2026-11-24-message-recipient.mjs
// Safe to re-run: existing fields/relations are skipped.
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n')
    .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/))
    .filter(Boolean).map((m) => [m[1], m[2]])
);

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

await field('submissions', {
  field: 'recipient', type: 'integer', schema: { is_nullable: true },
  meta: {
    interface: 'select-dropdown-m2o', readonly: true, width: 'half', display: 'related-values',
    display_options: { template: '{{full_name}}' },
    note: 'The facilitator a participant wrote to (empty: work sent to the whole group, or a message a facilitator started)',
  },
});
await relation('submissions', 'recipient', 'platform_members', 'SET NULL');
