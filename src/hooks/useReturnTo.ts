import { useSearchParams } from 'react-router-dom';

/**
 * Where a create form returns to when it is finished or cancelled: the same-origin path the linking
 * page put in `?returnTo=` (e.g. the worker file), or undefined so the form uses its own default.
 */
export function useReturnTo(): string | undefined {
  const [params] = useSearchParams();
  const value = params.get('returnTo');
  return value && value.startsWith('/') && !value.startsWith('//') ? value : undefined;
}
