#!/usr/bin/env node
// Check a root pack and turn it into SQL you paste into the Supabase SQL editor.
//
//   node tools/pack-tool.mjs <path-to-website-repo> <pack-id> <pack.json> [out.sql]
//
// <pack-id> is one of: core-forest, deep-forest, scholar-grove (or any id in the packs table).
// The pack.json file stays on your computer and OUT of the public GitHub repo.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [site, packId, file, out] = process.argv.slice(2);
if (!site || !packId || !file) {
  console.error('usage: node tools/pack-tool.mjs <website-repo> <pack-id> <pack.json> [out.sql]');
  process.exit(2);
}
if (!/^[a-z0-9-]{2,40}$/.test(packId)) {
  console.error('pack id must be lowercase letters, numbers and dashes');
  process.exit(2);
}

// Uses the very same checks the app runs, so a pack that passes here will load in the app.
const { validatePack } = await import(pathToFileURL(path.resolve(site, 'src/cloud/packs.js')).href + '?v=1');
const { ROOTS } = await import(pathToFileURL(path.resolve(site, 'src/data/roots.js')).href);

const content = JSON.parse(fs.readFileSync(file, 'utf8'));
let checked;
try {
  checked = validatePack(content);
} catch (e) {
  console.error('PACK PROBLEM:', e.message);
  process.exit(1);
}

const problems = [];
const seen = new Set(ROOTS.map((r) => r.id));
for (const r of checked.roots) {
  if (seen.has(r.id)) problems.push(`root id "${r.id}" already exists (in the free grove or earlier in this pack)`);
  seen.add(r.id);
}
if (!checked.roots.length) problems.push('the pack has no roots');
if (problems.length) {
  console.error('PACK PROBLEMS:\n - ' + problems.join('\n - '));
  process.exit(1);
}

const preview = checked.roots.slice(0, 8).map((r) => r.displayRoot);
const json = JSON.stringify(content);
if (json.includes('$pack$')) {
  console.error('pack text contains the sequence $pack$, which would break the SQL; remove it');
  process.exit(1);
}
const sql = `-- Publish pack "${packId}": ${checked.roots.length} roots, ${Object.keys(checked.words).length} words
-- Paste into Supabase > SQL Editor and run. Safe to run again to publish an updated version.
begin;
insert into public.pack_content (pack_id, content)
values ('${packId}', $pack$${json}$pack$::jsonb)
on conflict (pack_id) do update set content = excluded.content;

update public.packs
set root_count = ${checked.roots.length},
    preview = '${JSON.stringify(preview).replace(/'/g, "''")}'::jsonb,
    version = version + 1,
    published = true
where id = '${packId}';
commit;
`;
const dest = out || `publish-${packId}.sql`;
fs.writeFileSync(dest, sql);
console.log(`OK: ${checked.roots.length} roots, ${Object.keys(checked.words).length} words. Wrote ${dest} (${Math.round(sql.length / 1024)} KB).`);
console.log('Next: open it, copy everything, paste into Supabase > SQL Editor > Run.');
