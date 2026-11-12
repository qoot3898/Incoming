import { describe, expect, it } from 'vitest';
import { resolveLink } from './links';

describe('resolveLink', () => {
  it('follows links to the screens of this application', () => {
    expect(resolveLink('/workers/12')).toBe('/workers/12');
    expect(resolveLink('/workers/12/onboarding')).toBe('/workers/12/onboarding');
    expect(resolveLink('/leaves/3?tab=1')).toBe('/leaves/3?tab=1');
    expect(resolveLink('/candidates/41')).toBe('/candidates/41');
  });

  it('anchors a relative link (the fingerprint notices of TL-N12 are `transfers/{id}`)', () => {
    expect(resolveLink('transfers/7')).toBe('/transfers/7');
    expect(resolveLink('staffing-requests/15')).toBe('/staffing-requests/15');
    expect(resolveLink(' transfers/7 ')).toBe('/transfers/7');
  });

  it('ignores empty links and addresses this application has no screen for', () => {
    expect(resolveLink(null)).toBeNull();
    expect(resolveLink(undefined)).toBeNull();
    expect(resolveLink('')).toBeNull();
    expect(resolveLink('   ')).toBeNull();
    expect(resolveLink('transfers/abc')).toBeNull();
    expect(resolveLink('https://example.com/transfers/7')).toBeNull();
    expect(resolveLink('//evil.example/transfers/7')).toBeNull();
    expect(resolveLink('unknown/7')).toBeNull();
  });
});
