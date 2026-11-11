/**
 * Reference lists served by `/api/v1/directories/{slug}` (SRS FR-61), confirmed against the API.
 * Managing them requires `TemporaryLabor.ManageSettings`; reading them `TemporaryLabor.View`.
 * Any other slug can still be opened at /admin/directories/:slug.
 */
export const DIRECTORY_SLUGS: string[] = [
  'managements',
  'work-sites',
  'jobs',
  'nationalities',
  'departments',
  'cities',
  'labor-penalty-decisions',
  'labor-leave-types',
  'labor-termination-reasons',
];

/** Punishment types (TL-N5): the configurable list behind a penalty decision. */
export const PENALTY_DECISIONS_SLUG = 'labor-penalty-decisions';

/** How the system treats a punishment type (`fields.behavior`). */
export const PENALTY_BEHAVIORS = ['Warning', 'DeductionOfDays', 'FinalWarning'] as const;
export type PenaltyBehavior = (typeof PENALTY_BEHAVIORS)[number];

/** Base punishment types: renamed and deactivated but never deleted, their behavior never changes. */
export const BASE_PENALTY_DECISIONS: Readonly<Record<number, PenaltyBehavior>> = { 1: 'Warning', 2: 'DeductionOfDays', 3: 'FinalWarning' };

export interface DirectoryRules {
  /** Extra fields offered as a choice list instead of free text (key → values, labels from `enums.<enumName>`). */
  choices?: Record<string, { enumName: 'PenaltyDecision'; values: readonly string[] }>;
  /** The entry number is fixed once the entry exists. */
  lockNumberOnEdit?: boolean;
  /** Entries whose number is listed here cannot be deleted and keep these extra fields unchanged. */
  baseEntries?: { numbers: ReadonlySet<number>; lockedFields: ReadonlySet<string> };
}

/** Per-list UI rules the generic directory screen applies (the API stays authoritative). */
export const DIRECTORY_RULES: Record<string, DirectoryRules> = {
  [PENALTY_DECISIONS_SLUG]: {
    choices: { behavior: { enumName: 'PenaltyDecision', values: PENALTY_BEHAVIORS } },
    lockNumberOnEdit: true,
    baseEntries: { numbers: new Set(Object.keys(BASE_PENALTY_DECISIONS).map(Number)), lockedFields: new Set(['behavior']) },
  },
};
