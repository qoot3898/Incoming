import { Autocomplete, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { WorkerOption } from './WorkerOption';
import { useWorkerSearch, workerLabel, type WorkerItem } from './useWorkerSearch';
import type { LaborStatus } from '@/types/api';

interface Props {
  value: WorkerItem | null;
  onChange: (worker: WorkerItem | null) => void;
  label?: string;
  required?: boolean;
  error?: string;
  status?: LaborStatus;
  disabled?: boolean;
}

/** Searches workers by number, name or passport (FR-58) within the user's scope. */
export function WorkerPicker({ value, onChange, label, required, error, status, disabled }: Props) {
  const { t } = useTranslation();
  const search = useWorkerSearch(status);

  return (
    <Autocomplete<WorkerItem>
      value={value}
      onChange={(_, v) => onChange(v)}
      inputValue={search.input}
      onInputChange={(_, v) => search.setInput(v)}
      options={search.items.length ? search.items : value ? [value] : []}
      getOptionLabel={workerLabel}
      isOptionEqualToValue={(a, b) => a.employeeId === b.employeeId}
      filterOptions={(x) => x}
      loading={search.loading}
      disabled={disabled}
      noOptionsText={search.text ? t('common.noResults') : t('workers.pickerHint')}
      loadingText={t('common.loading')}
      renderOption={(props, o) => <WorkerOption worker={o} optionProps={props as typeof props & { key: string }} />}
      renderInput={(params) => (
        <TextField {...params} label={label ?? t('common.worker')} required={required} error={!!error} helperText={error ?? t('workers.pickerHint')} />
      )}
    />
  );
}
