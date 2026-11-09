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
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

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
