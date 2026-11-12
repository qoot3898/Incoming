import { describe, expect, it, vi } from 'vitest';
import { AxiosError, CanceledError, AxiosHeaders } from 'axios';
import { API_ERROR_CODES, applyServerErrors, parseSuggestions, toApiError, toApiErrorSync, type ApiError } from './errors';

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

  it('keeps the stable error code and correlation id (RFC 9457)', async () => {
    const err = await toApiError(axiosError(409, { title: 'Conflict', code: 'CONCURRENCY_CONFLICT', correlationId: 'abc-1' }), 'fallback');
    expect(err).toMatchObject({ status: 409, code: 'CONCURRENCY_CONFLICT', correlationId: 'abc-1' });
  });

  it('keeps the proposed sites of a capacity rejection (TL-N7)', async () => {
    const body = {
      title: 'full',
      detail: 'The site cannot take 2 more.',
      code: 'SITE_CAPACITY_EXCEEDED',
      suggestions: [
        { workSiteId: 14, number: 120, name: 'Port kitchen', shortage: 3, freePlaces: null, distanceKm: 12.4 },
        { workSiteId: 9, number: 104, name: 'Karimiya store', shortage: null, freePlaces: 6, distanceKm: 7.9 },
      ],
    };
    const err = await toApiError(axiosError(409, body), 'fallback');
    expect(err.code).toBe(API_ERROR_CODES.siteCapacityExceeded);
    expect(err.suggestions).toHaveLength(2);
    expect(err.suggestions?.[0]).toEqual({ workSiteId: 14, number: 120, name: 'Port kitchen', shortage: 3, freePlaces: null, distanceKm: 12.4 });
    expect(toApiErrorSync(axiosError(409, body), 'fallback').suggestions).toHaveLength(2);
  });

  it('accepts a capacity rejection without suggestions and ignores malformed ones', async () => {
    const empty = await toApiError(axiosError(409, { title: 'full', code: 'SITE_CAPACITY_EXCEEDED', suggestions: [] }), 'fallback');
    expect(empty.suggestions).toEqual([]);
    expect((await toApiError(axiosError(422, { title: 'no' }), 'fallback')).suggestions).toBeUndefined();
    expect(parseSuggestions([null, 'x', { name: 'no id' }, { workSiteId: 5, name: 'Site' }])).toEqual([
      { workSiteId: 5, number: 5, name: 'Site', shortage: null, freePlaces: null, distanceKm: null },
    ]);
  });
});
