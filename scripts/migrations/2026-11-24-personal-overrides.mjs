// Directus: schedule overrides for some participants only — `members` (m2m
// to platform_members) on schedule_overrides. Empty = the whole group, as
// before; filled = only those participants' session is cancelled.
// Run ONCE, before deploying the site code that reads it (the calendar falls
// back to whole-group overrides until it exists):
//   cd ~/astro-projects/zrt && node scripts/migrations/2026-11-24-personal-overrides.mjs
// Safe to re-run: existing collections/fields/relations are skipped.
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
async function relation(def) {
  const exists = await api('GET', `/relations/${def.collection}/${def.field}`).then((r) => !!r?.data, () => false);
  if (exists) return console.log(`= relation ${def.collection}.${def.field} exists`);
  await api('POST', '/relations', def);
  console.log(`+ relation ${def.collection}.${def.field} → ${def.related_collection}`);
}

const JUNCTION = 'schedule_overrides_members';
const junctionExists = await api('GET', `/collections/${JUNCTION}`).then(() => true, () => false);
if (junctionExists) {
  console.log(`= ${JUNCTION} exists`);
} else {
  await api('POST', '/collections', {
    collection: JUNCTION,
    meta: { hidden: true, icon: 'import_export', group: 'platform_people' },
    schema: {},
    fields: [{ field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } }],
  });
  console.log(`+ ${JUNCTION}`);
}
await field(JUNCTION, { field: 'schedule_overrides_id', type: 'integer', schema: { is_nullable: true }, meta: { hidden: true } });
await field(JUNCTION, { field: 'platform_members_id', type: 'integer', schema: { is_nullable: true }, meta: { hidden: true } });

const sort = (await api('GET', '/fields/schedule_overrides/cloud')).data.meta.sort;
await field('schedule_overrides', {
  field: 'members',
  type: 'alias',
  meta: {
    special: ['m2m'],
    interface: 'list-m2m',
    sort: sort + 1,
    width: 'full',
    options: {
      template: '{{platform_members_id.full_name}}',
      enableCreate: false,
      filter: { role: { _eq: 'student' } },
    },
    display: 'related-values',
    display_options: { template: '{{platform_members_id.full_name}}' },
    note: "Leave empty to cancel the session for the whole group. Pick participants to cancel it only for them — the others, and the facilitators, still see it (facilitators see who won't come).",
  },
});

await relation({
  collection: JUNCTION,
  field: 'schedule_overrides_id',
  related_collection: 'schedule_overrides',
  meta: { one_field: 'members', junction_field: 'platform_members_id', sort_field: null, one_deselect_action: 'delete' },
  schema: { on_delete: 'CASCADE' },
});
await relation({
  collection: JUNCTION,
  field: 'platform_members_id',
  related_collection: 'platform_members',
  meta: { one_field: null, junction_field: 'schedule_overrides_id', sort_field: null, one_deselect_action: 'nullify' },
  schema: { on_delete: 'CASCADE' },
});

await api('PATCH', '/collections/schedule_overrides', {
  meta: {
    note: 'Holiday/exception overrides — a workshop/cloud session on this date is cancelled, for the whole group or only for the participants picked in «members», without touching the weekly recurring pattern.',
  },
});
console.log('~ schedule_overrides note');
