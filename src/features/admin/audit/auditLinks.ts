/** Filters of the user-activity screen that other screens can deep-link to (TL-N6). */
export interface AuditLinkParams {
  ActorUserId?: number | string;
  /** Joined into one URL value; the screen sends them as repeated `actionCodes`. */
  ActionCodes?: readonly string[];
  Module?: string;
  EntityType?: string;
  EntityId?: string;
  Outcome?: 'Success' | 'Failure' | 'Denied';
  IpAddress?: string;
  CorrelationId?: string;
  From?: string;
  To?: string;
  Search?: string;
  IncludeChanges?: boolean;
}

/** Separator of the multi-valued `ActionCodes` URL value (action codes never contain it). */
export const ACTION_CODES_SEPARATOR = ',';

/** `/admin/audit?…` for e.g. one user's activity or one record's history. */
export function auditLink(p: AuditLinkParams): string {
  const sp = new URLSearchParams();
  Object.entries(p).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === false) return;
    if (Array.isArray(value)) {
      if (value.length) sp.set(key, value.join(ACTION_CODES_SEPARATOR));
    } else sp.set(key, String(value));
  });
  const qs = sp.toString();
  return qs ? `/admin/audit?${qs}` : '/admin/audit';
}
