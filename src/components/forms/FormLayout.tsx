import { useEffect, useRef, type ReactNode } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { FormServerError } from './useFormServerError';

const COLUMNS = { 1: '1fr', 2: 'repeat(2, minmax(0, 1fr))', 3: 'repeat(3, minmax(0, 1fr))' } as const;

/** Responsive field grid: one column on phones, `columns` from `sm` up. */
export function FormGrid({ columns = 2, children }: { columns?: 1 | 2 | 3; children: ReactNode }) {
  return <Box sx={{ display: 'grid', gap: 2, alignItems: 'start', gridTemplateColumns: { xs: '1fr', sm: COLUMNS[columns] } }}>{children}</Box>;
}

/** Makes a field span the whole FormGrid row (textareas, pickers, hints). */
export function FullRow({ children }: { children: ReactNode }) {
  return <Box sx={{ gridColumn: '1 / -1', minWidth: 0 }}>{children}</Box>;
}

/** A titled group of related fields (`fieldset` + `legend` for assistive technology). */
export function FormSection({ title, description, columns = 2, children }: { title?: string; description?: ReactNode; columns?: 1 | 2 | 3; children: ReactNode }) {
  return (
    <Box component="fieldset" sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}>
      {title && (
        <Typography component="legend" variant="subtitle1" sx={{ p: 0, mb: description ? 0.25 : 1.5 }}>
          {title}
        </Typography>
      )}
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {description}
        </Typography>
      )}
      <FormGrid columns={columns}>{children}</FormGrid>
    </Box>
  );
}

/** Surface for full-page forms. */
export function FormCard({ children }: { children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      {children}
    </Paper>
  );
}

interface ActionsProps {
  submitLabel: string;
  submitting?: boolean;
  /** Disables submit (e.g. a required worker is not picked yet); cancel stays available. */
  disabled?: boolean;
  onCancel?: () => void;
  cancelLabel?: string;
  destructive?: boolean;
}

/** Submit + cancel row with a busy state that prevents duplicate submissions. */
export function FormActions({ submitLabel, submitting, disabled, onCancel, cancelLabel, destructive }: ActionsProps) {
  const { t } = useTranslation();
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ pt: 2, mt: 1, borderTop: 1, borderColor: 'divider' }}>
      <Button
        type="submit"
        variant="contained"
        color={destructive ? 'error' : 'primary'}
        disabled={disabled || submitting}
        aria-busy={submitting || undefined}
        startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
      >
        {submitting ? t('common.saving') : submitLabel}
      </Button>
      {onCancel && (
        <Button color="inherit" onClick={onCancel} disabled={submitting}>
          {cancelLabel ?? t('common.cancel')}
        </Button>
      )}
    </Stack>
  );
}

/**
 * Server error summary for a form: the ProblemDetails message plus any field messages
 * that could not be shown next to a field. Receives focus so keyboard and screen-reader
 * users notice it.
 */
export function FormErrorAlert({ value }: { value: FormServerError | null }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (value) ref.current?.focus();
  }, [value]);
  if (!value) return null;
  if (value.error.cancelled) {
    return (
      <Alert ref={ref} tabIndex={-1} severity="info">
        {t('files.uploadCancelled')}
      </Alert>
    );
  }
  const main = value.error.detail || value.error.title;
  return (
    <Alert ref={ref} tabIndex={-1} severity="error">
      {main}
      {value.unmatched
        .filter((m) => m !== main)
        .map((m) => (
          <div key={m}>{m}</div>
        ))}
    </Alert>
  );
}
