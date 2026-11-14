import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ChecklistCard, PassportCard } from './OnboardingCards';
import { onboardingApi } from './api';
import { workersApi } from '@/features/workers/api';
import type { S } from '@/types/api';

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return { ...actual, onboardingApi: { ...actual.onboardingApi, receiveDocument: vi.fn(), receivePassport: vi.fn() } };
});
vi.mock('@/features/workers/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/workers/api')>();
  return { ...actual, workersApi: { ...actual.workersApi, renewHealthCertificate: vi.fn(), get: vi.fn() } };
});

const record = (over: Partial<S<'OnboardingRecord'>> = {}) =>
  ({
    employeeId: 120,
    employeeNumber: 15020,
    name: 'آدم عيسى',
    libyan: false,
    passportNumber: 'A1234567',
    passportIssueDate: '2024-03-01',
    passportExpiryDate: '2029-03-01',
    hasPassportCopy: true,
    documentsDueDate: null,
    documentsOverdue: false,
    documentsDueSoon: false,
    checklist: [],
    checklistComplete: false,
    missingCount: 2,
    documents: [],
    passport: null,
    canManage: true,
    ...over,
  }) as S<'OnboardingRecord'>;

async function choose(label: string | RegExp, option: string) {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: label }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

describe('onboarding documents and passport (TL-N14)', () => {
  it('receives a health certificate through its own endpoint, with its dates and without a document kind', async () => {
    vi.mocked(workersApi.renewHealthCertificate).mockResolvedValue(undefined);
    renderWithProviders(<ChecklistCard r={record()} />);
    fireEvent.click(screen.getByRole('button', { name: 'استلام مستند' }));
    const dialog = await screen.findByRole('dialog');
    await choose(/^المستند/, 'الشهادة الصحية');
    fireEvent.change(within(dialog).getByLabelText(/^تاريخ الإصدار/), { target: { value: '2026-11-01' } });
    fireEvent.change(within(dialog).getByLabelText(/^تاريخ الانتهاء/), { target: { value: '2027-11-01' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(workersApi.renewHealthCertificate).toHaveBeenCalled());
    const [employeeId, values] = vi.mocked(workersApi.renewHealthCertificate).mock.calls[0];
    expect(employeeId).toBe(120);
    expect(values).toMatchObject({ issuedOn: '2026-11-01', expiresOn: '2027-11-01' });
    expect(values).not.toHaveProperty('kind');
    expect(onboardingApi.receiveDocument).not.toHaveBeenCalled();
  });

  it('receives the other documents without certificate dates', async () => {
    vi.mocked(onboardingApi.receiveDocument).mockResolvedValue(undefined);
    renderWithProviders(<ChecklistCard r={record()} />);
    fireEvent.click(screen.getByRole('button', { name: 'استلام مستند' }));
    const dialog = await screen.findByRole('dialog');
    await choose(/^المستند/, 'الصور');
    expect(within(dialog).queryByLabelText(/^تاريخ الإصدار/)).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(onboardingApi.receiveDocument).toHaveBeenCalled());
    const values = vi.mocked(onboardingApi.receiveDocument).mock.calls[0][1];
    expect(values).toMatchObject({ kind: 'Photos' });
    expect(values).not.toHaveProperty('issuedOn');
  });

  it('takes the passport into custody from the record alone, without a new scan when a copy is on file', async () => {
    vi.mocked(onboardingApi.receivePassport).mockResolvedValue(undefined);
    renderWithProviders(<PassportCard r={record()} />);
    fireEvent.click(screen.getByRole('button', { name: 'استلام الجواز' }));
    const dialog = await screen.findByRole('dialog');
    // Recorded dates come with the record (no extra request for the worker file) and are read-only.
    expect((within(dialog).getByLabelText(/تاريخ إصدار الجواز/) as HTMLInputElement).value).toBe('2024-03-01');
    expect(workersApi.get).not.toHaveBeenCalled();
    expect(within(dialog).getByText('في ملف العامل نسخة جواز؛ فلا يلزم إرفاق نسخة جديدة.')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(onboardingApi.receivePassport).toHaveBeenCalled());
  });

  it('asks for the scan when no passport copy is on file', async () => {
    renderWithProviders(<PassportCard r={record({ hasPassportCopy: false })} />);
    fireEvent.click(screen.getByRole('button', { name: 'استلام الجواز' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    expect(await within(dialog).findByText(/مطلوب/)).toBeTruthy();
    expect(onboardingApi.receivePassport).not.toHaveBeenCalled();
  });
});
