import { useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormHelperText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { toApiError, type ApiError } from '@/services/api/errors';

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
};

export type FieldConfig<T> = Base<T> &
  (
    | { kind: 'text'; maxLength?: number }
    | { kind: 'textarea'; maxLength?: number; rows?: number }
    | { kind: 'number'; min?: number; max?: number; step?: number }
    | { kind: 'date'; min?: string; max?: string }
    | { kind: 'select'; options: Option[] }
    | { kind: 'boolean' }
    | { kind: 'file'; accept?: string }
  );

type RawValue = string | boolean | File | null;
type RawValues = Record<string, RawValue>;

function initial<T>(f: FieldConfig<T>, dv: unknown): RawValue {
  if (f.kind === 'boolean') return Boolean(dv);
  if (f.kind === 'file') return null;
  return dv === null || dv === undefined ? '' : String(dv);
}

function buildSchema<T>(fields: FieldConfig<T>[], t: TFunction) {
  const shape: Record<string, z.ZodTypeAny> = {};
  fields.forEach((f) => {
    if (f.hidden) return;
    switch (f.kind) {
      case 'boolean':
        shape[f.name] = z.boolean();
        break;
      case 'file':
        shape[f.name] = z
          .instanceof(File)
          .nullable()
          .refine((v) => !f.required || v !== null, t('validation.required'));
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
  onSubmit: (values: T) => Promise<unknown>;
}

/**
 * Config-driven dialog form (React Hook Form + Zod) used for workflow actions.
 * The form lives in `FormDialogBody`, which MUI only mounts while the dialog is open,
 * so closed dialogs cost nothing and every opening starts from fresh defaults.
 */
export function FormDialog<T>({ open, onClose, maxWidth = 'sm', ...body }: FormDialogProps<T>) {
  const [submitting, setSubmitting] = useState(false);
  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth={maxWidth}>
      <FormDialogBody<T> {...body} onClose={onClose} onSubmittingChange={setSubmitting} />
    </Dialog>
  );
}

type BodyProps<T> = Omit<FormDialogProps<T>, 'open' | 'maxWidth'> & { onSubmittingChange: (busy: boolean) => void };

function FormDialogBody<T>({ title, description, fields, defaultValues, submitLabel, destructive, children, onClose, onSubmit, onSubmittingChange }: BodyProps<T>) {
  const { t } = useTranslation();
  // Fields stay live (select options may arrive while the dialog is open);
  // defaults are captured once per opening — the body remounts every time the dialog opens.
  const visible = useMemo(() => fields.filter((f) => !f.hidden), [fields]);
  const schema = useMemo(() => buildSchema(visible, t), [visible, t]);
  const [defaults] = useState(() => {
    const d: RawValues = {};
    fields.forEach((f) => {
      if (!f.hidden) d[f.name] = initial(f, defaultValues?.[f.name]);
    });
    return d;
  });

  const { control, handleSubmit, setError, formState } = useForm<RawValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });
  const [serverError, setServerError] = useState<ApiError | null>(null);

  const submit = handleSubmit(async (raw) => {
    setServerError(null);
    onSubmittingChange(true);
    try {
      await onSubmit(convert(visible, raw));
      onClose();
    } catch (e) {
      const err = isApiError(e) ? e : await toApiError(e, t('errors.generic'));
      const unmatched: string[] = [];
      Object.entries(err.fieldErrors).forEach(([k, msgs]) => {
        if (visible.some((f) => f.name === k)) setError(k, { message: msgs.join(' ') });
        else unmatched.push(...msgs);
      });
      setServerError({ ...err, fieldErrors: unmatched.length ? { _: unmatched } : {} });
    } finally {
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
          {serverError && (
            <Alert severity="error">
              {serverError.detail || serverError.title}
              {(serverError.fieldErrors._ ?? []).map((m) => (
                <div key={m}>{m}</div>
              ))}
            </Alert>
          )}
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            {visible.map((f) => (
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
                            control={<Checkbox checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} />}
                            label={f.label}
                          />
                          {help && <FormHelperText error={!!err}>{help}</FormHelperText>}
                        </>
                      );
                    }
                    if (f.kind === 'file') {
                      const file = field.value instanceof File ? field.value : null;
                      return (
                        <Box>
                          <Button component="label" variant="outlined" startIcon={<AttachFileIcon />} color={err ? 'error' : 'primary'}>
                            {f.label}
                            {f.required ? ' *' : ''}
                            <input
                              hidden
                              type="file"
                              accept={f.accept ?? 'application/pdf,image/*'}
                              onChange={(e) => field.onChange(e.target.files?.[0] ?? null)}
                            />
                          </Button>
                          <Typography variant="caption" sx={{ ms: 1, display: 'inline-block', mx: 1 }} color="text.secondary">
                            {file ? file.name : t('common.noFile')}
                          </Typography>
                          {help && <FormHelperText error={!!err}>{help}</FormHelperText>}
                        </Box>
                      );
                    }
                    return (
                      <TextField
                        {...field}
                        value={(field.value as string) ?? ''}
                        label={f.label}
                        required={f.required}
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
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={formState.isSubmitting}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" variant="contained" color={destructive ? 'error' : 'primary'} disabled={formState.isSubmitting}>
          {formState.isSubmitting ? t('common.saving') : submitLabel ?? t('common.save')}
        </Button>
      </DialogActions>
    </form>
  );
}

function isApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && e !== null && 'fieldErrors' in e && 'title' in e;
}
