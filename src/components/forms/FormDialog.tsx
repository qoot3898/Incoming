import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormHelperText,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { TransferOptions } from '@/services/api/client';
import { FileInput } from '@/components/files/FileInput';
import { useFileProblemText } from '@/components/files/useFileProblemText';
import { DEFAULT_ACCEPT, DEFAULT_MAX_FILE_MB, validateFile, type FileProblem } from '@/utils/files';
import { FormErrorAlert } from './FormLayout';
import { useFormServerError } from './useFormServerError';

export interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
}

type Base<T> = {
  name: keyof T & string;
  label: string;
  required?: boolean;
  helperText?: string;
  /** half width on ≥sm screens */
  half?: boolean;
  hidden?: boolean;
  /** Shown but not editable (e.g. a value fixed by the record); the value is still submitted. */
  disabled?: boolean;
  /**
   * Shown only while this returns true for the current (raw) form values, e.g. expiry dates
   * for one document kind. A field that is not shown is neither validated nor submitted.
   */
  visibleWhen?: (values: Record<string, unknown>) => boolean;
};

export type FieldConfig<T> = Base<T> &
  (
    | { kind: 'text'; maxLength?: number }
    | { kind: 'textarea'; maxLength?: number; rows?: number }
    | { kind: 'number'; min?: number; max?: number; step?: number }
    | { kind: 'date'; min?: string; max?: string }
    | { kind: 'select'; options: Option[] }
    | { kind: 'boolean' }
    | { kind: 'file'; accept?: string; maxSizeMb?: number }
  );

type RawValue = string | boolean | File | null;
type RawValues = Record<string, RawValue>;

/** Cross-field rules checked after the per-field rules pass: field name → message. */
export type FormDialogValidate<T> = (values: T) => Partial<Record<keyof T & string, string>> | null | undefined;

function shownFor<T>(fields: FieldConfig<T>[], raw: RawValues): FieldConfig<T>[] {
  return fields.filter((f) => !f.visibleWhen || f.visibleWhen(raw));
}

function initial<T>(f: FieldConfig<T>, dv: unknown): RawValue {
  if (f.kind === 'boolean') return Boolean(dv);
  if (f.kind === 'file') return null;
  return dv === null || dv === undefined ? '' : String(dv);
}

function buildSchema<T>(fields: FieldConfig<T>[], t: TFunction, fileProblem: (p: FileProblem) => string) {
  const shape: Record<string, z.ZodTypeAny> = {};
  fields.forEach((f) => {
    if (f.hidden) return;
    switch (f.kind) {
      case 'boolean':
        shape[f.name] = z.boolean();
        break;
      case 'file':
        // Same rules as the picker (it rejects bad files up front); kept here as the single submit gate.
        shape[f.name] = z
          .instanceof(File)
          .nullable()
          .superRefine((v, ctx) => {
            if (!v) {
              if (f.required) ctx.addIssue({ code: 'custom', message: t('validation.required') });
              return;
            }
            const problem = validateFile(v, { accept: f.accept ?? DEFAULT_ACCEPT, maxMb: f.maxSizeMb ?? DEFAULT_MAX_FILE_MB });
            if (problem) ctx.addIssue({ code: 'custom', message: fileProblem(problem) });
          });
        break;
      case 'number':
        shape[f.name] = z.string().superRefine((v, ctx) => {
          if (v.trim() === '') {
            if (f.required) ctx.addIssue({ code: 'custom', message: t('validation.required') });
            return;
          }
          const n = Number(v);
          if (Number.isNaN(n)) ctx.addIssue({ code: 'custom', message: t('validation.number') });
          else if (f.min !== undefined && n < f.min) ctx.addIssue({ code: 'custom', message: t('validation.min', { min: f.min }) });
          else if (f.max !== undefined && n > f.max) ctx.addIssue({ code: 'custom', message: t('validation.max', { max: f.max }) });
        });
        break;
      case 'date':
        shape[f.name] = z.string().superRefine((v, ctx) => {
          if (!v) {
            if (f.required) ctx.addIssue({ code: 'custom', message: t('validation.required') });
            return;
          }
          if (f.min && v < f.min) ctx.addIssue({ code: 'custom', message: t('validation.dateMin', { date: f.min }) });
          if (f.max && v > f.max) ctx.addIssue({ code: 'custom', message: t('validation.dateMax', { date: f.max }) });
        });
        break;
      default: {
        let s = z.string();
        if ('maxLength' in f && f.maxLength) s = s.max(f.maxLength, t('validation.maxLength', { max: f.maxLength }));
        shape[f.name] = f.required ? s.refine((v) => v.trim().length > 0, t('validation.required')) : s;
      }
    }
  });
  return z.object(shape);
}

