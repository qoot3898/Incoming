import { MenuItem, TextField, type TextFieldProps } from '@mui/material';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { Option } from './FormDialog';

type Bound<T extends FieldValues> = { control: Control<T>; name: Path<T> };

/**
 * TextField bound to React Hook Form: value, change, blur, error state and message in one place,
 * so page forms render validation identically (helper text is replaced by the error when present).
 */
export function FormTextField<T extends FieldValues>({ control, name, helperText, type, slotProps, ...props }: Bound<T> & Omit<TextFieldProps, 'name'>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...props}
          {...field}
          value={field.value ?? ''}
          type={type}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? helperText}
          slotProps={type === 'date' ? { ...slotProps, inputLabel: { shrink: true } } : slotProps}
        />
      )}
    />
  );
}

/** Select bound to React Hook Form; optional fields get a "None" entry. */
export function FormSelectField<T extends FieldValues>({
  control,
  name,
  options,
  helperText,
  onValueChange,
  ...props
}: Bound<T> & Omit<TextFieldProps, 'name' | 'select'> & { options: Option[]; onValueChange?: (value: string) => void }) {
  const { t } = useTranslation();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...props}
          {...field}
          select
          value={field.value ?? ''}
          onChange={(e) => (onValueChange ? onValueChange(e.target.value) : field.onChange(e.target.value))}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? helperText}
        >
          {!props.required && (
            <MenuItem value="">
              <em>{t('common.none')}</em>
            </MenuItem>
          )}
          {options.map((o) => (
            <MenuItem key={String(o.value)} value={String(o.value)} disabled={o.disabled}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}
