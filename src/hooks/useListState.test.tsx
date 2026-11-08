import { describe, expect, it } from 'vitest';
import { act } from '@testing-library/react';
import { renderWithRouter } from '@/test/renderWithRouter';
import { applyPatch, parsePage, parsePageSize, useListState, type ListState } from './useListState';

const DEFAULTS = { Search: '', Status: 'All', Year: 2026, LateReturn: false as boolean };
type F = typeof DEFAULTS;

function setup(url = '/list') {
  const ref: { current: ListState<F> | null } = { current: null };
  function Probe() {
    ref.current = useListState(DEFAULTS);
    return null;
  }
  const utils = renderWithRouter(<Probe />, url);
  return { ...utils, list: () => ref.current! };
}

describe('useListState (URL-owned list state)', () => {
  it('reads defaults when the URL is empty and parses typed values', () => {
    const empty = setup();
    expect(empty.list().filters).toEqual(DEFAULTS);
    expect(empty.list().page).toBe(1);
    expect(empty.list().pageSize).toBe(25);

    const typed = setup('/list?Search=ali&Year=2025&LateReturn=true&page=3&size=50');
    expect(typed.list().filters).toEqual({ Search: 'ali', Status: 'All', Year: 2025, LateReturn: true });
    expect(typed.list().page).toBe(3);
    expect(typed.list().pageSize).toBe(50);
  });

  it('falls back to defaults for invalid URL values', () => {
    const { list } = setup('/list?Year=abc&LateReturn=maybe&page=-2&size=999');
    expect(list().filters.Year).toBe(2026);
    expect(list().filters.LateReturn).toBe(false);
    expect(list().page).toBe(1);
    expect(list().pageSize).toBe(25);
  });

  it('writes filters to the URL, resets the page and keeps URLs canonical', () => {
    const { list, search } = setup('/list?page=4&tab=x');
    act(() => list().setFilter('Search', 'omar'));
    expect(search()).toBe('?tab=x&Search=omar');
    act(() => list().setFilter('Status', 'All')); // default → not written
    expect(search()).toBe('?tab=x&Search=omar');
    expect(list().activeKeys).toEqual(['Search']);
  });

  it('builds request params without empty values (stable query keys)', () => {
    const { list } = setup('/list?Search=x&page=2');
    expect(list().params).toEqual({ Search: 'x', Status: 'All', Year: 2026, LateReturn: false, Page: 2, PageSize: 25 });
  });

  it('creates one history entry per change so Back restores the previous filters', async () => {
    const { list, router, search } = setup('/list');
    act(() => list().setFilter('Search', 'a'));
    act(() => list().setFilters({ Status: 'Open', Year: 2024 }));
    expect(search()).toBe('?Search=a&Status=Open&Year=2024');
    await act(() => router.navigate(-1));
    expect(list().filters).toMatchObject({ Search: 'a', Status: 'All', Year: 2026 });
    await act(() => router.navigate(-1));
    expect(list().filters.Search).toBe('');
  });

  it('does not add a history entry when nothing changes', () => {
    const { list, router } = setup('/list?Search=a');
    const key = router.state.location.key;
    act(() => list().setFilter('Search', 'a'));
    expect(router.state.location.key).toBe(key);
  });

  it('reset(keys) clears only the given filters and keeps unrelated params', () => {
    const { list, search } = setup('/list?tab=log&Search=a&Status=Open&page=2&size=50');
    act(() => list().reset(['Search']));
    expect(search()).toBe('?tab=log&Status=Open&size=50');
    act(() => list().clearFilter('Status'));
    expect(search()).toBe('?tab=log&size=50');
  });

  it('pagination: setPage keeps filters; page size change returns to page 1', () => {
    const { list, search } = setup('/list?Search=a');
    act(() => list().setPage(3));
    expect(search()).toBe('?Search=a&page=3');
    act(() => list().setPageSize(100));
    expect(search()).toBe('?Search=a&size=100');
    act(() => list().setPageSize(25));
    expect(search()).toBe('?Search=a');
  });
});

describe('URL helpers', () => {
  it('applyPatch removes defaults and empty values', () => {
    const next = applyPatch(new URLSearchParams('a=1&b=2'), { a: '', b: 'x', c: 'All', d: 5 }, { c: 'All' });
    expect(next.toString()).toBe('b=x&d=5');
  });
  it('parsePage / parsePageSize validate input', () => {
    expect(parsePage('2.7')).toBe(2);
    expect(parsePage(null)).toBe(1);
    expect(parsePageSize('10')).toBe(10);
    expect(parsePageSize('11')).toBe(25);
  });
});
