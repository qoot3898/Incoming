import { useMemo } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/app/providers/authContext';
import { authApi } from './api';
import { useSnackbar } from '@/app/providers/snackbarContext';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { FormTextField } from '@/components/forms/fields';
import { FormActions, FormCard, FormErrorAlert, FormSection } from '@/components/forms/FormLayout';
import { useFormServerError } from '@/components/forms/useFormServerError';

const DEFAULTS = { currentPassword: '', newPassword: '', confirmPassword: '' };
const FIELDS = Object.keys(DEFAULTS);

export default function ChangePasswordPage() {
  const { t } = useTranslation();
  const { user, reload } = useAuth();
  const { notify } = useSnackbar();
  const navigate = useNavigate();
  const schema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(1, t('validation.required')),
          newPassword: z.string().min(1, t('validation.required')),
          confirmPassword: z.string().min(1, t('validation.required')),
        })
        .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: t('validation.passwordMismatch') }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const { control, handleSubmit, formState, setError } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });
  const { serverError, handleServerError, clearServerError } = useFormServerError((field, message) => setError(field as keyof Values, { type: 'server', message }), FIELDS);

  const onSubmit = handleSubmit(async (v) => {
    clearServerError();
    try {
      await authApi.changePassword(v);
      await reload();
      notify(t('auth.passwordChanged'));
      navigate('/', { replace: true });
    } catch (e) {
      await handleServerError(e);
    }
  });

  return (
    <PageContainer width="narrow">
      <PageHeader title={t('auth.changePassword')} />
      <FormCard>
        <form onSubmit={onSubmit} noValidate>
          <Stack spacing={2.5}>
            {user?.mustChangePassword && <Alert severity="warning">{t('auth.mustChangePassword')}</Alert>}
            <FormErrorAlert value={serverError} />
            <FormSection columns={1}>
              <FormTextField control={control} name="currentPassword" type="password" label={t('auth.currentPassword')} autoComplete="current-password" required />
              <FormTextField control={control} name="newPassword" type="password" label={t('auth.newPassword')} autoComplete="new-password" required />
              <FormTextField control={control} name="confirmPassword" type="password" label={t('auth.confirmPassword')} autoComplete="new-password" required />
            </FormSection>
            <Typography variant="caption" color="text.secondary">
              {t('auth.passwordPolicyHint')}
            </Typography>
            <FormActions
              submitLabel={t('common.save')}
              submitting={formState.isSubmitting}
              onCancel={user?.mustChangePassword ? undefined : () => navigate('/')}
            />
          </Stack>
        </form>
      </FormCard>
    </PageContainer>
  );
}
