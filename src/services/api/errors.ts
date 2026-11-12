import axios from 'axios';

/** Stable `code` values of the API's ProblemDetails (RFC 9457), see frontend-guide.md. */
export const API_ERROR_CODES = {
  validationFailed: 'VALIDATION_FAILED',
  unauthenticated: 'UNAUTHENTICATED',
  passwordChangeRequired: 'PASSWORD_CHANGE_REQUIRED',
  /** TL-N3: the user's assignment letter is not approved yet → send them to the assignment screen. */
  assignmentApprovalRequired: 'ASSIGNMENT_APPROVAL_REQUIRED',
  forbidden: 'FORBIDDEN',
  notFound: 'NOT_FOUND',
  concurrencyConflict: 'CONCURRENCY_CONFLICT',
  invalidStateTransition: 'INVALID_STATE_TRANSITION',
  confirmationRequired: 'CONFIRMATION_REQUIRED',
  recordInUse: 'RECORD_IN_USE',
  businessRuleViolated: 'BUSINESS_RULE_VIOLATED',
  /** TL-N7: the site cannot take everyone being placed in it; the body lists `suggestions`. */
  siteCapacityExceeded: 'SITE_CAPACITY_EXCEEDED',
  /** TL-N9: a user cannot change their own permissions. */
  selfPrivilegeChange: 'SELF_PRIVILEGE_CHANGE',
  /** TL-N9: granting (or lifting a denial of) a permission the editor does not hold. */
  permissionNotHeld: 'PERMISSION_NOT_HELD',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/**
 * A site proposed by a `SITE_CAPACITY_EXCEEDED` rejection (TL-N7). `shortage` is the number of workers
 * approved staffing requests still lack there, `freePlaces` the room left (`null` = no limit) and
 * `distanceKm` the distance from the requested site (`null` = unknown, e.g. no coordinates).
 */
export interface SiteSuggestion {
  workSiteId: number;
  number: number;
  name: string;
  shortage: number | null;
  freePlaces: number | null;
  distanceKm: number | null;
}

export interface ApiError {
  status?: number;
  title: string;
  detail?: string;
  /** Stable machine-readable code (`CONCURRENCY_CONFLICT`, …) when the API sent one. */
  code?: string;
  /** Request id to quote when reporting a problem (matches the audit log's correlation id). */
  correlationId?: string;
  /** camelCase field name → messages */
  fieldErrors: Record<string, string[]>;
  /** Sites that could take the workers (at most five, possibly none) — only with `SITE_CAPACITY_EXCEEDED`. */
  suggestions?: SiteSuggestion[];
  /** The request was cancelled by the user (AbortController) — not a failure to report. */
  cancelled?: boolean;
}

interface ProblemLike {
  title?: string;
  detail?: string;
  status?: number;
  code?: string;
  correlationId?: string;
  errors?: Record<string, string[]>;
  suggestions?: unknown;
}

/** Text of a Blob body (error responses of file downloads); FileReader where `Blob.text` is missing. */
export function blobText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') return blob.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

/** Reads the stable error code from a ProblemDetails body (already-parsed JSON only). */
export function problemCode(data: unknown): string | undefined {
  return data && typeof data === 'object' && 'code' in data && typeof (data as ProblemLike).code === 'string' ? (data as ProblemLike).code : undefined;
}

const numberOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Reads `suggestions` of a capacity rejection, dropping anything that is not a well-formed site. */
export function parseSuggestions(value: unknown): SiteSuggestion[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const sites = value.flatMap((raw): SiteSuggestion[] => {
    if (!raw || typeof raw !== 'object') return [];
    const r = raw as Record<string, unknown>;
    const workSiteId = numberOrNull(r.workSiteId);
    if (workSiteId === null) return [];
    return [
      {
        workSiteId,
        number: numberOrNull(r.number) ?? workSiteId,
        name: typeof r.name === 'string' ? r.name : '',
        shortage: numberOrNull(r.shortage),
        freePlaces: numberOrNull(r.freePlaces),
        distanceKm: numberOrNull(r.distanceKm),
      },
    ];
  });
  return sites;
}

const camel = (key: string) =>
  key
    .split('.')
    .map((part) => (part ? part[0].toLowerCase() + part.slice(1) : part))
    .join('.');

export async function toApiError(error: unknown, fallback: string): Promise<ApiError> {
  if (axios.isCancel(error)) return { title: fallback, fieldErrors: {}, cancelled: true };
  if (axios.isAxiosError(error)) {
    let data = error.response?.data as ProblemLike | Blob | undefined;
    if (data instanceof Blob) {
      try {
        data = JSON.parse(await blobText(data)) as ProblemLike;
      } catch {
        data = undefined;
      }
    }
    const problem = (data ?? {}) as ProblemLike;
    const fieldErrors: Record<string, string[]> = {};
    Object.entries(problem.errors ?? {}).forEach(([k, v]) => {
      fieldErrors[camel(k)] = v;
    });
    return {
      status: error.response?.status,
      title: problem.title || (error.response ? fallback : error.message || fallback),
      detail: problem.detail,
      code: problem.code,
      correlationId: problem.correlationId,
      fieldErrors,
      suggestions: parseSuggestions(problem.suggestions),
    };
  }
  return { title: error instanceof Error ? error.message : fallback, fieldErrors: {} };
}

/** Synchronous variant for render paths (blob bodies are not parsed). */
export function toApiErrorSync(error: unknown, fallback: string): ApiError {
  if (axios.isAxiosError(error)) {
    const problem = (error.response?.data ?? {}) as ProblemLike;
    const fieldErrors: Record<string, string[]> = {};
    Object.entries(problem.errors ?? {}).forEach(([k, v]) => {
      fieldErrors[camel(k)] = v;
    });
    return {
      status: error.response?.status,
      title: (typeof problem === 'object' && problem.title) || fallback,
      detail: typeof problem === 'object' ? problem.detail : undefined,
      code: typeof problem === 'object' ? problem.code : undefined,
      correlationId: typeof problem === 'object' ? problem.correlationId : undefined,
      fieldErrors,
      suggestions: typeof problem === 'object' ? parseSuggestions(problem.suggestions) : undefined,
    };
  }
  return { title: error instanceof Error ? error.message : fallback, fieldErrors: {} };
}

export function isApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && e !== null && 'fieldErrors' in e && 'title' in e;
}

/**
 * Maps server validation errors (ProblemDetails `errors`, camelCased) onto form fields.
 * `fieldMap` renames API fields to form fields (e.g. `employeeId` → `worker`).
 * Returns the messages that matched no visible field, so the caller can show them in the form alert.
 */
export function applyServerErrors(
  error: ApiError,
  setFieldError: (field: string, message: string) => void,
  fields: readonly string[],
  fieldMap: Record<string, string> = {},
): string[] {
  const unmatched: string[] = [];
  const known = new Set(fields);
  Object.entries(error.fieldErrors).forEach(([apiKey, messages]) => {
    const field = fieldMap[apiKey] ?? apiKey;
    if (known.has(field)) setFieldError(field, messages.join(' '));
    else unmatched.push(...messages);
  });
  return unmatched;
}

export function errorMessage(e: ApiError): string {
  const fields = Object.values(e.fieldErrors).flat();
  return [e.detail || e.title, ...fields.filter((f) => f !== e.detail)].filter(Boolean).join(' — ');
}
