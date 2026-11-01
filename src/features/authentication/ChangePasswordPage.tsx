import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useAuth } from '@/app/providers/authContext';
import { authApi } from './api';
import { toApiError } from '@/services/api/errors';
import { useSnackbar } from '@/app/providers/snackbarContext';
import { PageHeader } from '@/components/common/PageHeader';

export default function ChangePasswordPage() {
  const { t } = useTranslation();
  const { user, reload } = useAuth();
  const { notify } = useSnackbar();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const schema = z
    .object({
      currentPassword: z.string().min(1, t('validation.required')),
      newPassword: z.string().min(1, t('validation.required')),
      confirmPassword: z.string().min(1, t('validation.required')),
    })
    .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: t('validation.passwordMismatch') });
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, formState, setError: setFieldError } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await authApi.changePassword(v);
      await reload();
      notify(t('auth.passwordChanged'));
      navigate('/', { replace: true });
    } catch (e) {
      const err = await toApiError(e, t('errors.generic'));
      Object.entries(err.fieldErrors).forEach(([k, m]) => {
        if (k === 'currentPassword' || k === 'newPassword' || k === 'confirmPassword') setFieldError(k, { message: m.join(' ') });
      });
      setError(err.detail || err.title);
    }
  });

  return (
    <Box>
      <PageHeader title={t('auth.changePassword')} />
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 520 }}>
        {user?.mustChangePassword && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('auth.mustChangePassword')}
          </Alert>
        )}
        <form onSubmit={onSubmit} noValidate>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField type="password" label={t('auth.currentPassword')} autoComplete="current-password" {...register('currentPassword')} error={!!formState.errors.currentPassword} helperText={formState.errors.currentPassword?.message} />
            <TextField type="password" label={t('auth.newPassword')} autoComplete="new-password" {...register('newPassword')} error={!!formState.errors.newPassword} helperText={formState.errors.newPassword?.message} />
            <TextField type="password" label={t('auth.confirmPassword')} autoComplete="new-password" {...register('confirmPassword')} error={!!formState.errors.confirmPassword} helperText={formState.errors.confirmPassword?.message} />
            <Typography variant="caption" color="text.secondary">
              {t('auth.passwordPolicyHint')}
            </Typography>
            <Box>
              <Button type="submit" variant="contained" disabled={formState.isSubmitting}>
                {t('common.save')}
              </Button>
            </Box>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
