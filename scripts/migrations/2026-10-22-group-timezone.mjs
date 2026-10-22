// Directus: a `timezone` per workshop and cloud — the clock its schedule's
// days and times are set in (default Paris), so a group run from elsewhere
// keeps its own local time through DST changes.
// Run ONCE, before deploying the site code that reads it (the site requests
// these fields on every page — without them, login breaks):
//   cd ~/astro-projects/zrt && node scripts/migrations/2026-10-22-group-timezone.mjs
// Safe to re-run: existing fields are skipped.
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

// Same zone list as the members' timezone dropdown.
const memberTz = await api('GET', '/fields/platform_members/timezone');
const choices = memberTz.data.meta.options.choices;

for (const [collection, after] of [['workshops', 'schedule'], ['clouds', 'end_time']]) {
  const sort = (await api('GET', `/fields/${collection}/${after}`)).data.meta.sort;
  await field(collection, {
    field: 'timezone', type: 'string',
    schema: { default_value: 'Europe/Paris', is_nullable: false },
    meta: {
      interface: 'select-dropdown', width: 'half', sort: sort + 1, options: { choices },
      note: "The clock this group's days and times are set in. Paris unless changed — each member still sees the times in their own timezone.",
    },
  });
}
