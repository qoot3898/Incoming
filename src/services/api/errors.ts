import axios from 'axios';

export interface ApiError {
  status?: number;
  title: string;
  detail?: string;
  /** camelCase field name → messages */
  fieldErrors: Record<string, string[]>;
}

interface ProblemLike {
  title?: string;
  detail?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

const camel = (key: string) =>
  key
    .split('.')
    .map((part) => (part ? part[0].toLowerCase() + part.slice(1) : part))
    .join('.');

export async function toApiError(error: unknown, fallback: string): Promise<ApiError> {
  if (axios.isAxiosError(error)) {
    let data = error.response?.data as ProblemLike | Blob | undefined;
    if (data instanceof Blob) {
      try {
        data = JSON.parse(await data.text()) as ProblemLike;
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
      fieldErrors,
    };
  }
  return { title: error instanceof Error ? error.message : fallback, fieldErrors: {} };
}

export function errorMessage(e: ApiError): string {
  const fields = Object.values(e.fieldErrors).flat();
  return [e.detail || e.title, ...fields.filter((f) => f !== e.detail)].filter(Boolean).join(' — ');
}
