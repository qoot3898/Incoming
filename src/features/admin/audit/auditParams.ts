import { splitMulti } from '@/components/tables/filters';
import { ENUMS } from '@/constants/enums';
import type { Q } from '@/types/api';

/** URL filters of the audit page (defaults are left out of the URL). */
export const AUDIT_DEFAULTS = {
  Search: '',
  ActorUserId: '',
  ActionCodes: '',
  Module: '',
  EntityType: '',
  EntityId: '',
  Outcome: '',
  IpAddress: '',
  CorrelationId: '',
  From: '',
  FromTime: '',
  To: '',
  ToTime: '',
  Sort: '',
  IncludeChanges: false,
};
export type AuditFilters = typeof AUDIT_DEFAULTS;

export const AUDIT_SORTS = ENUMS.AuditSort.filter((v) => v !== 'Newest');

/**
 * URL filters → API query. Multi-values become repeated params; an hour is sent only with its day (the API requires
 * `From` with `FromTime` and `To` with `ToTime`); the default order and an unchecked switch are left out.
 */
export function searchParams(p: Partial<AuditFilters> & { Page?: number; PageSize?: number }): Q<'SearchAudit'> {
  const { ActionCodes, IncludeChanges, FromTime, ToTime, Sort, ...rest } = p;
  return {
    ...rest,
    ActionCodes: splitMulti(ActionCodes),
    FromTime: rest.From && FromTime ? FromTime : undefined,
    ToTime: rest.To && ToTime ? ToTime : undefined,
    Sort: (Sort || undefined) as Q<'SearchAudit'>['Sort'],
    IncludeChanges: IncludeChanges || undefined,
  } as unknown as Q<'SearchAudit'>;
}

/** The export takes the same filters as the search, without paging and without the changes switch. */
export function exportParams(p: Partial<AuditFilters> & { Page?: number; PageSize?: number }): Q<'ExportAudit'> {
  const q: Record<string, unknown> = { ...searchParams(p) };
  delete q.Page;
  delete q.PageSize;
  delete q.IncludeChanges;
  return q as Q<'ExportAudit'>;
}

