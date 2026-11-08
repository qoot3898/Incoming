import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithRouter } from '@/test/renderWithRouter';
import { useListState } from '@/hooks/useListState';
import { FilterPanel } from './FilterPanel';
import { SearchField } from './SearchField';
import type { FilterDef } from './filters';

function Page() {
  const list = useListState({ Tab: 'All', Search: '', TrackId: '', WorkSiteId: '' });
  const filters: FilterDef<typeof list.filters>[] = [
    { key: 'Search', kind: 'search', label: 'Search' },
    { key: 'TrackId', kind: 'select', label: 'Track', options: [{ value: 1, label: 'Catering' }], clears: ['WorkSiteId'] },
    { key: 'WorkSiteId', kind: 'select', label: 'Site', options: [{ value: 11, label: 'Kitchen' }] },
  ];
  return <FilterPanel list={list} filters={filters} />;
}

describe('FilterPanel', () => {
  it('shows active filters as chips with readable values', () => {
    renderWithRouter(<Page />, '/x?Tab=Open&Search=ali&TrackId=1&WorkSiteId=11');
    const chips = screen.getAllByRole('button').filter((b) => b.classList.contains('MuiChip-root'));
    expect(chips.map((c) => c.textContent)).toEqual(['Search: ali', 'Track: Catering', 'Site: Kitchen']);
  });

  it('removing a parent filter chip also clears its dependent filter', () => {
    const { search } = renderWithRouter(<Page />, '/x?TrackId=1&WorkSiteId=11&page=3');
    const trackChip = screen.getByText('Track: Catering').closest('.MuiChip-root')!;
    fireEvent.click(trackChip.querySelector('.MuiChip-deleteIcon')!);
    expect(search()).toBe('');
  });

  it('"Clear all" resets the filters but keeps the selected tab', () => {
    const { search } = renderWithRouter(<Page />, '/x?Tab=Open&Search=ali&TrackId=1');
    fireEvent.click(screen.getByRole('button', { name: 'مسح الكل' }));
    expect(search()).toBe('?Tab=Open');
  });

  it('renders no chip row when nothing is filtered', () => {
    renderWithRouter(<Page />, '/x?Tab=Open');
    expect(screen.queryByText(/عوامل التصفية المطبقة/)).toBeNull();
  });
});

describe('SearchField', () => {
  it('commits once after the user stops typing', () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    renderWithRouter(<SearchField label="q" value="" onCommit={onCommit} />);
    const input = screen.getByLabelText('q');
    for (const v of ['a', 'al', 'ali']) fireEvent.change(input, { target: { value: v } });
    act(() => vi.advanceTimersByTime(349));
    expect(onCommit).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('ali');
    vi.useRealTimers();
  });

  it('commits immediately on Enter and adopts external value changes', () => {
    const onCommit = vi.fn();
    const { rerender } = renderWithRouter(<SearchField label="q" value="x" onCommit={onCommit} />);
    const input = screen.getByLabelText('q') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'xy' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('xy');
    rerender(<></>);
  });
});
