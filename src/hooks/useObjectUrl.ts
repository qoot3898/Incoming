import { useEffect, useState } from 'react';

/**
 * Temporary `blob:` URL for a local file preview. The URL is revoked when the file changes
 * or the component unmounts, so previews never leak memory. (State + effect rather than
 * useMemo: StrictMode re-runs effects, and a memoised URL would be revoked but not recreated.)
 */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}
