import { useState } from 'react';
import { Autocomplete, MenuItem, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { candidateLabel, useAvailableCandidates, type PoolCandidate } from './candidateSearch';
import type { Option } from '@/components/forms/FormDialog';

interface Props {
  value: PoolCandidate[];
  onChange: (candidates: PoolCandidate[]) => void;
  label: string;
  /** Jobs the list can be narrowed to; the choice "all jobs" is always offered. */
  jobOptions: Option[];
  /** The job the list starts narrowed to (the request's job); `null` starts with all jobs. */
  initialJobId?: number | null;
  error?: string;
  helperText?: string;
  disabled?: boolean;
}

/**
 * Picks several available candidates from the candidate list (TL-N13). A job filter narrows the search to the
 * candidates recorded for that job; it starts on the request's job when there is one and can be set to all jobs.
 * Candidates already chosen stay chosen when the filter changes. When the request's job changes, mount the
 * picker again with `key` so the filter follows it.
 */
export function CandidatePoolPicker({ value, onChange, label, jobOptions, initialJobId, error, helperText, disabled }: Props) {
  const { t } = useTranslation();
  const [job, setJob] = useState(initialJobId ? String(initialJobId) : '');
  const search = useAvailableCandidates(job ? Number(job) : undefined);

  return (
    <Stack spacing={1.5}>
      <TextField select size="small" label={t('candidates.candidateJob')} value={job} onChange={(e) => setJob(e.target.value)} disabled={disabled} sx={{ maxWidth: 360 }}>
        {[{ value: '', label: t('candidates.pickerAllJobs') }, ...jobOptions].map((o) => (
          <MenuItem key={String(o.value)} value={String(o.value)}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>
      <Autocomplete<PoolCandidate, true>
        multiple
        value={value}
        onChange={(_, v) => onChange(v)}
        inputValue={search.input}
        onInputChange={(_, v, reason) => {
          if (reason !== 'reset') search.setInput(v);
        }}
        options={search.items}
        getOptionLabel={candidateLabel}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        // The server already searched; only hide the candidates that are chosen.
        filterOptions={(options) => options.filter((o) => !value.some((v) => v.id === o.id))}
        disableCloseOnSelect
        loading={search.loading}
        disabled={disabled}
        noOptionsText={t('candidates.pickerNoResults')}
        loadingText={t('common.loading')}
        renderInput={(params) => <TextField {...params} label={label} error={!!error} helperText={error ?? helperText ?? t('candidates.pickerHint')} />}
      />
    </Stack>
  );
}
