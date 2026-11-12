import { Box, Typography } from '@mui/material';
import type { HTMLAttributes } from 'react';
import { useEnumLabel } from '@/hooks/useEnumLabel';
import { workerLabel, type WorkerItem } from './useWorkerSearch';

type Props = { worker: WorkerItem; optionProps: HTMLAttributes<HTMLLIElement> & { key?: string } };

/** One row of a worker dropdown: number — name, then track · site · job · status. */
export function WorkerOption({ worker, optionProps }: Props) {
  const enumLabel = useEnumLabel();
  const { key, ...rest } = optionProps;
  return (
    <Box component="li" key={key} {...rest} sx={{ display: 'block !important' }}>
      <Typography variant="body2" fontWeight={600}>
        {workerLabel(worker)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {[worker.trackName, worker.workSiteName, worker.jobName, enumLabel('LaborStatus', worker.status)].filter(Boolean).join(' · ')}
      </Typography>
    </Box>
  );
}
