import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { IconButton, InputAdornment, TextField, type TextFieldProps } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

type Props = Omit<TextFieldProps, 'value' | 'onChange'> & {
  /** Committed value (usually from URL list state). */
  value: string;
  /** Called with the new value after the user stops typing for `delay` ms (or presses Enter). */
  onCommit: (value: string) => void;
  delay?: number;
};

/**
 * Filter input that keeps typing local and commits after a pause, so list pages send
 * one request per search instead of one per keystroke (and don't add a history entry per key).
 * Also used for date and number filters, whose native inputs emit several intermediate values.
 */
export function SearchField({ value, onCommit, delay = 350, type, slotProps, ...props }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);

  // External change (filter reset, chip removal, back/forward navigation): adopt it during render.
  if (value !== synced) {
    setSynced(value);
    setText(value);
  }

  // Latest callback without restarting the timer when the parent passes a new closure.
  const commitRef = useRef(onCommit);
  useEffect(() => {
    commitRef.current = onCommit;
  });

  useEffect(() => {
    if (text === value) return;
    const id = setTimeout(() => commitRef.current(text), delay);
    return () => clearTimeout(id);
  }, [text, value, delay]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && text !== value) {
      e.preventDefault();
      commitRef.current(text);
    }
  };

  const isText = !type || type === 'text' || type === 'search';
  const clear =
    isText && text ? (
      <InputAdornment position="end">
        <IconButton
          size="small"
          edge="end"
          aria-label={t('common.clear')}
          onClick={() => {
            setText('');
            commitRef.current('');
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </InputAdornment>
    ) : undefined;

  return (
    <TextField
      {...props}
      type={type === 'search' ? 'text' : type}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={onKeyDown}
      slotProps={{
        ...slotProps,
        inputLabel: type === 'date' || type === 'datetime-local' ? { shrink: true } : slotProps?.inputLabel,
        input: clear ? { endAdornment: clear } : slotProps?.input,
      }}
    />
  );
}
