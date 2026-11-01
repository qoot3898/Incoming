import { useState } from 'react';
import { Box, Button, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminKeys, settingsApi } from '../api';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/States';
import { SectionCard } from '@/components/common/SectionCard';
import { useApiMutation } from '@/hooks/useApiMutation';
import { formatDateTime } from '@/utils/format';
import type { S } from '@/types/api';

type Item = S<'SettingItem'>;

function kindOf(valueType?: string | null): 'bool' | 'number' | 'text' {
  const v = (valueType ?? '').toLowerCase();
  if (v.includes('bool')) return 'bool';
  if (/(int|decimal|double|number|float|long|short)/.test(v)) return 'number';
  return 'text';
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const query = useQuery({ queryKey: adminKeys.settings, queryFn: settingsApi.list });
  return (
    <Box>
      <PageHeader title={t('nav.items.settings')} subtitle={t('settings.subtitle')} />
      <QueryBoundary query={query}>
        {(groups) => (
          <Stack spacing={3}>
            {groups.map((g) => (
              <SettingGroup key={g.code} group={g} />
            ))}
          </Stack>
        )}
      </QueryBoundary>
    </Box>
  );
}

function SettingGroup({ group }: { group: S<'SettingGroupItem'> }) {
  const { t } = useTranslation();
  const initial = Object.fromEntries(group.items.map((i) => [i.key ?? '', i.value ?? ''])) as Record<string, string>;
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useApiMutation((v: S<'UpdateSettingsRequest'>) => settingsApi.update(group.code ?? '', v), { invalidate: [adminKeys.settings] });
  const dirty = Object.keys(values).some((k) => values[k] !== initial[k]);

  const validate = (i: Item, v: string): string | null => {
    const c = i.constraint;
    if (c.required && !v.trim()) return t('validation.required');
    if (kindOf(i.valueType) === 'number' && v.trim()) {
      const n = Number(v);
      if (Number.isNaN(n)) return t('validation.number');
      if (c.min !== null && c.min !== undefined && n < c.min) return t('validation.min', { min: c.min });
      if (c.max !== null && c.max !== undefined && n > c.max) return t('validation.max', { max: c.max });
    }
    if (c.maxLength && v.length > c.maxLength) return t('validation.maxLength', { max: c.maxLength });
    return null;
  };

  const submit = () => {
    const errs: Record<string, string> = {};
    group.items.forEach((i) => {
      const e = validate(i, values[i.key ?? ''] ?? '');
      if (e) errs[i.key ?? ''] = e;
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const payload: Record<string, unknown> = {};
    group.items.forEach((i) => {
      const k = i.key ?? '';
      const raw = values[k];
      const kind = kindOf(i.valueType);
      payload[k] = kind === 'number' ? (raw === '' ? null : Number(raw)) : kind === 'bool' ? raw === 'true' : raw;
    });
    save.mutate({ values: payload });
  };

  return (
    <SectionCard
      title={group.name}
      action={
        <Button size="small" variant="contained" disabled={!dirty || save.isPending} onClick={submit}>
          {t('common.save')}
        </Button>
      }
    >
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {group.items.map((i) => {
          const k = i.key ?? '';
          const kind = kindOf(i.valueType);
          const help = [k, i.updatedAt ? t('settings.updatedAt', { date: formatDateTime(i.updatedAt) }) : null].filter(Boolean).join(' · ');
          return (
            <Box key={k}>
              {kind === 'bool' ? (
                <>
                  <FormControlLabel control={<Switch checked={values[k] === 'true'} onChange={(e) => setValues((v) => ({ ...v, [k]: String(e.target.checked) }))} />} label={i.description ?? k} />
                  <Typography variant="caption" color="text.secondary" display="block">
                    {help}
                  </Typography>
                </>
              ) : (
                <TextField
                  label={i.description || k}
                  value={values[k] ?? ''}
                  type={kind === 'number' ? 'number' : 'text'}
                  onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
                  error={!!errors[k]}
                  helperText={errors[k] ?? help}
                  required={i.constraint.required}
                  slotProps={{ htmlInput: { min: i.constraint.min ?? undefined, max: i.constraint.max ?? undefined, maxLength: i.constraint.maxLength ?? undefined } }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </SectionCard>
  );
}
