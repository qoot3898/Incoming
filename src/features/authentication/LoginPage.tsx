import { useState } from 'react';
import { Alert, Box, Button, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/app/providers/authContext';
import { toApiError } from '@/services/api/errors';
import { BrandMark } from '@/components/layout/BrandMark';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { brand, onTeal } from '@/app/theme/brand';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, status, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sp] = useSearchParams();
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schema = z.object({
    userName: z.string().trim().min(1, t('validation.required')),
    password: z.string().min(1, t('validation.required')),
  });
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { userName: '', password: '' } });

  const from = (location.state as { from?: string } | null)?.from ?? '/';
  if (status === 'authenticated') return <Navigate to={from} replace />;

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      const user = await login(v.userName, v.password);
      navigate(user.mustChangePassword ? '/change-password' : from, { replace: true });
    } catch (e) {
      const err = await toApiError(e, t('auth.loginFailed'));
      setError(err.status === 401 || err.status === 400 ? err.detail || t('auth.invalidCredentials') : err.detail || err.title);
    }
  });

  const expired = sessionExpired || sp.get('expired') === '1';

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, bgcolor: 'background.default' }}>
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          bgcolor: brand.teal,
          color: brand.cream,
          p: 6,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <BrandMark size={44} />
          <Typography variant="h6" fontWeight={700}>
            {t('app.company')}
          </Typography>
        </Stack>
        <Box sx={{ maxWidth: 460, position: 'relative', zIndex: 1 }}>
          <Typography variant="h4" sx={{ fontSize: '2.1rem', lineHeight: 1.35, mb: 2 }}>
            {t('app.name')}
          </Typography>
          <Typography sx={{ color: onTeal.text, lineHeight: 1.9 }}>{t('auth.tagline')}</Typography>
        </Box>
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            insetInlineEnd: -120,
            bottom: -120,
            width: 420,
            height: 420,
            borderRadius: '50% 50% 0 50%',
            border: `56px solid ${brand.leaf}`,
            opacity: 0.18,
          }}
        />
        <Typography variant="caption" sx={{ color: onTeal.textFaint }}>
          TL-SRS v2.0
        </Typography>
      </Box>

      <Stack alignItems="center" justifyContent="center" sx={{ p: { xs: 2, sm: 4 } }}>
        <Box sx={{ alignSelf: 'flex-end', mb: 2 }}>
          <LanguageSwitcher persistToServer={false} />
        </Box>
        <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 }, width: '100%', maxWidth: 420 }}>
          <Stack spacing={1} sx={{ mb: 3 }}>
            <Box sx={{ display: { md: 'none' } }}>
              <BrandMark size={40} />
            </Box>
            <Typography variant="h5" component="h1">
              {t('auth.signInTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('auth.signInSubtitle')}
            </Typography>
          </Stack>
          <form onSubmit={onSubmit} noValidate>
            <Stack spacing={2}>
              {expired && !error && <Alert severity="warning">{t('auth.sessionExpired')}</Alert>}
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label={t('auth.userName')}
                autoComplete="username"
                autoFocus
                {...register('userName')}
                error={!!formState.errors.userName}
                helperText={formState.errors.userName?.message}
                size="medium"
              />
              <TextField
                label={t('auth.password')}
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                {...register('password')}
                error={!!formState.errors.password}
                helperText={formState.errors.password?.message}
                size="medium"
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShow((s) => !s)} edge="end" aria-label={t('auth.togglePassword')}>
                          {show ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Button type="submit" variant="contained" size="large" disabled={formState.isSubmitting}>
                {formState.isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
              </Button>
            </Stack>
          </form>
        </Paper>
      </Stack>
    </Box>
  );
}
