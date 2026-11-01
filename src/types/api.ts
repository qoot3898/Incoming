import type { components } from './api.generated';

/** All schemas from the backend OpenAPI document. */
export type Schemas = components['schemas'];
/** Shorthand: `S<'LaborWorkerDetails'>`. */
export type S<K extends keyof Schemas> = Schemas[K];

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PageParams {
  Page?: number;
  PageSize?: number;
}

export type LaborParty = NonNullable<S<'LaborParty'>>;
export type LaborStatus = S<'LaborStatus'>;
export type ApprovalDecision = S<'ApprovalDecision'>;

import type { operations } from './api.generated';
/** Query parameters of an operation: `Q<'SearchLaborWorkers'>`. */
export type Q<Op extends keyof operations> = NonNullable<operations[Op]['parameters']['query']>;
