import { useState, type ReactNode } from 'react';
import { Button, type ButtonProps } from '@mui/material';
import { FormDialog, type FormDialogProps } from './FormDialog';

type Props<T> = Omit<FormDialogProps<T>, 'open' | 'onClose' | 'title'> & {
  label: string;
  dialogTitle?: string;
  startIcon?: ReactNode;
  variant?: ButtonProps['variant'];
  color?: ButtonProps['color'];
  size?: ButtonProps['size'];
  disabled?: boolean;
};

/** A button that opens a FormDialog for a workflow action. */
export function ActionFormButton<T>({ label, dialogTitle, startIcon, variant = 'outlined', color, size, disabled, ...dialog }: Props<T>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} color={color} size={size} startIcon={startIcon} disabled={disabled} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <FormDialog<T> {...dialog} title={dialogTitle ?? label} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
