import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { FileProblem } from '@/utils/files';

/** Localised message for a rejected file (shared by the picker and the form schema). */
export function useFileProblemText() {
  const { t } = useTranslation();
  return useCallback(
    (p: FileProblem) => (p.code === 'size' ? t('files.tooLarge', { max: p.maxMb }) : p.code === 'type' ? t('files.wrongType') : t('files.empty')),
    [t],
  );
}
