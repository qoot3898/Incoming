import { MenuItem, TextField, type TextFieldProps } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { Option } from './FormDialog';

type Props = Omit<TextFieldProps, 'onChange' | 'value' | 'select'> & {
  value: string | number | undefined | null;
  options: Option[];
  onChange: (value: string) => void;
  /** label of the empty option; set to false to hide it */
  emptyLabel?: string | false;
};

/** Simple controlled select used in filter bars and forms. */
export function SelectField({ value, options, onChange, emptyLabel, ...rest }: Props) {
  const { t } = useTranslation();
  return (
    <TextField select value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest}>
      {emptyLabel !== false && (
        <MenuItem value="">
          <em>{emptyLabel ?? t('common.all')}</em>
        </MenuItem>
      )}
      {options.map((o) => (
        <MenuItem key={String(o.value)} value={String(o.value)} disabled={o.disabled}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
