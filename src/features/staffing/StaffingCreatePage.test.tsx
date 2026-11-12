import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import StaffingCreatePage from './StaffingCreatePage';
import { candidatesApi, staffingApi } from './api';
import type { PoolCandidate } from '@/features/candidates/candidateSearch';

const options = vi.hoisted(() => ({
  loading: false,
  tracks: [{ value: 3, label: 'التموين' }],
  sites: [{ value: 8, label: '8 — المطبخ المركزي' }],
  allWorkSites: [],
  jobs: [
    { value: 5, label: 'طباخ' },
    { value: 6, label: 'سائق' },
  ],
  nationalities: [
    { value: 2, label: 'مصر' },
    { value: 4, label: 'تشاد' },
  ],
  managements: [],
  scopeEmpty: false,
}));
vi.mock('@/features/shared/options', () => ({ useScopeOptions: () => options }));
vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return { ...actual, staffingApi: { submit: vi.fn() }, candidatesApi: { list: vi.fn() } };
});

const adam = { id: 41, name: 'آدم عيسى', nationalityName: 'تشاد', phone: null } as PoolCandidate;
const MANAGE = 'TemporaryLabor.ManageCandidates';

/** Picks `option` in the MUI select labelled `label`. */
async function choose(label: string | RegExp, option: string) {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: label }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

async function fillRequest() {
  await choose(/^المسار/, 'التموين');
  await choose(/^الموقع/, '8 — المطبخ المركزي');
  await choose(/^المهنة/, 'طباخ');
  fireEvent.change(screen.getByLabelText(/العدد المطلوب/), { target: { value: '2' } });
  await choose(/^السبب/, 'احتياج قائم');
  fireEvent.change(screen.getByLabelText(/تاريخ البدء المطلوب/), { target: { value: '2026-11-20' } });
  fireEvent.change(screen.getByLabelText(/المبررات/), { target: { value: 'نقص في المطبخ' } });
}
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'إرسال الطلب' }));

describe('create staffing request with candidates (TL-N13)', () => {
  it('hides the candidates section from a user who does not keep the candidate list', () => {
    renderWithProviders(<StaffingCreatePage />, { permissions: ['TemporaryLabor.ManageRequests'] });
    expect(screen.queryByText('المرشحون')).toBeNull();
    expect(screen.queryByRole('button', { name: 'مرشح جديد' })).toBeNull();
  });

  it('submits a request without candidates exactly as before', async () => {
    vi.mocked(staffingApi.submit).mockResolvedValue({ id: 1 });
    renderWithProviders(<StaffingCreatePage />, { permissions: ['TemporaryLabor.ManageRequests'] });
    await fillRequest();
    submit();
    await waitFor(() => expect(staffingApi.submit).toHaveBeenCalledTimes(1));
    const body = vi.mocked(staffingApi.submit).mock.calls[0][0];
    expect(body).toMatchObject({ trackId: 3, workSiteId: 8, jobId: 5, count: 2, reason: 'CurrentNeed', requiredStartDate: '2026-11-20' });
    expect(body.candidateIds ?? null).toBeNull();
    expect(body.newCandidates ?? null).toBeNull();
  });

  it('sends the candidates picked from the list and the new ones, each new one for the request job', async () => {
    vi.mocked(staffingApi.submit).mockResolvedValue({ id: 2 });
    vi.mocked(candidatesApi.list).mockResolvedValue({ items: [adam], total: 1, page: 1, pageSize: 20 } as never);
    renderWithProviders(<StaffingCreatePage />, { permissions: ['TemporaryLabor.ManageRequests', MANAGE] });
    await fillRequest();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'مرشحون من القائمة' }));
    fireEvent.click(await screen.findByText('آدم عيسى — تشاد'));
    // The picker's list was narrowed to the request's job when it was chosen.
    await waitFor(() => expect(vi.mocked(candidatesApi.list).mock.calls.at(-1)![0]).toMatchObject({ PoolStatus: 'Available', JobId: 5 }));

    fireEvent.click(screen.getByRole('button', { name: 'مرشح جديد' }));
    const row = screen.getByText('مرشح جديد 1').closest('div[class*="MuiPaper"]') as HTMLElement;
    fireEvent.change(within(row).getByLabelText(/^الاسم/), { target: { value: ' سالم علي ' } });
    await choose(/^الجنسية/, 'مصر');
    await choose(/^جهة الاستقطاب/, 'قسم العمالة المؤقتة');
    fireEvent.change(within(row).getByLabelText(/رقم الهاتف/), { target: { value: '0920000000' } });

    submit();
    await waitFor(() => expect(staffingApi.submit).toHaveBeenCalledTimes(1));
    const body = vi.mocked(staffingApi.submit).mock.calls[0][0];
    expect(body.candidateIds).toEqual([41]);
    expect(body.newCandidates).toEqual([{ name: 'سالم علي', nationalityId: 2, recruitedBy: 'LaborSection', phone: '0920000000', nominatedBy: null, jobId: 5, notes: null }]);
  });

  it('does not submit while a new candidate lacks its required fields', async () => {
    renderWithProviders(<StaffingCreatePage />, { permissions: ['TemporaryLabor.ManageRequests', MANAGE] });
    vi.mocked(candidatesApi.list).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 } as never);
    await fillRequest();
    fireEvent.click(screen.getByRole('button', { name: 'مرشح جديد' }));
    submit();
    expect((await screen.findAllByText('هذا الحقل مطلوب')).length).toBeGreaterThanOrEqual(3);
    expect(staffingApi.submit).not.toHaveBeenCalled();
  });

  it("shows the API's reason next to the new candidate's field and keeps what was entered", async () => {
    const { AxiosError } = await import('axios');
    const rejected = new AxiosError('bad', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 400,
      data: { title: 'Validation', code: 'VALIDATION_FAILED', errors: { 'NewCandidates[0].NationalityId': ['الجنسية غير صالحة.'] } },
    } as never);
    vi.mocked(staffingApi.submit).mockRejectedValue(rejected);
    vi.mocked(candidatesApi.list).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 } as never);
    renderWithProviders(<StaffingCreatePage />, { permissions: ['TemporaryLabor.ManageRequests', MANAGE] });
    await fillRequest();
    fireEvent.click(screen.getByRole('button', { name: 'مرشح جديد' }));
    const row = screen.getByText('مرشح جديد 1').closest('div[class*="MuiPaper"]') as HTMLElement;
    fireEvent.change(within(row).getByLabelText(/^الاسم/), { target: { value: 'سالم علي' } });
    await choose(/^الجنسية/, 'مصر');
    await choose(/^جهة الاستقطاب/, 'قسم العمالة المؤقتة');
    submit();
    expect(await screen.findByText('الجنسية غير صالحة.')).toBeTruthy();
    expect((within(row).getByLabelText(/^الاسم/) as HTMLInputElement).value).toBe('سالم علي');
  });
});