function convert<T>(fields: FieldConfig<T>[], raw: RawValues): T {
  const out: Record<string, unknown> = {};
  fields.forEach((f) => {
    if (f.hidden) return;
    const v = raw[f.name];
    switch (f.kind) {
      case 'boolean':
      case 'file':
        out[f.name] = v;
        break;
      case 'number':
        out[f.name] = v === '' || v === null ? null : Number(v);
        break;
      case 'select': {
        const opt = f.options.find((o) => String(o.value) === v);
        out[f.name] = opt ? opt.value : null;
        break;
      }
      default:
        out[f.name] = typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
    }
  });
  return out as T;
}

export interface FormDialogProps<T> {
  open: boolean;
  title: string;
  description?: ReactNode;
  fields: FieldConfig<T>[];
  defaultValues?: Partial<Record<keyof T, unknown>>;
  submitLabel?: string;
  destructive?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md';
  children?: ReactNode;
  onClose: () => void;
  /** Cross-field validation (date order, "required when …"); messages appear under the fields. */
  validate?: FormDialogValidate<T>;
  /**
   * Performs the action. `transfer` carries an AbortSignal and an upload-progress callback:
   * pass it to `api.postForm` for forms with a file field so the upload shows progress and can be cancelled.
   */
  onSubmit: (values: T, transfer: TransferOptions) => Promise<unknown>;
}

/**
 * Config-driven dialog form (React Hook Form + Zod) used for workflow actions.
 * The form lives in `FormDialogBody`, which MUI only mounts while the dialog is open,
 * so closed dialogs cost nothing and every opening starts from fresh defaults.
 */
export function FormDialog<T>({ open, onClose, maxWidth = 'sm', ...body }: FormDialogProps<T>) {
  const [submitting, setSubmitting] = useState(false);
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth={maxWidth} fullScreen={phone} aria-busy={submitting || undefined}>
      <FormDialogBody<T> {...body} onClose={onClose} onSubmittingChange={setSubmitting} />
    </Dialog>
  );
}

type BodyProps<T> = Omit<FormDialogProps<T>, 'open' | 'maxWidth'> & { onSubmittingChange: (busy: boolean) => void };

