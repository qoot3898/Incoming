import { Box, Grid2 as Grid, Stack } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { terminationsApi, terminationsKeys } from './api';
import {
  ClosingSection,
  ExecutionSection,
  NoticesSection,
  PassportSection,
  ReplacementSection,
  RequestSection,
  SettlementSection,
  TerminationHeader,
} from './TerminationSections';
import { QueryBoundary } from '@/components/common/States';
import type { S } from '@/types/api';

/**
 * Termination of a worker (FR-46..FR-53): request and operations decision, execution with clearance,
 * settlement, passport on exit, replacement and closing. Each section owns its actions.
 */
export default function TerminationDetailsPage() {
  const id = Number(useParams().terminationId);
  const query = useQuery({ queryKey: terminationsKeys.detail(id), queryFn: () => terminationsApi.get(id) });
  return <QueryBoundary query={query}>{(d) => <View d={d} />}</QueryBoundary>;
}

function View({ d }: { d: S<'TerminationDetails'> }) {
  return (
    <Box>
      <TerminationHeader d={d} />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={3}>
            <RequestSection d={d} />
            <ExecutionSection d={d} />
            <SettlementSection d={d} />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={3}>
            <PassportSection d={d} />
            <ReplacementSection d={d} />
            <ClosingSection d={d} />
            <NoticesSection notices={d.notices} />
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
