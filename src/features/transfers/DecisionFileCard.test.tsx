import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { DecisionFileCard } from './DecisionFileCard';
import { transfersApi } from './api';
import type { S } from '@/types/api';

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return {
    ...actual,
    transfersApi: { attachDecisionFile: vi.fn(), removeDecisionFile: vi.fn(), openDecisionFile: vi.fn() },
  };
});

const transfer = (over: Partial<S<'TransferDetails'>>) => ({ id: 7, decisionFile: null, canChangeDecisionFile: true, decisionFileRefusal: null, ...over }) as S<'TransferDetails'>;
const attached = { fileName: 'قرار-نقل.pdf', size: 2048, attachedAt: '2026-11-12T09:30:00' };
const pdf = () => new File(['%PDF-1.4'], 'decision.pdf', { type: 'application/pdf' });

describe('transfer decision card (TL-N12)', () => {
  it('offers to attach when there is no decision and the request is still changeable', () => {
    renderWithProviders(<DecisionFileCard transfer={transfer({})} />);
    expect(screen.getByText('لم يُرفق قرار نقل بهذا الطلب.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'إرفاق قرار النقل' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'حذف قرار النقل' })).toBeNull();
  });

  it('shows the attached file with open, replace and delete', () => {
    renderWithProviders(<DecisionFileCard transfer={transfer({ decisionFile: attached })} />);
    expect(screen.getByText('قرار-نقل.pdf')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'فتح قرار النقل' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'استبدال قرار النقل' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'حذف قرار النقل' })).toBeTruthy();
  });

  it("hides the change buttons and shows the API's reason once a party has decided, but the file stays openable", () => {
    const refusal = 'بتّت جهة في الطلب بعد إرفاق قرار النقل؛ يُعاد الطلب للتصحيح ليتغير قراره.';
    renderWithProviders(<DecisionFileCard transfer={transfer({ decisionFile: attached, canChangeDecisionFile: false, decisionFileRefusal: refusal })} />);
    expect(screen.getByText(refusal)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'فتح قرار النقل' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'استبدال قرار النقل' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'حذف قرار النقل' })).toBeNull();
  });

  it('shows no change buttons and no reason to a user who only views the request', () => {
    renderWithProviders(<DecisionFileCard transfer={transfer({ canChangeDecisionFile: false })} />);
    expect(screen.queryByRole('button', { name: 'إرفاق قرار النقل' })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('attaches the chosen PDF to the transfer', async () => {
    vi.mocked(transfersApi.attachDecisionFile).mockResolvedValue(undefined);
    renderWithProviders(<DecisionFileCard transfer={transfer({})} />);
    fireEvent.click(screen.getByRole('button', { name: 'إرفاق قرار النقل' }));
    const dialog = await screen.findByRole('dialog');
    const input = dialog.querySelector('input[type=file]') as HTMLInputElement;
    expect(input.accept).toBe('application/pdf');
    const file = pdf();
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'إرفاق قرار النقل' }));
    await waitFor(() => expect(transfersApi.attachDecisionFile).toHaveBeenCalledTimes(1));
    const [id, sent] = vi.mocked(transfersApi.attachDecisionFile).mock.calls[0];
    expect(id).toBe(7);
    expect(sent).toBe(file);
  });

  it('does not send anything for a file that is not a PDF', async () => {
    renderWithProviders(<DecisionFileCard transfer={transfer({})} />);
    fireEvent.click(screen.getByRole('button', { name: 'إرفاق قرار النقل' }));
    const dialog = await screen.findByRole('dialog');
    const input = dialog.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'photo.png', { type: 'image/png' })] } });
    // The picker names the rejected file and keeps the form empty, so submitting is refused as "required".
    expect(await within(dialog).findByText(/photo\.png/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'إرفاق قرار النقل' }));
    await waitFor(() => expect(within(dialog).getByText(/photo\.png/)).toBeTruthy());
    expect(transfersApi.attachDecisionFile).not.toHaveBeenCalled();
  });

  it('asks before deleting, then deletes', async () => {
    vi.mocked(transfersApi.removeDecisionFile).mockResolvedValue(undefined);
    renderWithProviders(<DecisionFileCard transfer={transfer({ decisionFile: attached })} />);
    fireEvent.click(screen.getByRole('button', { name: 'حذف قرار النقل' }));
    const dialog = await screen.findByRole('dialog');
    expect(transfersApi.removeDecisionFile).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'حذف' }));
    await waitFor(() => expect(transfersApi.removeDecisionFile).toHaveBeenCalledWith(7));
  });
});
