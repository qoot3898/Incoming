import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { CandidatePoolPicker } from './CandidatePoolPicker';
import { candidatesApi } from '@/features/staffing/api';
import type { PoolCandidate } from './candidateSearch';

vi.mock('@/features/staffing/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/staffing/api')>();
  return { ...actual, candidatesApi: { list: vi.fn() } };
});

const adam = { id: 41, name: 'آدم عيسى', nationalityName: 'تشاد', phone: '0912345678' } as PoolCandidate;
const salem = { id: 57, name: 'سالم علي', nationalityName: 'مصر', phone: null } as PoolCandidate;
const page = (items: PoolCandidate[]) => ({ items, total: items.length, page: 1, pageSize: 20 }) as never;
const jobs = [
  { value: 5, label: 'طباخ' },
  { value: 6, label: 'سائق' },
];

const lastParams = () => vi.mocked(candidatesApi.list).mock.calls.at(-1)![0] as Record<string, unknown>;

describe('candidate picker (TL-N13)', () => {
  it("lists the available candidates of the request's job and picks one", async () => {
    vi.mocked(candidatesApi.list).mockResolvedValue(page([adam, salem]));
    const onChange = vi.fn();
    renderWithProviders(<CandidatePoolPicker value={[]} onChange={onChange} label="مرشحون من القائمة" jobOptions={jobs} initialJobId={5} />);
    await waitFor(() => expect(candidatesApi.list).toHaveBeenCalled());
    expect(lastParams()).toMatchObject({ PoolStatus: 'Available', JobId: 5 });

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'مرشحون من القائمة' }));
    fireEvent.click(await screen.findByText('آدم عيسى — تشاد · 0912345678'));
    expect(onChange).toHaveBeenCalledWith([adam]);
  });

  it('does not offer a candidate that is already chosen', async () => {
    vi.mocked(candidatesApi.list).mockResolvedValue(page([adam, salem]));
    renderWithProviders(<CandidatePoolPicker value={[adam]} onChange={() => undefined} label="مرشحون من القائمة" jobOptions={jobs} initialJobId={null} />);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'مرشحون من القائمة' }));
    const list = await screen.findByRole('listbox');
    expect(within(list).getByText('سالم علي — مصر')).toBeTruthy();
    expect(within(list).queryByText(/آدم عيسى/)).toBeNull();
  });

  it('starts with all jobs when the request has no job, and can be narrowed to one', async () => {
    vi.mocked(candidatesApi.list).mockResolvedValue(page([]));
    renderWithProviders(<CandidatePoolPicker value={[]} onChange={() => undefined} label="مرشحون من القائمة" jobOptions={jobs} initialJobId={null} />);
    await waitFor(() => expect(candidatesApi.list).toHaveBeenCalled());
    expect(lastParams().JobId).toBeUndefined();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'مهنة المرشح' }));
    fireEvent.click(await screen.findByRole('option', { name: 'سائق' }));
    await waitFor(() => expect(lastParams().JobId).toBe(6));
  });

  it('says so when no available candidate matches', async () => {
    vi.mocked(candidatesApi.list).mockResolvedValue(page([]));
    renderWithProviders(<CandidatePoolPicker value={[]} onChange={() => undefined} label="مرشحون من القائمة" jobOptions={jobs} />);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'مرشحون من القائمة' }));
    expect(await screen.findByText('لا يوجد مرشحون متاحون مطابقون')).toBeTruthy();
  });
});
