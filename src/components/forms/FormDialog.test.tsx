import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormDialog, type FieldConfig } from './FormDialog';
import type { TransferOptions } from '@/services/api/client';

type V = { note: string | null; scan: File | null };
const fields: FieldConfig<V>[] = [
  { name: 'note', kind: 'text', label: 'Note', required: true },
  { name: 'scan', kind: 'file', label: 'Scan' },
];

describe('FormDialog', () => {
  it('validates required fields and does not submit', async () => {
    const onSubmit = vi.fn();
    render(<FormDialog<V> open title="T" fields={fields} onClose={() => undefined} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await screen.findByText('هذا الحقل مطلوب');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits once even when clicked repeatedly, then closes', async () => {
    let resolve!: () => void;
    const onSubmit = vi.fn<(values: V) => Promise<void>>(() => new Promise<void>((r) => (resolve = r)));
    const onClose = vi.fn();
    render(<FormDialog<V> open title="T" fields={fields} onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/Note/), { target: { value: 'ok' } });
    const save = screen.getByRole('button', { name: 'حفظ' });
    fireEvent.click(save);
    fireEvent.click(save);
    fireEvent.submit(save.closest('form')!);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ note: 'ok', scan: null });
    await act(async () => resolve());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows server field errors next to the field and keeps the entered data', async () => {
    const onSubmit = vi.fn().mockRejectedValue({ title: 'Invalid', fieldErrors: { note: ['Too short'], other: ['General rule'] } });
    render(<FormDialog<V> open title="T" fields={fields} onClose={() => undefined} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/Note/), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await screen.findByText('Too short');
    expect(screen.getByText('General rule')).toBeTruthy();
    expect((screen.getByLabelText(/Note/) as HTMLInputElement).value).toBe('x');
  });

  it('passes an abort signal for uploads; cancelling keeps the dialog open with the data', async () => {
    let transfer!: TransferOptions;
    const onSubmit = vi.fn((_: V, tr: TransferOptions) => {
      transfer = tr;
      return new Promise((_, reject) => tr.signal!.addEventListener('abort', () => reject(Object.assign(new Error('canceled'), { __CANCEL__: true }))));
    });
    const onClose = vi.fn();
    const { container } = render(<FormDialog<V> open title="T" fields={fields} onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/Note/), { target: { value: 'ok' } });
    const input = container.ownerDocument.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File([new Uint8Array(100)], 'a.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    act(() => transfer.onUploadProgress!({ loaded: 50, total: 100 } as never));
    await screen.findByText(/50/);
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء الرفع' }));
    await screen.findByText(/تم إلغاء الرفع/);
    expect(onClose).not.toHaveBeenCalled();
    expect((screen.getByLabelText(/Note/) as HTMLInputElement).value).toBe('ok');
  });

  it('shows a conditional field only when its condition holds, and submits it only then', async () => {
    type D = { kind: string | null; issuedOn: string | null };
    const conditional: FieldConfig<D>[] = [
      { name: 'kind', kind: 'select', label: 'Kind', required: true, options: [{ value: 'A', label: 'A' }, { value: 'HC', label: 'HC' }] },
      { name: 'issuedOn', kind: 'date', label: 'Issued', required: true, visibleWhen: (v) => v.kind === 'HC' },
    ];
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<FormDialog<D> open title="T" fields={conditional} defaultValues={{ kind: 'A' }} onClose={() => undefined} onSubmit={onSubmit} />);
    expect(screen.queryByLabelText(/Issued/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // The hidden required field neither blocks the submit nor is sent.
    expect(onSubmit.mock.calls[0][0]).toEqual({ kind: 'A' });
  });

  it('runs cross-field validation before submitting', async () => {
    type D = { from: string | null; to: string | null };
    const range: FieldConfig<D>[] = [
      { name: 'from', kind: 'date', label: 'From' },
      { name: 'to', kind: 'date', label: 'To' },
    ];
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <FormDialog<D>
        open
        title="T"
        fields={range}
        defaultValues={{ from: '2026-11-09', to: '2026-11-01' }}
        validate={(v) => (v.from && v.to && v.to <= v.from ? { to: 'After from' } : null)}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await screen.findByText('After from');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders disabled fields read-only but still submits their value', async () => {
    type D = { number: number | null; name: string | null };
    const locked: FieldConfig<D>[] = [
      { name: 'number', kind: 'number', label: 'Number', disabled: true },
      { name: 'name', kind: 'text', label: 'Name' },
    ];
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<FormDialog<D> open title="T" fields={locked} defaultValues={{ number: 60, name: 'x' }} onClose={() => undefined} onSubmit={onSubmit} />);
    expect((screen.getByLabelText(/Number/) as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({ number: 60, name: 'x' });
  });
});
