import { useState } from 'react';
import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDebounced } from '@/hooks/useDebounced';
import { workersApi } from '@/features/workers/api';
import { useEnumLabel } from '@/hooks/useEnumLabel';
import type { LaborStatus, S } from '@/types/api';

type Item = S<'LaborWorkerListItem'>;

interface Props {
  value: Item | null;
  onChange: (worker: Item | null) => void;
  label?: string;
  required?: boolean;
  error?: string;
  status?: LaborStatus;
  disabled?: boolean;
}

/** Searches workers by number, name or passport (FR-58) within the user's scope. */
export function WorkerPicker({ value, onChange, label, required, error, status, disabled }: Props) {
  const { t } = useTranslation();
  const enumLabel = useEnumLabel();
  const [input, setInput] = useState('');
  const text = useDebounced(input.trim());
  const query = useQuery({
    queryKey: ['workers', 'picker', text, status],
    queryFn: ({ signal }) => workersApi.search({ Text: text, Status: status, Page: 1, PageSize: 20 }, signal),
    enabled: text.length >= 1,
    staleTime: 60_000,
  });

  return (
    <Autocomplete<Item>
      value={value}
      onChange={(_, v) => onChange(v)}
      inputValue={input}
      onInputChange={(_, v) => setInput(v)}
      options={query.data?.items ?? (value ? [value] : [])}
      getOptionLabel={(o) => `${o.employeeNumber} — ${o.name ?? ''}`}
      isOptionEqualToValue={(a, b) => a.employeeId === b.employeeId}
      filterOptions={(x) => x}
      loading={query.isFetching}
      disabled={disabled}
      noOptionsText={text ? t('common.noResults') : t('workers.pickerHint')}
      loadingText={t('common.loading')}
      renderOption={(props, o) => {
        const { key, ...rest } = props as typeof props & { key: string };
        return (
          <Box component="li" key={key} {...rest} sx={{ display: 'block !important' }}>
            <Typography variant="body2" fontWeight={600}>
              {o.employeeNumber} — {o.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {[o.trackName, o.workSiteName, o.jobName, enumLabel('LaborStatus', o.status)].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField {...params} label={label ?? t('common.worker')} required={required} error={!!error} helperText={error ?? t('workers.pickerHint')} />
      )}
    />
  );
}
