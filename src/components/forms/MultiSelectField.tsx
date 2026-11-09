import { useMemo } from 'react';
import { Autocomplete, Chip, TextField, type SxProps, type Theme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { Option } from './FormDialog';

export type GroupedOption = Option & { group?: string };

interface Props {
  label: string;
  value: string[];
  options: GroupedOption[];
  onChange: (values: string[]) => void;
  sx?: SxProps<Theme>;
  /** Chips shown before "+N" while the field is not focused. */
  limitTags?: number;
}

/**
 * Searchable multi-select (e.g. audit action codes). Options can be grouped (`group`), typing filters
 * them; values unknown to the options (an old link) are kept and shown as their raw value.
 */
export function MultiSelectField({ label, value, options, onChange, sx, limitTags = 2 }: Props) {
  const { t } = useTranslation();
  // Index and group order are rebuilt only when the options change (lists can hold hundreds of actions).
  const { byValue, sorted, grouped } = useMemo(() => {
    const isGrouped = options.some((o) => o.group);
    return {
      byValue: new Map(options.map((o) => [String(o.value), o])),
      // Grouped options must be sorted by group for the group headers to be contiguous.
      sorted: isGrouped ? [...options].sort((a, b) => (a.group ?? '').localeCompare(b.group ?? '')) : options,
      grouped: isGrouped,
    };
  }, [options]);
  const selected = value.map((v) => byValue.get(v) ?? { value: v, label: v });
  return (
    <Autocomplete<GroupedOption, true>
      multiple
      size="small"
      sx={sx}
      limitTags={limitTags}
      options={sorted}
      value={selected}
      groupBy={grouped ? (o) => o.group ?? '' : undefined}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => String(a.value) === String(b.value)}
      onChange={(_, next) => onChange(next.map((o) => String(o.value)))}
      noOptionsText={t('common.noOptions')}
      renderTags={(tags, getTagProps) =>
        tags.map((o, index) => {
          const { key, ...props } = getTagProps({ index });
          return <Chip key={key} size="small" label={o.label} {...props} />;
        })
      }
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
}
