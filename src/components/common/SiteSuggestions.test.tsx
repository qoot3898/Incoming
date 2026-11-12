import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SiteSuggestionsList } from './SiteSuggestionsList';
import type { SiteSuggestion } from '@/services/api/errors';

const SITES: SiteSuggestion[] = [
  { workSiteId: 14, number: 120, name: 'مطبخ الميناء', shortage: 3, freePlaces: null, distanceKm: 12.4 },
  { workSiteId: 9, number: 104, name: 'مخزن الكريمية', shortage: null, freePlaces: 6, distanceKm: 7.9 },
  { workSiteId: 21, number: 131, name: 'مطبخ سوق الجمعة', shortage: null, freePlaces: null, distanceKm: null },
];

describe('SiteSuggestionsList (TL-N7)', () => {
  it('shows why each site is proposed: shortage, free places or no limit, and distance or unknown', () => {
    render(<SiteSuggestionsList suggestions={SITES} />);
    expect(screen.getByText('120 — مطبخ الميناء')).toBeTruthy();
    expect(screen.getByText('ينقصه 3 · سعة بلا حد · 12.4 كم')).toBeTruthy();
    expect(screen.getByText('أماكن شاغرة: 6 · 7.9 كم')).toBeTruthy();
    expect(screen.getByText('سعة بلا حد · مسافة غير معروفة')).toBeTruthy();
  });

  it('offers a choose button per site only when it can fill a field', () => {
    const { rerender } = render(<SiteSuggestionsList suggestions={SITES} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    const onPick = vi.fn();
    rerender(<SiteSuggestionsList suggestions={SITES} onPick={onPick} />);
    const buttons = screen.getAllByRole('button', { name: 'اختيار' });
    expect(buttons).toHaveLength(3);
    fireEvent.click(buttons[1]);
    expect(onPick).toHaveBeenCalledWith(9);
  });

  it('says so when no other site can take them', () => {
    render(<SiteSuggestionsList suggestions={[]} />);
    expect(screen.getByText(/لا يوجد موقع آخر يتسع لهم الآن/)).toBeTruthy();
  });
});
