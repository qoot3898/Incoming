import { useTranslation } from 'react-i18next';
import { RefusalHint } from '@/components/common/RefusalHint';
import { useEnumLabel } from '@/hooks/useEnumLabel';
import type { RefusalGroup } from './refusals';

/**
 * One hint per group of parties refused for the same reason: `Section and HR: <the API's reason>`. A user who
 * represents a single party sees `Party: reason`, as before.
 */
export function RefusalGroups({ groups }: { groups: readonly RefusalGroup[] }) {
  const { i18n } = useTranslation();
  const label = useEnumLabel();
  const names = new Intl.ListFormat(i18n.language, { style: 'long', type: 'conjunction' });
  return (
    <>
      {groups.map((g) => (
        <RefusalHint key={g.text} text={`${names.format(g.parties.map((p) => label('LaborParty', p)))}: ${g.text}`} />
      ))}
    </>
  );
}
