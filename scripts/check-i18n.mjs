// Verifies that every static translation key used in src exists in both locale files,
// that both locale files define the same keys (SRS NFR-14), that a key uses the same
// {{placeholders}} in both languages, and that the key families built with a template
// (t(`capacity.states.${state}`)) have entries in both languages.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = 'src';
const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(f) && !f.endsWith('api.generated.ts')) files.push(p);
  }
})(root);

const used = new Set();
const prefixes = new Set();
const re = /\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g;
const templateRe = /\bt\(\s*`([a-zA-Z0-9_.]+\.)\$\{/g;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(re)) used.add(m[1]);
  for (const m of src.matchAll(templateRe)) prefixes.add(m[1]);
}

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

const locales = { ar: JSON.parse(readFileSync('src/i18n/locales/ar.json', 'utf8')), en: JSON.parse(readFileSync('src/i18n/locales/en.json', 'utf8')) };
const keys = Object.fromEntries(Object.entries(locales).map(([l, o]) => [l, new Set(flatten(o))]));
const has = (set, k) => set.has(k) || set.has(`${k}_one`) || set.has(`${k}_other`);

let problems = 0;
for (const [l, set] of Object.entries(keys)) {
  const missing = [...used].filter((k) => !has(set, k));
  if (missing.length) {
    problems += missing.length;
    console.log(`\n[${l}] missing ${missing.length} keys:\n  ${missing.sort().join('\n  ')}`);
  }
}
for (const [l, set] of Object.entries(keys)) {
  const empty = [...prefixes].filter((p) => ![...set].some((k) => k.startsWith(p)));
  if (empty.length) {
    problems += empty.length;
    console.log(`\n[${l}] no keys under: ${empty.sort().join(', ')}`);
  }
}

// Same {{placeholders}} in both languages (a renamed variable in one file prints a raw "{{x}}").
const flat = (obj) => Object.fromEntries(flatten(obj).map((k) => [k, k.split('.').reduce((o, p) => o[p], obj)]));
const text = { ar: flat(locales.ar), en: flat(locales.en) };
const placeholders = (value) => [...new Set([...String(value).matchAll(/\{\{\s*([a-zA-Z0-9_]+)[^}]*\}\}/g)].map((m) => m[1]))].sort().join(',');
const mismatched = [...keys.ar].filter((k) => keys.en.has(k) && placeholders(text.ar[k]) !== placeholders(text.en[k]));
if (mismatched.length) {
  problems += mismatched.length;
  console.log(`\nPlaceholders differ between ar and en:\n  ${mismatched.map((k) => `${k}  ar={${placeholders(text.ar[k])}} en={${placeholders(text.en[k])}}`).join('\n  ')}`);
}

const onlyAr = [...keys.ar].filter((k) => !keys.en.has(k));
const onlyEn = [...keys.en].filter((k) => !keys.ar.has(k));
if (onlyAr.length || onlyEn.length) {
  problems += onlyAr.length + onlyEn.length;
  console.log(`\nOnly in ar: ${onlyAr.join(', ') || '—'}\nOnly in en: ${onlyEn.join(', ') || '—'}`);
}
console.log(problems ? `\n${problems} i18n problem(s).` : `i18n OK — ${used.size} static keys used, ${keys.ar.size} keys per locale.`);
process.exit(problems ? 1 : 0);
