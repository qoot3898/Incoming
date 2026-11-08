import { describe, expect, it, vi } from 'vitest';
import { AxiosError, CanceledError, AxiosHeaders } from 'axios';
import { applyServerErrors, toApiError, type ApiError } from './errors';

function axiosError(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('fail', 'ERR', config, null, { status, statusText: '', headers: {}, config, data });
}

describe('server error handling', () => {
  it('normalises ProblemDetails and camelCases field keys', async () => {
    const err = await toApiError(axiosError(400, { title: 'Invalid', detail: 'Check fields', errors: { 'Body.LeavingEmployeeId': ['Required'], ToDate: ['Too early'] } }), 'fallback');
    expect(err).toMatchObject({ status: 400, title: 'Invalid', detail: 'Check fields' });
    expect(err.fieldErrors).toEqual({ 'body.leavingEmployeeId': ['Required'], toDate: ['Too early'] });
  });

  it('marks user cancellation so it is not reported as a failure', async () => {
    const err = await toApiError(new CanceledError(), 'fallback');
    expect(err.cancelled).toBe(true);
  });

  it('maps API fields onto form fields and returns the rest', () => {
    const error: ApiError = { title: 'x', fieldErrors: { employeeId: ['Worker is on leave'], toDate: ['Too early'], other: ['Unknown rule'] } };
    const set = vi.fn();
    const unmatched = applyServerErrors(error, set, ['worker', 'toDate'], { employeeId: 'worker' });
    expect(set).toHaveBeenCalledWith('worker', 'Worker is on leave');
    expect(set).toHaveBeenCalledWith('toDate', 'Too early');
    expect(unmatched).toEqual(['Unknown rule']);
  });
});
