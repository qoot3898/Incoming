import { lazy, Suspense, type ComponentType } from 'react';
import { LoadingState } from '@/components/common/States';

/** Lazily loaded route element with a loading fallback. */
export function lazyPage(factory: () => Promise<{ default: ComponentType }>) {
  const Page = lazy(factory);
  return (
    <Suspense fallback={<LoadingState minHeight={320} />}>
      <Page />
    </Suspense>
  );
}
