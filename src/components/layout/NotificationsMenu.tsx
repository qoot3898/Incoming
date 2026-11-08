import { useState } from 'react';
import { Badge, Box, Button, Divider, IconButton, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { tasksApi, tasksKeys } from '@/features/tasks/api';
import { formatDateTime } from '@/utils/format';
import { resolveLink } from '@/features/tasks/links';
import { brand } from '@/app/theme/brand';
import type { S } from '@/types/api';

type LaborTasks = S<'LaborTasks'>;

export function NotificationsMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const tasks = useQuery({ queryKey: tasksKeys.all, queryFn: tasksApi.get, refetchInterval: 120_000 });
  const queryClient = useQueryClient();
  // Optimistic: the badge and the bold style update immediately; rolled back if the request fails.
  const markRead = useMutation({
    mutationFn: tasksApi.markRead,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: tasksKeys.all });
      const previous = queryClient.getQueryData<LaborTasks>(tasksKeys.all);
      if (previous) {
        const readAt = new Date().toISOString();
        queryClient.setQueryData<LaborTasks>(tasksKeys.all, {
          ...previous,
          notifications: previous.notifications.map((n) => (n.id === id ? { ...n, readAt } : n)),
        });
      }
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(tasksKeys.all, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: tasksKeys.all }),
  });
  const notifications = tasks.data?.notifications ?? [];
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <>
      <Tooltip title={t('header.notifications')}>
        <IconButton color="inherit" onClick={(e) => setAnchor(e.currentTarget)} aria-label={t('header.notifications')}>
          <Badge badgeContent={unread} color="error" max={99}>
            <NotificationsNoneOutlinedIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { width: 360, maxWidth: '92vw', maxHeight: 460 } } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle1">{t('header.notifications')}</Typography>
        </Box>
        <Divider />
        {notifications.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3, textAlign: 'center' }}>
            {t('tasks.noNotifications')}
          </Typography>
        )}
        {notifications.slice(0, 20).map((n) => (
          <MenuItem
            key={n.id}
            onClick={() => {
              if (!n.readAt) markRead.mutate(n.id);
              setAnchor(null);
              const to = resolveLink(n.link);
              if (to) navigate(to);
            }}
            sx={{ whiteSpace: 'normal', alignItems: 'flex-start', bgcolor: n.readAt ? undefined : brand.leafSoft }}
          >
            <Stack spacing={0.25}>
              <Typography variant="body2" fontWeight={n.readAt ? 400 : 600}>
                {n.title}
              </Typography>
              {n.body && (
                <Typography variant="caption" color="text.secondary">
                  {n.body}
                </Typography>
              )}
              <Typography variant="caption" color="text.disabled">
                {formatDateTime(n.createdAt)}
              </Typography>
            </Stack>
          </MenuItem>
        ))}
        <Divider />
        <Box sx={{ px: 1, py: 0.5 }}>
          <Button
            fullWidth
            size="small"
            onClick={() => {
              setAnchor(null);
              navigate('/');
            }}
          >
            {t('tasks.openInbox')}
          </Button>
        </Box>
      </Menu>
    </>
  );
}
