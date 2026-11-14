import { AxiosError } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { CandidatesPanel } from './CandidatesPanel';
import { candidatesApi } from './api';
import type { PoolCandidate } from '@/features/candidates/candidateSearch';
import type { S } from '@/types/api';

const options = vi.hoisted(() => ({
  loading: false,
  tracks: [],
  sites: [],
  allWorkSites: [],
  jobs: [{ value: 5, label: '5 — طباخ' }],
  jobIdByName: (name: string | null | undefined) => (name === 'طباخ' ? 5 : null),
  nationalities: [{ value: 2, label: 'مصر' }],
  managements: [],
  scopeEmpty: false,
}));
vi.mock('@/features/shared/options', () => ({ useScopeOptions: () => options }));
vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return { ...actual, candidatesApi: { forRequest: vi.fn(), list: vi.fn(), add: vi.fn(), nominate: vi.fn(), cancel: vi.fn(), interview: vi.fn() } };
});

const adam = { id: 41, name: 'آدم عيسى', nationalityName: 'تشاد', phone: null } as PoolCandidate;
const requestCandidates = (over: Partial<S<'RequestCandidates'>>) =>
  ({ number: 15, count: 2, approvedCount: 0, status: 'PendingOperations', acceptsCandidates: false, canAdd: true, canInterview: false, interviewCriterion: null, candidates: [], ...over }) as S<'RequestCandidates'>;
const show = (rc: S<'RequestCandidates'>) => {
  vi.mocked(candidatesApi.forRequest).mockResolvedValue(rc);
  vi.mocked(candidatesApi.list).mockResolvedValue({ items: [adam], total: 1, page: 1, pageSize: 20 } as never);
  return renderWithProviders(<CandidatesPanel requestNumber={15} jobName="طباخ" />);
};

describe('nominations on a request (TL-N13)', () => {
  it('lets the user nominate as soon as the request is submitted, and says interviews wait for approval', async () => {
    show(requestCandidates({ status: 'PendingOperations', canAdd: true, acceptsCandidates: false }));
    expect(await screen.findByRole('button', { name: 'ترشيح من القائمة' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'مرشح جديد' })).toBeTruthy();
    expect(screen.getByText('تبدأ المقابلات باعتماد الطلب؛ ويجوز الترشيح من الآن.')).toBeTruthy();
  });

  it('offers no nomination and says why once the request is rejected, closed or filled', async () => {
    show(requestCandidates({ status: 'Filled', canAdd: false, acceptsCandidates: false }));
    expect(await screen.findByText('لا يقبل الطلب مرشحين الآن (رُفض أو أُغلق أو اكتمل عدده).')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'ترشيح من القائمة' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'مرشح جديد' })).toBeNull();
  });

  it('nominates the candidates chosen from the list on this request', async () => {
    vi.mocked(candidatesApi.nominate).mockResolvedValue(undefined);
    show(requestCandidates({}));
    fireEvent.click(await screen.findByRole('button', { name: 'ترشيح من القائمة' }));
    const dialog = await screen.findByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: 'ترشيح على طلب' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    // The list starts narrowed to the request's job, found by name in the directory.
    await waitFor(() => expect(vi.mocked(candidatesApi.list).mock.calls.at(-1)![0]).toMatchObject({ PoolStatus: 'Available', JobId: 5 }));
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'مرشحون من القائمة' }));
    fireEvent.click(await screen.findByText('آدم عيسى — تشاد'));
    await waitFor(() => expect((within(dialog).getByRole('button', { name: 'ترشيح على طلب' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(within(dialog).getByRole('button', { name: 'ترشيح على طلب' }));
    await waitFor(() => expect(candidatesApi.nominate).toHaveBeenCalledWith(15, { candidateIds: [41] }));
  });

  it('shows the reason per candidate when the API refuses the nomination, and keeps the choice', async () => {
    const refused = new AxiosError('bad', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 400,
      data: { title: 'Validation', code: 'VALIDATION_FAILED', errors: { CandidateIds: ['المرشح آدم عيسى مرشح على طلب احتياج آخر؛ يُلغى ترشيحه هناك أولاً.'] } },
    } as never);
    vi.mocked(candidatesApi.nominate).mockRejectedValue(refused);
    show(requestCandidates({}));
    fireEvent.click(await screen.findByRole('button', { name: 'ترشيح من القائمة' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'مرشحون من القائمة' }));
    fireEvent.click(await screen.findByText('آدم عيسى — تشاد'));
    fireEvent.click(await waitFor(() => within(dialog).getByRole('button', { name: 'ترشيح على طلب' })));
    expect(await within(dialog).findByText(/مرشح على طلب احتياج آخر/)).toBeTruthy();
    // Still open, and the chosen candidate is still chosen.
    expect(within(dialog).getByText(/المختارون: 1/)).toBeTruthy();
  });

  it('adds a brand-new candidate and nominates him on this request in one step', async () => {
    vi.mocked(candidatesApi.add).mockResolvedValue({ id: 90 });
    show(requestCandidates({}));
    fireEvent.click(await screen.findByRole('button', { name: 'مرشح جديد' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^الاسم/), { target: { value: 'سالم علي' } });
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: /^الجنسية/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'مصر' }));
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: /^جهة الاستقطاب/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'إدارة العمليات' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(candidatesApi.add).toHaveBeenCalledTimes(1));
    // Entered for the request's job by default, and tied to this request so he is nominated at once.
    expect(vi.mocked(candidatesApi.add).mock.calls[0][0]).toMatchObject({ requestNumber: 15, name: 'سالم علي', nationalityId: 2, jobId: 5 });
  });

  it('records the interview as the whole chain (TL-N15): no General Manager decision, acceptance approves', async () => {
    const step = { decision: 'Approved', decidedBy: 'م. علي', decidedAt: '2026-11-01T10:00:00.000', note: null };
    const candidate = (over: Partial<S<'RequestCandidateItem'>>) =>
      ({ id: 41, nominationId: 7, name: 'آدم عيسى', nationalityName: 'تشاد', nominatedBy: null, recruitedBy: 'LaborSection', phone: null, status: 'Interview', statusReason: null, statusChangedAt: '2026-11-12T10:00:00.000', employeeId: null, employeeNumber: null, interview: null, generalManager: null, interviewRefusal: null, canCancel: false, ...over }) as S<'RequestCandidateItem'>;
    const view = show(requestCandidates({ status: 'Approved', acceptsCandidates: true, canInterview: true, candidates: [candidate({})] }));
    fireEvent.click(await screen.findByRole('button', { name: 'تسجيل المقابلة' }));
    expect(await screen.findByText('قبول المرشح في المقابلة يعتمده، فينتقل إلى التسجيل.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /قرار المدير العام/ })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'قرار المدير العام (سابقًا)' })).toBeNull();
    view.unmount();

    // A nomination decided before TL-N15 keeps showing its General Manager decision.
    show(requestCandidates({ status: 'Approved', acceptsCandidates: true, candidates: [candidate({ id: 42, status: 'Approved', interview: step, generalManager: step } as never)] }));
    expect(await screen.findByRole('columnheader', { name: 'قرار المدير العام (سابقًا)' })).toBeTruthy();
  });
});
