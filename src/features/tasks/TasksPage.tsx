import { useTheme } from '@mui/material/styles';
import { Box, Button, Card, CardActionArea, Chip, Grid2 as Grid, List, ListItem, ListItemButton, ListItemText, Paper, Stack, Typography } from '@mui/material';
import { brand } from '@/app/theme/brand';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { tasksApi, tasksKeys } from './api';
import { ACTION_ROUTES, resolveLink } from './links';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState, QueryBoundary } from '@/components/common/States';
import { SectionCard } from '@/components/common/SectionCard';
import { useEnumLabel } from '@/hooks/useEnumLabel';
import { formatDateTime } from '@/utils/format';
import { useApiMutation } from '@/hooks/useApiMutation';
import { ToneChip } from '@/components/common/StatusChip';

export default function TasksPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const label = useEnumLabel();
  const query = useQuery({ queryKey: tasksKeys.all, queryFn: tasksApi.get });
  const markRead = useApiMutation(tasksApi.markRead, { invalidate: [tasksKeys.all], success: false });
  const Chevron = theme.direction === 'rtl' ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <PageContainer>
      <PageHeader
        title={t('tasks.title')}
        breadcrumbs={[]}
        actions={
          <Button variant="outlined" onClick={() => void query.refetch()} disabled={query.isFetching}>
            {t('common.refresh')}
          </Button>
        }
      />
      <QueryBoundary query={query}>
        {(data) => (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Stack spacing={3}>
                {data.pendingDecisions.length > 0 && (
                  <SectionCard title={t('tasks.pendingDecisions')} noPadding>
                    <List disablePadding>
                      {data.pendingDecisions.map((d) => (
                        <ListItemButton key={`${d.number}-${d.party}`} component={RouterLink} to={`/staffing-requests/${d.number}`} divider>
                          <ListItemText
                            primary={`${t('staffing.requestNo', { n: d.number })} — ${d.jobName ?? ''} × ${d.count}`}
                            secondary={[d.trackName, d.workSiteName, label('LaborParty', d.party), formatDateTime(d.waitingSince)].filter(Boolean).join(' · ')}
                          />
                          <Chevron color="action" />
                        </ListItemButton>
                      ))}
                    </List>
                  </SectionCard>
                )}
                <SectionCard title={t('tasks.actions')} noPadding>
                  {data.actions.length === 0 ? (
                    <EmptyState title={t('tasks.noActions')} description={t('tasks.noActionsHint')} />
                  ) : (
                    <Box sx={{ display: 'grid', gap: 1.5, p: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                      {data.actions.map((a) => (
                        <Card key={`${a.kind}|${a.link ?? a.title}`} sx={{ borderColor: a.late ? 'error.light' : undefined }}>
                          <CardActionArea onClick={() => navigate(resolveLink(a.link) ?? ACTION_ROUTES[a.kind] ?? '/')} sx={{ p: 2, height: '100%' }}>
                            <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {label('LaborActionKind', a.kind)}
                                </Typography>
                                <Typography variant="subtitle2" sx={{ mt: 0.25 }}>
                                  {a.title}
                                </Typography>
                                {a.subtitle && (
                                  <Typography variant="body2" color="text.secondary">
                                    {a.subtitle}
                                  </Typography>
                                )}
                              </Box>
                              <Stack alignItems="flex-end" spacing={0.5}>
                                {a.count !== null && a.count !== undefined && <Chip size="small" label={a.count} color="primary" />}
                                {a.late && <ToneChip tone="error" label={t('tasks.late')} />}
                              </Stack>
                            </Stack>
                            {a.since && (
                              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1, color: 'text.secondary' }}>
                                <AccessTimeIcon sx={{ fontSize: 14 }} />
                                <Typography variant="caption">{formatDateTime(a.since)}</Typography>
                              </Stack>
                            )}
                          </CardActionArea>
                        </Card>
                      ))}
                    </Box>
                  )}
                </SectionCard>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <SectionCard title={t('header.notifications')} noPadding>
                {data.notifications.length === 0 ? (
                  <EmptyState title={t('tasks.noNotifications')} />
                ) : (
                  <List disablePadding sx={{ maxHeight: 640, overflowY: 'auto' }}>
                    {data.notifications.map((n) => (
                      <ListItem
                        key={n.id}
                        divider
                        disablePadding
                        sx={{ bgcolor: n.readAt ? undefined : brand.leafSoft }}
                      >
                        <ListItemButton
                          onClick={() => {
                            if (!n.readAt) markRead.mutate(n.id);
                            const to = resolveLink(n.link);
                            if (to) navigate(to);
                          }}
                        >
                          <ListItemText
                            primary={n.title}
                            secondary={
                              <>
                                {n.body && <span style={{ display: 'block' }}>{n.body}</span>}
                                <span>{formatDateTime(n.createdAt)}</span>
                              </>
                            }
                            primaryTypographyProps={{ fontWeight: n.readAt ? 400 : 600, fontSize: '0.875rem' }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </SectionCard>
              <Paper variant="outlined" sx={{ p: 2, mt: 3, bgcolor: brand.creamSoft, borderColor: brand.creamLine }}>
                <Typography variant="body2" color="text.secondary">
                  {t('tasks.scopeHint')}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}
      </QueryBoundary>
    </PageContainer>
  );
}
