import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { layout } from '@/app/theme/layout';

type Width = 'full' | keyof typeof layout.pageWidth;

/**
 * Root of a page inside the app shell. `full` uses the shell's content width (lists, details);
 * `form` / `narrow` keep the header and a single form column aligned at a readable width.
 */
export function PageContainer({ width = 'full', children }: { width?: Width; children: ReactNode }) {
  return <Box sx={{ width: '100%', maxWidth: width === 'full' ? undefined : layout.pageWidth[width], minWidth: 0 }}>{children}</Box>;
}
