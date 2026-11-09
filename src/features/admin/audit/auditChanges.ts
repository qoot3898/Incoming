/** One changed field of an audited entity: `old` for deletions, `new` for creations, both for updates. */
export interface AuditFieldChange {
  field: string;
  old?: unknown;
  new?: unknown;
}

export interface AuditEntityChange {
  entity: string;
  id: string;
  operation: string;
  fields: AuditFieldChange[];
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const hasOldNew = (v: unknown): v is { old?: unknown; new?: unknown } => isRecord(v) && ('old' in v || 'new' in v) && Object.keys(v).every((k) => k === 'old' || k === 'new');

/**
 * Normalises the audit `changes` value (`[{ entity, id, operation, values }]`, values `{ old, new }`
 * per field for updates). Accepts the JSON as a string too; anything unrecognised yields `[]`.
 */
export function parseAuditChanges(value: unknown): AuditEntityChange[] {
  let data = value;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return [];
    }
  }
  if (isRecord(data) && 'changes' in data) data = data.changes;
  if (!Array.isArray(data)) return [];
  return data.filter(isRecord).map((c) => {
    const operation = String(c.operation ?? c.Operation ?? '');
    const values = (c.values ?? c.Values) as unknown;
    const fields: AuditFieldChange[] = isRecord(values)
      ? Object.entries(values).map(([field, v]) => {
          if (hasOldNew(v)) return { field, old: v.old, new: v.new };
          return operation === 'Deleted' ? { field, old: v } : { field, new: v };
        })
      : [];
    return { entity: String(c.entity ?? c.Entity ?? ''), id: String(c.id ?? c.Id ?? ''), operation, fields };
  });
}

/** Display text of a stored value (dates and numbers as the API wrote them). */
export function auditValueText(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
