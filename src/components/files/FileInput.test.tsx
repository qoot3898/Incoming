import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FileInput } from './FileInput';

const pdf = (size = 1000, name = 'scan.pdf') => new File([new Uint8Array(size)], name, { type: 'application/pdf' });

function choose(container: HTMLElement, files: File[]) {
  const input = container.querySelector('input[type=file]') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
  return input;
}

describe('FileInput', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('accepts a valid file and shows its name and size', () => {
    const onChange = vi.fn();
    const { container, rerender } = render(<FileInput label="Scan" value={null} onChange={onChange} />);
    const file = pdf(2048);
    choose(container, [file]);
    expect(onChange).toHaveBeenCalledWith(file);
    rerender(<FileInput label="Scan" value={file} onChange={onChange} />);
    expect(screen.getByText('scan.pdf')).toBeTruthy();
  });

  it('rejects oversized and wrong-type files before they reach the form', () => {
    const onChange = vi.fn();
    const { container } = render(<FileInput label="Scan" value={null} onChange={onChange} maxSizeMb={1} />);
    choose(container, [pdf(2 * 1024 * 1024)]);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/scan\.pdf: .*1/)).toBeTruthy();
    choose(container, [new File(['x'], 'tool.exe', { type: 'application/x-msdownload' })]);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/tool\.exe/)).toBeTruthy();
  });

  it('rejects several files at once (single-file endpoints)', () => {
    const onChange = vi.fn();
    const { container } = render(<FileInput label="Scan" value={null} onChange={onChange} />);
    choose(container, [pdf(), pdf(10, 'b.pdf')]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes the file and revokes the preview URL on unmount', () => {
    const onChange = vi.fn();
    const img = new File([new Uint8Array(10)], 'p.png', { type: 'image/png' });
    const { unmount } = render(<FileInput label="Scan" value={img} onChange={onChange} />);
    expect(URL.createObjectURL).toHaveBeenCalledWith(img);
    fireEvent.click(screen.getByRole('button', { name: 'إزالة الملف' }));
    expect(onChange).toHaveBeenCalledWith(null);
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('distinguishes a stored server file from a new local file', () => {
    const { rerender } = render(<FileInput label="Scan" value={null} onChange={() => undefined} existing={{ name: 'old.pdf' }} />);
    expect(screen.getByText('old.pdf')).toBeTruthy();
    rerender(<FileInput label="Scan" value={pdf()} onChange={() => undefined} existing={{ name: 'old.pdf' }} />);
    expect(screen.queryByText('old.pdf')).toBeNull();
    expect(screen.getByText('سيحل محل الملف الحالي')).toBeTruthy();
  });
});
