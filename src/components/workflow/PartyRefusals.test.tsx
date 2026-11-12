import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PartyDecision } from './PartyDecision';
import { StartApprovalCard } from '@/features/onboarding/OnboardingCards';
import { onboardingApi } from '@/features/onboarding/api';
import type { S } from '@/types/api';

const NOT_NOW = 'ليست هذه خطوة هذه الجهة الآن.';
const FOUR = ['LaborSection', 'HumanResources', 'Operations', 'GeneralManager'] as const;
const names = ['قسم العمالة المؤقتة', 'الموارد البشرية', 'إدارة العمليات', 'المدير العام'];

/** The line(s) of the page that carry the API's reason. */
const reasonLines = () => screen.queryAllByText((_, el) => !!el && (el.getAttribute('class') ?? '').includes('MuiAlert-message') && (el.textContent ?? '').includes(NOT_NOW));

describe('refusals of approval parties', () => {
  it('start approval: a user who represents all four parties reads the reason once, naming every party', async () => {
    vi.spyOn(onboardingApi, 'startApproval').mockResolvedValue({
      status: 'PendingStartApproval',
      rounds: [],
      waitingParty: 'Operations',
      waitingSince: '2026-11-12T08:00:00',
      delayed: false,
      delayDays: 3,
      canSubmit: false,
      parties: FOUR.map((party) => ({ party, refusal: NOT_NOW })),
    } as unknown as S<'StartApprovalDetails'>);
    renderWithProviders(<StartApprovalCard employeeId={300} />);

    expect(await screen.findByText('بانتظار:')).toBeTruthy();
    const lines = reasonLines();
    expect(lines).toHaveLength(1);
    names.forEach((n) => expect(lines[0].textContent).toContain(n));
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('start approval: a user with one party sees that party and the reason, as before', async () => {
    vi.spyOn(onboardingApi, 'startApproval').mockResolvedValue({
      status: 'PendingStartApproval',
      rounds: [],
      waitingParty: 'Operations',
      waitingSince: '2026-11-12T08:00:00',
      delayed: false,
      delayDays: 3,
      canSubmit: false,
      parties: [{ party: 'HumanResources', refusal: NOT_NOW }],
    } as unknown as S<'StartApprovalDetails'>);
    renderWithProviders(<StartApprovalCard employeeId={300} />);

    expect(await screen.findByText(`الموارد البشرية: ${NOT_NOW}`)).toBeTruthy();
  });

  it('start approval: the party whose turn it is keeps its buttons next to one line for the others', async () => {
    vi.spyOn(onboardingApi, 'startApproval').mockResolvedValue({
      status: 'PendingStartApproval',
      rounds: [],
      waitingParty: 'Operations',
      waitingSince: '2026-11-12T08:00:00',
      delayed: false,
      delayDays: 3,
      canSubmit: false,
      parties: [
        { party: 'LaborSection', refusal: NOT_NOW },
        { party: 'Operations', refusal: null },
        { party: 'GeneralManager', refusal: NOT_NOW },
      ],
    } as unknown as S<'StartApprovalDetails'>);
    renderWithProviders(<StartApprovalCard employeeId={300} />);

    expect(await screen.findByRole('button', { name: 'اعتماد بصفة إدارة العمليات' })).toBeTruthy();
    const lines = reasonLines();
    expect(lines).toHaveLength(1);
    expect(lines[0].textContent).toContain('قسم العمالة المؤقتة');
    expect(lines[0].textContent).toContain('المدير العام');
    expect(lines[0].textContent).not.toContain('إدارة العمليات');
  });

  it('transfers and leaves (PartyDecision) merge the same way', () => {
    renderWithProviders(<PartyDecision parties={FOUR.map((party) => ({ party, refusal: NOT_NOW }))} onDecide={() => Promise.resolve()} />);
    const lines = reasonLines();
    expect(lines).toHaveLength(1);
    names.forEach((n) => expect(lines[0].textContent).toContain(n));
  });
});
