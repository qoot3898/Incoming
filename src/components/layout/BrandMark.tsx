import { Box } from '@mui/material';

/** Qoot mark (Arabic ق / Latin Q with the leaf). */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <Box component="svg" viewBox="0 0 64 64" sx={{ width: size, height: size, flexShrink: 0, borderRadius: 1.5 }} aria-hidden>
      <rect width="64" height="64" fill="#004949" />
      <path d="M17 13h24c5.5 0 10 4.5 10 10v18c0 5.5-4.5 10-10 10H27c-7.7 0-14-6.3-14-14V17h9v20c0 2.8 2.2 5 5 5h14c.6 0 1-.4 1-1V23c0-.6-.4-1-1-1H17z" fill="#fff0da" />
      <path d="M42 43c7-6 13-5 18-2-5 6-10 9-18 8z" fill="#9be05e" />
    </Box>
  );
}
