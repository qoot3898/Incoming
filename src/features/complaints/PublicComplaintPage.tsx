import { useMemo, useState } from 'react';
import { Alert, AlertTitle, Box, Button, Link, Paper, Stack, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StandaloneLayout } from '@/components/layout/StandaloneLayout';
import { FormTextField } from '@/components/forms/fields';
import { FormActions, FormErrorAlert, FormSection, FullRow } from '@/components/forms/FormLayout';
import { useFormServerError } from '@/components/forms/useFormServerError';
import { toApiError } from '@/services/api/errors';
import { brand } from '@/app/theme/brand';
import { publicComplaintsApi } from './api';
import { normalizePhone, phoneProblem, PHONE_MAX_DIGITS, PHONE_MIN_DIGITS } from './phone';

const DEFAULTS = { complainantName: '', complainantPhone: '', respondentName: '', details: '', location: '' };
const FIELDS = Object.keys(DEFAULTS);

/**
 * Public complaint form (TL-N1): no sign-in. The API rate-limits submissions per device and caps
 * the body at 16 KB; the complainant receives the complaint number on success.
 */
export default function PublicComplaintPage() {
  const { t } = useTranslation();
  const [submittedId, setSubmittedId] = useState<number | null>(null);

  return (
    <StandaloneLayout
      actions={
        <Button component={RouterLink} to="/login" color="inherit" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
          {t('complaints.staffSignIn')}
        </Button>
      }
    >
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">
          {t('complaints.publicTitle')}
        </Typography>
        {submittedId === null ? <ComplaintForm onSubmitted={setSubmittedId} /> : <Submitted id={submittedId} onAnother={() => setSubmittedId(null)} />}
      </Stack>
    </StandaloneLayout>
  );
}

function Submitted({ id, onAnother }: { id: number; onAnother: () => void }) {
  const { t } = useTranslation();
  return (
    <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }} role="status" aria-live="polite">
      <Box sx={{ color: brand.leafDark, '& svg': { fontSize: 56 } }}>
        <CheckCircleOutlineIcon />
      </Box>
      <Typography variant="h6" sx={{ mt: 1 }}>
        {t('complaints.submittedTitle')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {t('complaints.yourNumber')}
      </Typography>
      <Typography variant="h3" component="p" sx={{ my: 1.5, fontWeight: 700, color: brand.teal, direction: 'ltr' }}>
        {id}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t('complaints.keepNumber')}
      </Typography>
      <Button variant="outlined" sx={{ mt: 3 }} onClick={onAnother}>
        {t('complaints.submitAnother')}
      </Button>
    </Paper>
  );
}

function ComplaintForm({ onSubmitted }: { onSubmitted: (id: number) => void }) {
  const { t } = useTranslation();
  const [notice, setNotice] = useState<'rateLimited' | 'tooLarge' | null>(null);
  const schema = useMemo(
    () =>
      z.object({
        complainantName: z.string().trim().min(1, t('validation.required')).max(100, t('validation.maxLength', { max: 100 })),
        complainantPhone: z
          .string()
          .trim()
          .min(1, t('validation.required'))
          .superRefine((v, ctx) => {
            const problem = phoneProblem(v);
            if (problem) ctx.addIssue({ code: 'custom', message: t(`complaints.phone.${problem}`, { min: PHONE_MIN_DIGITS, max: PHONE_MAX_DIGITS }) });
          }),
        respondentName: z.string().trim().min(1, t('validation.required')).max(100, t('validation.maxLength', { max: 100 })),
        details: z.string().trim().min(1, t('validation.required')).max(2000, t('validation.maxLength', { max: 2000 })),
        location: z.string().trim().max(200, t('validation.maxLength', { max: 200 })),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const { control, handleSubmit, setError, formState, reset } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });
  const { serverError, handleServerError, clearServerError } = useFormServerError((field, message) => setError(field as keyof Values, { type: 'server', message }), FIELDS);

  const onSubmit = handleSubmit(async (v) => {
    clearServerError();
    setNotice(null);
    try {
      const { id } = await publicComplaintsApi.submit({
        complainantName: v.complainantName,
        complainantPhone: normalizePhone(v.complainantPhone),
        respondentName: v.respondentName,
        details: v.details,
        location: v.location || null,
      });
      reset(DEFAULTS);
      onSubmitted(id);
    } catch (e) {
      const err = await toApiError(e, t('errors.generic'));
      if (err.status === 429) return setNotice('rateLimited');
      if (err.status === 413) return setNotice('tooLarge');
      await handleServerError(err);
    }
  });

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <form onSubmit={onSubmit} noValidate>
        <Stack spacing={3}>
          {notice && (
            <Alert severity="warning">
              <AlertTitle>{t(`complaints.${notice}Title`)}</AlertTitle>
              {t(`complaints.${notice}`)}
            </Alert>
          )}
          <FormErrorAlert value={serverError} />
          <FormSection title={t('complaints.sections.complainant')}>
            <FormTextField control={control} name="complainantName" label={t('complaints.complainantName')} required autoComplete="name" slotProps={{ htmlInput: { maxLength: 100 } }} />
            <FormTextField
              control={control}
              name="complainantPhone"
              label={t('complaints.complainantPhone')}
              required
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              helperText={t('complaints.phoneHint')}
              slotProps={{ htmlInput: { dir: 'ltr', maxLength: 30 } }}
            />
          </FormSection>
          <FormSection title={t('complaints.sections.complaint')}>
            <FormTextField control={control} name="respondentName" label={t('complaints.respondentName')} required slotProps={{ htmlInput: { maxLength: 100 } }} />
            <FormTextField control={control} name="location" label={t('complaints.location')} slotProps={{ htmlInput: { maxLength: 200 } }} />
            <FullRow>
              <FormTextField control={control} name="details" label={t('complaints.details')} required multiline minRows={5} fullWidth slotProps={{ htmlInput: { maxLength: 2000 } }} />
            </FullRow>
          </FormSection>
          <FormActions submitLabel={t('complaints.submit')} submitting={formState.isSubmitting} />
          <Typography variant="caption" color="text.secondary" sx={{ display: { sm: 'none' } }}>
            <Link component={RouterLink} to="/login">
              {t('complaints.staffSignIn')}
            </Link>
          </Typography>
        </Stack>
      </form>
    </Paper>
  );
}
