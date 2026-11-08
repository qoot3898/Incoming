import { Fragment, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { registrationApi, registrationKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState, LoadingState, EmptyState } from '@/components/common/States';
import { SectionCard } from '@/components/common/SectionCard';
import { LocalDataGrid } from '@/components/tables/ServerDataGrid';
import { col } from '@/components/tables/columns';
import { useEnumOptions } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { ENUMS } from '@/constants/enums';
import { candidatesKeys, staffingKeys } from '@/features/staffing/api';
import { permitsKeys } from '@/features/permits/api';
import type { S } from '@/types/api';
import type { ApiError } from '@/services/api/errors';

type QueueItem = S<'RegistrationQueueItem'>;
type Options = S<'RegistrationOptions'>;
interface Row {
  candidateId: number;
  requestNumber: number;
  name: string;
  nationalityId: string;
  gender: string;
  maritalStatus: string;
  birthDate: string;
  birthPlaceId: string;
  passportNumber: string;
  nationalNumber: string;
  idCardNumber: string;
  phoneNumber: string;
  healthCertificateExpiryDate: string;
  departmentId: string;
}

function defaultsFor(q: QueueItem, o: Options): Row {
  const dept =
    o.defaultDepartments.find((d) => d.managementId === q.managementId && d.jobId === q.jobId)?.departmentId ??
    o.managementDepartments.find((d) => d.managementId === q.managementId)?.departmentId;
  const birth = o.defaultBirthPlaces.find((b) => b.nationalityId === q.nationalityId)?.birthPlaceId;
  return {
    candidateId: q.candidateId,
    requestNumber: q.requestNumber,
    name: q.name ?? '',
    nationalityId: String(q.nationalityId),
    gender: 'Male',
    maritalStatus: 'Single',
    birthDate: '',
    birthPlaceId: birth ? String(birth) : '',
    passportNumber: '',
    nationalNumber: '',
    idCardNumber: '',
    phoneNumber: '',
    healthCertificateExpiryDate: '',
    departmentId: dept ? String(dept) : '',
  };
}

export default function RegistrationPage() {
  const { t } = useTranslation();
  const enumOptions = useEnumOptions();
  const queue = useQuery({ queryKey: [...registrationKeys.all, 'queue'], queryFn: registrationApi.queue });
  const options = useQuery({ queryKey: [...registrationKeys.all, 'options'], queryFn: registrationApi.options, staleTime: 600_000 });
  const [selection, setSelection] = useState<(string | number)[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [serverError, setServerError] = useState<ApiError | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [result, setResult] = useState<S<'RegisteredWorker'>[] | null>(null);

  const register = useApiMutation(registrationApi.register, {
    invalidate: [registrationKeys.all, candidatesKeys.all, staffingKeys.all, permitsKeys.all],
    rethrow: true,
    success: t('registration.done'),
  });

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, t('validation.required')),
        nationalityId: z.string().min(1, t('validation.required')),
        gender: z.string().min(1, t('validation.required')),
        maritalStatus: z.string().min(1, t('validation.required')),
        nationalNumber: z.string().regex(/^\d*$/, t('validation.digits')),
      }),
    [t],
  );

  if (queue.isLoading || options.isLoading) return <LoadingState />;
  if (queue.error || options.error) return <ErrorState error={queue.error ?? options.error} />;
  const o = options.data!;
  const items = queue.data ?? [];
  const libyan = new Set(o.libyanNationalityIds);

  const start = () => {
    setResult(null);
    setServerError(null);
    setDuplicateWarning(false);
    const chosen = new Set(selection);
    setRows(items.filter((i) => chosen.has(i.candidateId)).map((i) => defaultsFor(i, o)));
  };

  const update = (idx: number, patch: Partial<Row>) => setRows((r) => (r ? r.map((x, i) => (i === idx ? { ...x, ...patch } : x)) : r));

  const submit = async (confirmDuplicates: boolean) => {
    if (!rows) return;
    const errs: Record<number, string> = {};
    rows.forEach((r, i) => {
      const res = schema.safeParse(r);
      if (!res.success) errs[i] = res.error.issues.map((x) => `${t(`registration.cols.${String(x.path[0])}`)}: ${x.message}`).join(' · ');
    });
    setRowErrors(errs);
    if (Object.keys(errs).length) return;
    setServerError(null);
    const num = (v: string) => (v ? Number(v) : null);
    const str = (v: string) => (v.trim() ? v.trim() : null);
    try {
      const res = await register.mutateAsync({
        confirmDuplicates,
        workers: rows.map((r) => ({
          candidateId: r.candidateId,
          name: r.name.trim(),
          nationalityId: num(r.nationalityId),
          gender: r.gender as S<'Gender'>,
          maritalStatus: r.maritalStatus as S<'MaritalStatus'>,
          birthDate: str(r.birthDate),
          birthPlaceId: num(r.birthPlaceId),
          passportNumber: str(r.passportNumber),
          nationalNumber: num(r.nationalNumber),
          idCardNumber: str(r.idCardNumber),
          phoneNumber: str(r.phoneNumber),
          healthCertificateExpiryDate: str(r.healthCertificateExpiryDate),
          departmentId: num(r.departmentId),
        })),
      });
      setResult(res);
      setRows(null);
      setSelection([]);
      setDuplicateWarning(false);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 409 && !confirmDuplicates) setDuplicateWarning(true);
      setServerError(err);
    }
  };

  const sel = (value: string, onChange: (v: string) => void, opts: { value: string | number; label: string }[], width = 150, allowEmpty = true) => (
    <TextField select value={value} onChange={(e) => onChange(e.target.value)} sx={{ minWidth: width }} size="small">
      {allowEmpty && (
        <MenuItem value="">
          <em>—</em>
        </MenuItem>
      )}
      {opts.map((x) => (
        <MenuItem key={String(x.value)} value={String(x.value)}>
          {x.label}
        </MenuItem>
      ))}
    </TextField>
  );
  const choice = (list: S<'RegistrationChoice'>[]) => list.map((c) => ({ value: c.id, label: c.name ?? String(c.number) }));

  return (
    <PageContainer>
      <PageHeader title={t('nav.items.registration')} />
      {result && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            {t('registration.resultTitle', { count: result.length })}
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {result.map((r) => (
              <RouterLink key={r.employeeId} to={`/workers/${r.employeeId}`}>
                {r.employeeNumber} — {r.name}
              </RouterLink>
            ))}
          </Stack>
        </Alert>
      )}
      {!rows ? (
        <SectionCard
          title={t('registration.queue')}
          action={
            <Button variant="contained" startIcon={<HowToRegOutlinedIcon />} disabled={selection.length === 0} onClick={start}>
              {t('registration.registerSelected', { count: selection.length })}
            </Button>
          }
          noPadding
        >
          {items.length === 0 ? (
            <EmptyState title={t('registration.empty')} />
          ) : (
            <LocalDataGrid<QueueItem>
              rows={items}
              getRowId={(r) => r.candidateId}
              checkboxSelection
              selection={selection}
              onSelectionChange={setSelection}
              columns={[
                col.text<QueueItem>('name', t('fields.name'), { minWidth: 180 }),
                col.text<QueueItem>('nationalityName', t('fields.nationality')),
                col.num<QueueItem>('requestNumber', t('staffing.number')),
                col.text<QueueItem>('trackName', t('fields.track')),
                col.text<QueueItem>('workSiteName', t('fields.workSite')),
                col.text<QueueItem>('jobName', t('fields.job')),
                col.dateTime<QueueItem>('approvedAt', t('candidates.approvedAt')),
              ]}
            />
          )}
        </SectionCard>
      ) : (
        <SectionCard title={t('registration.formTitle', { count: rows.length })} noPadding>
          <Box sx={{ p: 2 }}>
            {serverError && (
              <Alert severity={duplicateWarning ? 'warning' : 'error'} sx={{ mb: 2 }}>
                {serverError.detail || serverError.title}
                {duplicateWarning && <div>{t('registration.duplicateHint')}</div>}
              </Alert>
            )}
          </Box>
          <TableContainer sx={{ maxHeight: '65vh' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {['name', 'nationalityId', 'gender', 'maritalStatus', 'birthDate', 'birthPlaceId', 'passportNumber', 'nationalNumber', 'idCardNumber', 'phoneNumber', 'healthCertificateExpiryDate', 'departmentId'].map((c) => (
                    <TableCell key={c}>{t(`registration.cols.${c}`)}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, i) => {
                  const isLibyan = libyan.has(Number(r.nationalityId));
                  return (
                    <Fragment key={r.candidateId}>
                      <TableRow sx={{ '& td': { borderBottom: rowErrors[i] ? 0 : undefined } }}>
                        <TableCell>
                          <TextField size="small" value={r.name} onChange={(e) => update(i, { name: e.target.value })} sx={{ minWidth: 180 }} error={!r.name.trim()} />
                        </TableCell>
                        <TableCell>{sel(r.nationalityId, (v) => update(i, { nationalityId: v }), choice(o.nationalities), 150, false)}</TableCell>
                        <TableCell>{sel(r.gender, (v) => update(i, { gender: v }), enumOptions('Gender', ENUMS.Gender), 100, false)}</TableCell>
                        <TableCell>{sel(r.maritalStatus, (v) => update(i, { maritalStatus: v }), enumOptions('MaritalStatus', ENUMS.MaritalStatus), 130, false)}</TableCell>
                        <TableCell>
                          <TextField size="small" type="date" value={r.birthDate} onChange={(e) => update(i, { birthDate: e.target.value })} />
                        </TableCell>
                        <TableCell>{sel(r.birthPlaceId, (v) => update(i, { birthPlaceId: v }), choice(o.cities), 140)}</TableCell>
                        <TableCell>
                          <TextField size="small" value={r.passportNumber} onChange={(e) => update(i, { passportNumber: e.target.value })} sx={{ minWidth: 120 }} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" value={r.nationalNumber} onChange={(e) => update(i, { nationalNumber: e.target.value })} sx={{ minWidth: 130 }} placeholder={isLibyan ? t('registration.libyanHint') : ''} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" value={r.idCardNumber} onChange={(e) => update(i, { idCardNumber: e.target.value })} sx={{ minWidth: 110 }} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" value={r.phoneNumber} onChange={(e) => update(i, { phoneNumber: e.target.value })} sx={{ minWidth: 120 }} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="date" value={r.healthCertificateExpiryDate} onChange={(e) => update(i, { healthCertificateExpiryDate: e.target.value })} />
                        </TableCell>
                        <TableCell>{sel(r.departmentId, (v) => update(i, { departmentId: v }), choice(o.departments), 150)}</TableCell>
                      </TableRow>
                      {rowErrors[i] && (
                        <TableRow>
                          <TableCell colSpan={12} sx={{ color: 'error.main', fontSize: '0.75rem', pt: 0 }}>
                            {rowErrors[i]}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Paper square elevation={0} sx={{ p: 2, display: 'flex', gap: 1, borderTop: 1, borderColor: 'divider', flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={() => submit(false)} disabled={register.isPending}>
              {register.isPending ? t('common.saving') : t('registration.submit', { count: rows.length })}
            </Button>
            {duplicateWarning && (
              <Button variant="contained" color="warning" onClick={() => submit(true)} disabled={register.isPending}>
                {t('registration.confirmDuplicates')}
              </Button>
            )}
            <Button color="inherit" onClick={() => setRows(null)}>
              {t('common.back')}
            </Button>
          </Paper>
        </SectionCard>
      )}
    </PageContainer>
  );
}
