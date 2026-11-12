import { Autocomplete, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { WorkerOption } from './WorkerOption';
import { useWorkerSearch, workerLabel, type WorkerItem } from './useWorkerSearch';
import type { LaborStatus } from '@/types/api';

interface Props {
  value: WorkerItem[];
  onChange: (workers: WorkerItem[]) => void;
  label: string;
  required?: boolean;
  error?: string;
  /** Shown under the field while there is no error (e.g. "2 of 3 chosen"). */
  helperText?: string;
  /** Once this many are chosen the remaining options are disabled (the request's count). */
  max?: number;
  status?: LaborStatus;
  disabled?: boolean;
}

/** Picks several distinct workers (TL-N8: one leaving worker per requested place). */
export function WorkersMultiPicker({ value, onChange, label, required, error, helperText, max, status, disabled }: Props) {
  const { t } = useTranslation();
  const search = useWorkerSearch(status);
  const full = max !== undefined && value.length >= max;

  return (
    <Autocomplete<WorkerItem, true>
      multiple
      value={value}
      onChange={(_, v) => onChange(v)}
      inputValue={search.input}
      onInputChange={(_, v, reason) => {
        if (reason !== 'reset') search.setInput(v);
      }}
      options={search.items}
      getOptionLabel={workerLabel}
      getOptionDisabled={() => full}
      isOptionEqualToValue={(a, b) => a.employeeId === b.employeeId}
      filterOptions={(options) => options.filter((o) => !value.some((v) => v.employeeId === o.employeeId))}
      filterSelectedOptions
      disableCloseOnSelect
      loading={search.loading}
      disabled={disabled}
      noOptionsText={search.text ? t('common.noResults') : t('workers.pickerHint')}
      loadingText={t('common.loading')}
      renderOption={(props, o) => <WorkerOption worker={o} optionProps={props as typeof props & { key: string }} />}
      renderInput={(params) => (
        <TextField {...params} label={label} required={required && value.length === 0} error={!!error} helperText={error ?? helperText ?? t('workers.pickerHint')} />
      )}
    />
  );
}