function FormDialogBody<T>({ title, description, fields, defaultValues, submitLabel, destructive, children, onClose, onSubmit, validate, onSubmittingChange }: BodyProps<T>) {
  const { t } = useTranslation();
  const fileProblem = useFileProblemText();
  // Fields stay live (select options may arrive while the dialog is open);
  // defaults are captured once per opening — the body remounts every time the dialog opens.
  const visible = useMemo(() => fields.filter((f) => !f.hidden), [fields]);
  const dynamic = visible.some((f) => f.visibleWhen);
  // The schema depends on which conditional fields are shown, so it is built per validation from
  // the values being validated; the ref keeps the resolver stable while fields stay live.
  const schemaFor = useRef<(raw: RawValues) => z.ZodTypeAny>(() => z.object({}));
  schemaFor.current = (raw) => buildSchema(shownFor(visible, raw), t, fileProblem);
  const [resolver] = useState(() => {
    const r: Resolver<RawValues> = (values, context, options) => zodResolver(schemaFor.current(values))(values, context, options);
    return r;
  });
  const [defaults] = useState(() => {
    const d: RawValues = {};
    fields.forEach((f) => {
      if (!f.hidden) d[f.name] = initial(f, defaultValues?.[f.name]);
    });
    return d;
  });

  const { control, handleSubmit, setError, formState, getValues } = useForm<RawValues>({ resolver, defaultValues: defaults });
  // Re-render on value changes only when some field depends on them.
  const watched = useWatch({ control, disabled: !dynamic }) as RawValues;
  const shown = dynamic ? shownFor(visible, { ...defaults, ...watched }) : visible;
  const { serverError, handleServerError, clearServerError } = useFormServerError(
    (field, message) => setError(field, { type: 'server', message }),
    visible.map((f) => f.name),
  );

  // One request at a time (fast double clicks / Enter), and a handle to cancel an upload.
  const inFlight = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const uploading = progress !== null && progress < 100;

  const submit = handleSubmit(async (raw) => {
    if (inFlight.current) return;
    const active = shownFor(visible, raw);
    const values = convert(active, raw);
    const problems = Object.entries(validate?.(values) ?? {}).filter((e): e is [string, string] => !!e[1]);
    if (problems.length > 0) {
      problems.forEach(([field, message]) => setError(field, { type: 'validate', message }, { shouldFocus: true }));
      return;
    }
    inFlight.current = true;
    clearServerError();
    onSubmittingChange(true);
    const hasFile = active.some((f) => f.kind === 'file' && getValues(f.name) instanceof File);
    const ctrl = new AbortController();
    controller.current = ctrl;
    if (hasFile) setProgress(0);
    try {
      await onSubmit(values, {
        signal: ctrl.signal,
        onUploadProgress: hasFile ? (e) => setProgress(e.total ? Math.round((e.loaded * 100) / e.total) : null) : undefined,
      });
      onClose();
    } catch (e) {
      await handleServerError(e);
    } finally {
      inFlight.current = false;
      controller.current = null;
      setProgress(null);
      onSubmittingChange(false);
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {description && (
            <Typography variant="body2" color="text.secondary" component="div">
              {description}
            </Typography>
          )}
          {children}
          <FormErrorAlert value={serverError} />
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            {shown.map((f) => (
              <Box key={f.name} sx={{ gridColumn: f.half ? undefined : '1 / -1' }}>
                <Controller
                  name={f.name}
                  control={control}
                  render={({ field, fieldState }) => {
                    const err = fieldState.error?.message;
                    const help = err ?? f.helperText;
                    if (f.kind === 'boolean') {
                      return (
                        <>
                          <FormControlLabel
                            control={<Checkbox checked={Boolean(field.value)} disabled={f.disabled} onChange={(e) => field.onChange(e.target.checked)} />}
                            label={f.label}
                          />
                          {help && <FormHelperText error={!!err}>{help}</FormHelperText>}
                        </>
                      );
                    }
                    if (f.kind === 'file') {
                      return (
                        <FileInput
                          label={f.label}
                          value={field.value instanceof File ? field.value : null}
                          onChange={(file) => field.onChange(file)}
                          accept={f.accept}
                          maxSizeMb={f.maxSizeMb}
                          required={f.required}
                          disabled={formState.isSubmitting || f.disabled}
                          error={err}
                          helperText={f.helperText}
                        />
                      );
                    }
                    return (
                      <TextField
                        {...field}
                        value={(field.value as string) ?? ''}
                        label={f.label}
                        required={f.required}
                        disabled={f.disabled}
                        error={!!err}
                        helperText={help}
                        select={f.kind === 'select'}
                        multiline={f.kind === 'textarea'}
                        minRows={f.kind === 'textarea' ? f.rows ?? 3 : undefined}
                        type={f.kind === 'number' ? 'number' : f.kind === 'date' ? 'date' : 'text'}
                        slotProps={{
                          inputLabel: f.kind === 'date' ? { shrink: true } : undefined,
                          htmlInput:
                            f.kind === 'number'
                              ? { min: f.min, max: f.max, step: f.step ?? 'any' }
                              : f.kind === 'date'
                                ? { min: f.min, max: f.max }
                                : 'maxLength' in f && f.maxLength
                                  ? { maxLength: f.maxLength }
                                  : undefined,
                        }}
                      >
                        {f.kind === 'select' && [
                          !f.required && (
                            <MenuItem key="__none" value="">
                              <em>{t('common.none')}</em>
                            </MenuItem>
                          ),
                          ...f.options.map((o) => (
                            <MenuItem key={String(o.value)} value={String(o.value)} disabled={o.disabled}>
                              {o.label}
                            </MenuItem>
                          )),
                        ]}
                      </TextField>
                    );
                  }}
                />
              </Box>
            ))}
          </Box>
        </Stack>
      </DialogContent>
      {progress !== null && (
        <Box sx={{ px: 3, pb: 1 }} role="status" aria-live="polite">
          <LinearProgress variant={progress > 0 ? 'determinate' : 'indeterminate'} value={progress} />
          <Typography variant="caption" color="text.secondary">
            {progress >= 100 ? t('files.processing') : t('files.uploading', { percent: progress })}
          </Typography>
        </Box>
      )}
      <DialogActions>
        {uploading ? (
          <Button onClick={() => controller.current?.abort()} color="inherit">
            {t('files.cancelUpload')}
          </Button>
        ) : (
          <Button onClick={onClose} color="inherit" disabled={formState.isSubmitting}>
            {t('common.cancel')}
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          color={destructive ? 'error' : 'primary'}
          disabled={formState.isSubmitting}
          startIcon={formState.isSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {formState.isSubmitting ? t('common.saving') : submitLabel ?? t('common.save')}
        </Button>
      </DialogActions>
    </form>
  );
}
