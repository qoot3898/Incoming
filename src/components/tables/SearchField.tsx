import { useEffect, useRef, useState } from 'react';
import { TextField, type TextFieldProps } from '@mui/material';

type Props = Omit<TextFieldProps, 'value' | 'onChange'> & {
  /** Committed value (usually from URL list state). */
  value: string;
  /** Called with the new value after the user stops typing for `delay` ms. */
  onCommit: (value: string) => void;
  delay?: number;
};

/**
 * Text filter that keeps typing local and commits after a pause, so list pages send
 * one request per search instead of one per keystroke (and don't rewrite the URL on every key).
 */
export function SearchField({ value, onCommit, delay = 350, ...props }: Props) {
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);

  // External change (filter reset, back/forward navigation): adopt it during render.
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

  return <TextField {...props} value={text} onChange={(e) => setText(e.target.value)} />;
}
