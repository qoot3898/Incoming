import { describe, expect, it } from 'vitest';
import { EMPTY_NEW_CANDIDATE, formPath, newCandidateFieldNames, toCandidateIds, toNewCandidates } from './requestCandidates';

describe('request candidates (TL-N13)', () => {
  it('sends the chosen list candidates by id, nothing when none are chosen', () => {
    expect(toCandidateIds([{ id: 41 }, { id: 57 }])).toEqual([41, 57]);
    expect(toCandidateIds([])).toBeNull();
  });

  it('sends nothing for no new candidates', () => {
    expect(toNewCandidates([], 5)).toBeNull();
  });

  it("builds each new candidate for the request's job, trimmed, with empty optional fields as null", () => {
    const rows = [
      { ...EMPTY_NEW_CANDIDATE, name: '  سالم علي ', nationalityId: '2', recruitedBy: 'LaborSection', phone: ' 0920000000 ' },
      { ...EMPTY_NEW_CANDIDATE, name: 'Adam', nationalityId: '7', recruitedBy: 'Operations', nominatedBy: 'عامل حالي', notes: 'خبرة سنتين' },
    ];
    expect(toNewCandidates(rows, 5)).toEqual([
      { name: 'سالم علي', nationalityId: 2, recruitedBy: 'LaborSection', phone: '0920000000', nominatedBy: null, jobId: 5, notes: null },
      { name: 'Adam', nationalityId: 7, recruitedBy: 'Operations', phone: null, nominatedBy: 'عامل حالي', jobId: 5, notes: 'خبرة سنتين' },
    ]);
  });

  it('lists the server field names of the rows shown, in the form the error mapper produces', () => {
    expect(newCandidateFieldNames(0)).toEqual([]);
    expect(newCandidateFieldNames(2)).toContain('newCandidates[0].name');
    expect(newCandidateFieldNames(2)).toContain('newCandidates[1].nationalityId');
    expect(newCandidateFieldNames(2)).not.toContain('newCandidates[2].name');
  });

  it('turns a server field into a form path', () => {
    expect(formPath('newCandidates[1].nationalityId')).toBe('newCandidates.1.nationalityId');
    expect(formPath('candidateIds')).toBe('candidateIds');
  });
});
