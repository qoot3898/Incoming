import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

export interface InfoItem {
  label: string;
  value: ReactNode;
  span?: 1 | 2 | 3 | 4;
  hidden?: boolean;
}

/** Definition list in a responsive grid. */
export function InfoGrid({ items, columns = 3 }: { items: InfoItem[]; columns?: 2 | 3 | 4 }) {
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))', md: `repeat(${columns}, minmax(0,1fr))` },
      }}
    >
      {items
        .filter((i) => !i.hidden)
        .map((item) => (
          <Box key={item.label} sx={{ gridColumn: { md: item.span ? `span ${item.span}` : undefined }, minWidth: 0 }}>
            <Typography component="dt" variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
              {item.label}
            </Typography>
            <Typography component="dd" variant="body2" sx={{ m: 0, fontWeight: 500, overflowWrap: 'anywhere' }}>
              {item.value === null || item.value === undefined || item.value === '' ? '—' : item.value}
            </Typography>
          </Box>
        ))}
    </Box>
  );
}
