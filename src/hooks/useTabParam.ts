import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Page tab kept in the URL (`?tab=`), so a refresh or a shared link opens the same tab and
 * Back/Forward move between tabs. Each tab owns its own list filters, so switching tabs
 * starts from a clean query string; the default tab is not written to the URL.
 */
export function useTabParam<T extends string>(values: readonly T[], fallback: T, key = 'tab') {
  const [sp, setSp] = useSearchParams();
  const raw = sp.get(key);
  const tab = raw !== null && (values as readonly string[]).includes(raw) ? (raw as T) : fallback;
  const setTab = useCallback(
    (next: T) => {
      if (next === tab) return;
      setSp(next === fallback ? {} : { [key]: next });
    },
    [tab, fallback, key, setSp],
  );
  return [tab, setTab] as const;
}
