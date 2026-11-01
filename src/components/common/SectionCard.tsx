import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, Divider } from '@mui/material';

interface Props {
  title: ReactNode;
  subheader?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  noPadding?: boolean;
}

export function SectionCard({ title, subheader, action, children, noPadding }: Props) {
  return (
    <Card>
      <CardHeader title={title} subheader={subheader} action={action} sx={{ '& .MuiCardHeader-action': { alignSelf: 'center', m: 0 } }} />
      <Divider />
      {noPadding ? children : <CardContent>{children}</CardContent>}
    </Card>
  );
}
