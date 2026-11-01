// Normalises the ASP.NET Core OpenAPI document before type generation:
//  - ["integer","string"] / ["number","string"] (lenient number handling) -> integer / number
//  - untyped properties (nullable strings emitted without `type`) -> string | null
// Properties whose shape is genuinely dynamic are left as `unknown`.
import { readFileSync, writeFileSync } from 'node:fs';

const [, , input = 'openapi/openapi.json', output = 'openapi/openapi.normalized.json'] = process.argv;
const spec = JSON.parse(readFileSync(input, 'utf8'));

const DYNAMIC = new Set([
  'LaborReportRow.cells',
  'AttendanceSaveResult.conflicts',
  'TerminationSettlementInfo.components',
]);

function fixNumber(node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node.type)) {
    const t = node.type.filter((x) => x !== 'string' || !(node.type.includes('integer') || node.type.includes('number')));
    if (t.length !== node.type.length) {
      node.type = t.length === 1 ? t[0] : t;
      delete node.pattern;
    }
  }
}

function isUntyped(p) {
  return p && typeof p === 'object' && !p.type && !p.$ref && !p.allOf && !p.oneOf && !p.anyOf && !p.enum && !p.items && !p.properties;
}

function walk(node, schemaName) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach((n) => walk(n, schemaName));
  fixNumber(node);
  if ((node.type === 'object' || (Array.isArray(node.type) && node.type.includes('object'))) && !node.properties && node.additionalProperties === undefined && !node.allOf) node.additionalProperties = true;
  if (node.in && node.schema && isUntyped(node.schema)) node.schema.type = 'string';
  if (node.properties) {
    for (const [key, prop] of Object.entries(node.properties)) {
      const id = `${schemaName}.${key}`;
      if (!DYNAMIC.has(id)) {
        if (isUntyped(prop)) prop.type = ['string', 'null'];
        if (prop && (prop.type === 'array' || (Array.isArray(prop.type) && prop.type.includes('array'))) && !prop.items) prop.items = { type: 'string' };
        if (prop && prop.type === 'array' && isUntyped(prop.items)) prop.items.type = 'string';
        if (Array.isArray(prop?.type) && prop.type.includes('array') && isUntyped(prop.items)) prop.items.type = 'string';
      }
    }
  }
  for (const v of Object.values(node)) walk(v, schemaName);
}

for (const [name, schema] of Object.entries(spec.components?.schemas ?? {})) walk(schema, name);
walk(spec.paths, 'paths');
writeFileSync(output, JSON.stringify(spec, null, 2));
console.log(`normalized -> ${output}`);
