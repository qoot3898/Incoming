import { Fragment, memo } from 'react';
import { MenuItem, TableCell, TableRow, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { Option } from '@/components/forms/FormDialog';
import { CandidateScanCell } from './CandidateScanCell';
import type { IssueField, RegistrationRow, RowField } from './registrationRow';

export interface RowChoices {
  nationalities: Option[];
  cities: Option[];
  departments: Option[];
  genders: Option[];
  maritalStatuses: Option[];
}

interface Props {
  row: RegistrationRow;
  index: number;
  choices: RowChoices;
  libyan: boolean;
  /** Field → message (client rules and server errors); `_row` for messages about the whole row. */
  errors?: Partial<Record<string, string>>;
  columnCount: number;
  onChange: (index: number, patch: Partial<RegistrationRow>) => void;
}

/**
 * One editable worker row of the registration table. Memoized: typing in a row re-renders only that
 * row (the page passes a stable `onChange`), which keeps 100-worker batches responsive (AC-11).
 */
/** A missing required scan is outlined like an invalid input. */
const scanCellSx = (invalid: boolean) => ({ whiteSpace: 'nowrap' as const, ...(invalid ? { outline: '1px solid', outlineColor: 'error.main', outlineOffset: -4, borderRadius: 1 } : {}) });

export const RegistrationRowEditor = memo(function RegistrationRowEditor({ row: r, index, choices, libyan, errors, columnCount, onChange }: Props) {
  const { t } = useTranslation();
  const set = (patch: Partial<RegistrationRow>) => onChange(index, patch);
  const err = (field: IssueField) => !!errors?.[field];
  const label = (field: RowField) => t(`registration.cols.${field}`);
  const messages = Object.entries(errors ?? {}).filter((e): e is [string, string] => !!e[1]);

  const text = (field: RowField, width: number, extra?: { placeholder?: string; disabled?: boolean; ltr?: boolean }) => (
    <TextField
      size="small"
      value={r[field] as string}
      onChange={(e) => set({ [field]: e.target.value })}
      error={err(field)}
      disabled={extra?.disabled}
      placeholder={extra?.placeholder}
      sx={{ minWidth: width }}
      slotProps={{ htmlInput: { 'aria-label': label(field), dir: extra?.ltr ? 'ltr' : undefined } }}
    />
  );
  const date = (field: RowField) => (
    <TextField
      size="small"
      type="date"
      value={r[field] as string}
      onChange={(e) => set({ [field]: e.target.value })}
      error={err(field)}
      slotProps={{ htmlInput: { 'aria-label': label(field) } }}
    />
  );
  const select = (field: RowField, options: Option[], width: number, allowEmpty = true) => (
    <TextField
      select
      size="small"
      value={r[field] as string}
      onChange={(e) => set({ [field]: e.target.value })}
      error={err(field)}
      sx={{ minWidth: width }}
      slotProps={{ htmlInput: { 'aria-label': label(field) } }}
    >
      {allowEmpty && (
        <MenuItem value="">
          <em>—</em>
        </MenuItem>
      )}
      {options.map((o) => (
        <MenuItem key={String(o.value)} value={String(o.value)}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );

  return (
    <Fragment>
      <TableRow sx={{ '& td': { borderBottom: messages.length ? 0 : undefined, verticalAlign: 'top' } }}>
        <TableCell>{text('name', 180)}</TableCell>
        <TableCell>{select('nationalityId', choices.nationalities, 150, false)}</TableCell>
        <TableCell>{select('gender', choices.genders, 100, false)}</TableCell>
        <TableCell>{select('maritalStatus', choices.maritalStatuses, 130, false)}</TableCell>
        <TableCell>{date('birthDate')}</TableCell>
        <TableCell>{select('birthPlaceId', choices.cities, 140)}</TableCell>
        <TableCell>{text('nationalNumber', 130, { placeholder: libyan ? t('registration.libyanHint') : '', ltr: true })}</TableCell>
        <TableCell>{text('idCardNumber', 110, { ltr: true })}</TableCell>
        <TableCell>{text('phoneNumber', 120, { placeholder: t('common.optional'), ltr: true })}</TableCell>
        <TableCell>{text('passportNumber', 120, { placeholder: libyan ? t('common.optional') : '', ltr: true })}</TableCell>
        <TableCell>{date('passportIssueDate')}</TableCell>
        <TableCell>{date('passportExpiryDate')}</TableCell>
        <TableCell sx={scanCellSx(err('passportScan'))}>
          <CandidateScanCell candidateId={r.candidateId} kind="Passport" attached={r.passportScan} required={!libyan} onChange={(v) => set({ passportScan: v })} />
        </TableCell>
        <TableCell>{date('healthCertificateIssueDate')}</TableCell>
        <TableCell>{date('healthCertificateExpiryDate')}</TableCell>
        <TableCell sx={scanCellSx(err('healthScan'))}>
          <CandidateScanCell candidateId={r.candidateId} kind="HealthCertificate" attached={r.healthScan} required onChange={(v) => set({ healthScan: v })} />
        </TableCell>
        <TableCell>{select('departmentId', choices.departments, 150)}</TableCell>
      </TableRow>
      {messages.length > 0 && (
        <TableRow>
          <TableCell colSpan={columnCount} sx={{ color: 'error.main', fontSize: '0.75rem', pt: 0 }} role="alert">
            {messages.map(([field, message]) => (field === '_row' ? message : `${t(`registration.cols.${field}`, { defaultValue: field })}: ${message}`)).join(' · ')}
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
});
