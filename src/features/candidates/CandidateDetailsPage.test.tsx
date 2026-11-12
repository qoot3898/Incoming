import { AxiosError } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import CandidateDetailsPage from './CandidateDetailsPage';
import { candidatesApi } from '@/features/staffing/api';
import type { S } from '@/types/api';

const options = vi.hoisted(() => ({
  loading: false,
  tracks: [],
  sites: [],
  allWorkSites: [],
  jobs: [{ value: 5, label: '5 — طباخ' }],
  jobIdByName: (name: string | null | undefined) => (name === 'طباخ' ? 5 : null),
  nationalities: [{ value: 3, label: 'تشاد' }],
  managements: [],
  scopeEmpty: false,
}));
vi.mock('@/features/shared/options', () => ({ useScopeOptions: () => options }));
vi.mock('@/features/staffing/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/staffing/api')>();
  return { ...actual, candidatesApi: { get: vi.fn(), update: vi.fn(), withdraw: vi.fn(), restore: vi.fn(), nominate: vi.fn() } };
});

const card = (over: Partial<S<'CandidateDetails'>> = {}) =>
  ({
    id: 41,
    name: 'آدم عيسى',
    nationalityId: 3,
    nationalityName: 'تشاد',
    nominatedBy: 'عامل حالي',
    recruitedBy: 'LaborSection',
    phone: '0912345678',
    jobId: 5,
    jobName: 'طباخ',
    notes: null,
    poolStatus: 'Available',
    withdrawnAt: null,
    withdrawalReason: null,
    employeeId: null,
    employeeNumber: null,
    createdAt: '2026-11-10T09:00:00',
    createdBy: 'منى',
    rowVersion: 'AAAAAAAAB9E=',
    documents: [],
    nominations: [],
    canEdit: true,
    canWithdraw: true,
    canRestore: false,
    canNominate: true,
    ...over,
  }) as S<'CandidateDetails'>;

const show = (details: S<'CandidateDetails'>, permissions: string[] = [], notify = vi.fn()) => {
  vi.mocked(candidatesApi.get).mockResolvedValue(details);
  return renderWithProviders(<CandidateDetailsPage />, { url: '/candidates/41', path: '/candidates/:candidateId', permissions, notify });
};
const button = (name: string) => screen.queryByRole('button', { name });

describe('candidate card (TL-N13)', () => {
  it('offers exactly the actions the API allows for an available candidate', async () => {
    show(card());
    expect(await screen.findByRole('heading', { name: 'آدم عيسى' })).toBeTruthy();
    expect(button('ترشيح على طلب')).toBeTruthy();
    expect(button('تعديل البيانات')).toBeTruthy();
    expect(button('سحب من القائمة')).toBeTruthy();
    expect(button('إعادة إلى القائمة')).toBeNull();
  });

  it('a withdrawn candidate can only be restored, and the reason is shown', async () => {
    show(card({ poolStatus: 'Withdrawn', withdrawalReason: 'سافر خارج البلاد', withdrawnAt: '2026-11-11T08:00:00', canEdit: false, canWithdraw: false, canNominate: false, canRestore: true }));
    expect(await screen.findByText('سافر خارج البلاد')).toBeTruthy();
    expect(button('إعادة إلى القائمة')).toBeTruthy();
    expect(button('سحب من القائمة')).toBeNull();
    expect(button('ترشيح على طلب')).toBeNull();
    expect(button('تعديل البيانات')).toBeNull();
  });

  it('shows no action to a user who may only view him, and does not decide it from the status', async () => {
    show(card({ poolStatus: 'Available', canEdit: false, canWithdraw: false, canRestore: false, canNominate: false }));
    await screen.findByRole('heading', { name: 'آدم عيسى' });
    for (const name of ['ترشيح على طلب', 'تعديل البيانات', 'سحب من القائمة', 'إعادة إلى القائمة']) expect(button(name)).toBeNull();
  });

  it('nominates him on the request number the user enters', async () => {
    vi.mocked(candidatesApi.nominate).mockResolvedValue(undefined);
    const notify = vi.fn();
    show(card(), [], notify);
    fireEvent.click(await screen.findByRole('button', { name: 'ترشيح على طلب' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/رقم طلب الاحتياج/), { target: { value: '15' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'ترشيح على طلب' }));
    await waitFor(() => expect(candidatesApi.nominate).toHaveBeenCalledWith(15, { candidateIds: [41] }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('رُشِّح المرشح على الطلب رقم 15', 'success'));
  });

  it('withdraws him only with a reason', async () => {
    vi.mocked(candidatesApi.withdraw).mockResolvedValue(undefined);
    show(card());
    fireEvent.click(await screen.findByRole('button', { name: 'سحب من القائمة' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'سحب من القائمة' }));
    await within(dialog).findByText('هذا الحقل مطلوب');
    expect(candidatesApi.withdraw).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(/سبب السحب/), { target: { value: 'سافر خارج البلاد' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'سحب من القائمة' }));
    await waitFor(() => expect(candidatesApi.withdraw).toHaveBeenCalledWith(41, { reason: 'سافر خارج البلاد' }));
  });

  it('sends the row version with a correction, and on a conflict shows the current data instead of overwriting it', async () => {
    // A real axios error, as the API client throws it: the mutation reads the problem code from the response body.
    const conflict = new AxiosError('conflict', 'ERR_BAD_REQUEST', undefined, undefined, { status: 409, data: { title: 'conflict', code: 'CONCURRENCY_CONFLICT' } } as never);
    vi.mocked(candidatesApi.update).mockRejectedValue(conflict);
    const notify = vi.fn();
    show(card(), [], notify);
    fireEvent.click(await screen.findByRole('button', { name: 'تعديل البيانات' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/الهاتف|رقم الهاتف/), { target: { value: '0920000000' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(candidatesApi.update).toHaveBeenCalledTimes(1));
    expect(vi.mocked(candidatesApi.update).mock.calls[0][0]).toBe(41);
    expect(vi.mocked(candidatesApi.update).mock.calls[0][1]).toMatchObject({ rowVersion: 'AAAAAAAAB9E=', phone: '0920000000', name: 'آدم عيسى', nationalityId: 3 });
    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.stringContaining('عُدّلت بيانات المرشح'), 'warning'));
    // The card is re-read after the conflict.
    await waitFor(() => expect(vi.mocked(candidatesApi.get).mock.calls.length).toBeGreaterThan(1));
  });

  it('opens the attached copies only for users who register workers', async () => {
    const docs = [{ kind: 'Passport', fileName: 'passport.pdf', size: 1024, attachedAt: '2026-11-10T10:00:00' }] as S<'CandidateDetails'>['documents'];
    const { unmount } = show(card({ documents: docs }));
    expect(await screen.findByText('نسخة الجواز')).toBeTruthy();
    expect(button('فتح')).toBeNull();
    unmount();
    show(card({ documents: docs }), ['TemporaryLabor.RegisterWorkers']);
    expect(await screen.findByRole('button', { name: 'فتح' })).toBeTruthy();
  });
});
