/**
 * Reference lists served by `/api/v1/directories/{slug}` (SRS FR-61), confirmed against the API.
 * Managing them requires `TemporaryLabor.ManageSettings`. Any other slug can still be opened at
 * /admin/directories/:slug.
 */
export const DIRECTORY_SLUGS: string[] = ['managements', 'work-sites', 'jobs', 'nationalities', 'departments', 'cities'];
