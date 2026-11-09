import { api } from '@/services/api/client';
import type { Paged, Q, S } from '@/types/api';

export const adminKeys = {
  users: ['admin', 'users'] as const,
  roles: ['admin', 'roles'] as const,
  directories: ['admin', 'directories'] as const,
  settings: ['admin', 'settings'] as const,
  labor: ['admin', 'labor'] as const,
  audit: ['admin', 'audit'] as const,
  integration: ['admin', 'integration'] as const,
  backups: ['admin', 'backups'] as const,
  assignments: ['admin', 'assignments'] as const,
  userList: (p: object) => ['admin', 'users', 'list', p] as const,
  assignmentList: (p: object) => ['admin', 'assignments', 'list', p] as const,
  auditList: (p: object) => ['admin', 'audit', 'list', p] as const,
  auditOptions: ['admin', 'audit', 'options'] as const,
  integrationList: (kind: 'events' | 'log' | 'workers', p: object) => ['admin', 'integration', kind, p] as const,
};

export const usersApi = {
  list: (q: Q<'ListUsers'>, signal?: AbortSignal) => api.get<Paged<S<'UserListItem'>>>('/users', q, { signal }),
  get: (id: number) => api.get<S<'UserDetails'>>(`/users/${id}`),
  create: (body: S<'CreateUserRequest'>) => api.post<S<'TemporaryPasswordResult'>>('/users', body),
  update: (id: number, body: S<'UpdateUserRequest'>) => api.put(`/users/${id}`, body),
  setRoles: (id: number, body: S<'SetUserRolesRequest'>) => api.put(`/users/${id}/roles`, body),
  setActive: (id: number, body: S<'SetUserActiveRequest'>) => api.put(`/users/${id}/active`, body),
  unlock: (id: number) => api.post(`/users/${id}/unlock`),
  resetPassword: (id: number) => api.post<S<'TemporaryPasswordResult'>>(`/users/${id}/reset-password`),
  forceSignOut: (id: number) => api.post(`/users/${id}/force-sign-out`),
  assignableRoles: () => api.get<S<'AssignableRoleItem'>[]>('/users/assignable-roles'),
};

/** Assignment letters (TL-N3), permission `Users.ReviewAssignments`. */
export const assignmentsApi = {
  list: (q: Q<'ListAssignments'>, signal?: AbortSignal) => api.get<S<'AssignmentList'>>('/users/assignments', q, { signal }),
  /** The letter as PDF; every opening is logged by the API. */
  openFile: (userId: number) => api.blob('get', `/users/${userId}/assignment/file`),
  decide: (userId: number, body: S<'DecideAssignmentRequest'>) => api.post(`/users/${userId}/assignment/decision`, body),
};

export const rolesApi = {
  list: () => api.get<S<'RoleListItem'>[]>('/roles'),
  get: (id: number) => api.get<S<'RoleDetails'>>(`/roles/${id}`),
  create: (body: S<'CreateRoleRequest'>) => api.post<S<'IdResponse'>>('/roles', body),
  update: (id: number, body: S<'UpdateRoleRequest'>) => api.put(`/roles/${id}`, body),
  remove: (id: number) => api.delete(`/roles/${id}`),
  permissions: () => api.get<S<'PermissionModuleGroup'>[]>('/roles/permissions'),
  setPermissions: (id: number, body: S<'SetRolePermissionsRequest'>) => api.put(`/roles/${id}/permissions`, body),
};

export const directoriesApi = {
  /** `Search` matches the number exactly or every word in the name / extra fields; `Active` filters active or stopped entries. */
  list: (slug: string, q: Q<'ListDirectoryEntries'> = {}, signal?: AbortSignal) =>
    api.get<S<'DirectoryListing'>>(`/directories/${encodeURIComponent(slug)}`, q, { signal }),
  get: (slug: string, id: number) => api.get<S<'DirectoryEntryItem'>>(`/directories/${encodeURIComponent(slug)}/${id}`),
  create: (slug: string, body: S<'CreateDirectoryEntryRequest'>) => api.post<S<'IdResponse'>>(`/directories/${encodeURIComponent(slug)}`, body),
  update: (slug: string, id: number, body: S<'UpdateDirectoryEntryRequest'>) => api.put(`/directories/${encodeURIComponent(slug)}/${id}`, body),
  remove: (slug: string, id: number) => api.delete(`/directories/${encodeURIComponent(slug)}/${id}`),
  setActive: (slug: string, id: number, body: S<'SetDirectoryEntryActiveRequest'>) => api.put(`/directories/${encodeURIComponent(slug)}/${id}/active`, body),
};

export const settingsApi = {
  list: () => api.get<S<'SettingGroupItem'>[]>('/settings'),
  update: (group: string, body: S<'UpdateSettingsRequest'>) => api.put(`/settings/${encodeURIComponent(group)}`, body),
};

export const laborSettingsApi = {
  options: () => api.get<S<'LaborSettingsOptions'>>('/labor-settings/options'),
  tracks: () => api.get<S<'LaborTrackItem'>[]>('/labor-settings/tracks'),
  saveTrack: (body: S<'LaborTrackRequest'>) => api.post<number>('/labor-settings/tracks', body),
  trackSites: (trackId: number) => api.get<S<'LaborTrackSiteItem'>[]>(`/labor-settings/tracks/${trackId}/sites`),
  addTrackSite: (trackId: number, workSiteId: number) => api.put(`/labor-settings/tracks/${trackId}/sites/${workSiteId}`),
  removeTrackSite: (trackId: number, workSiteId: number) => api.delete(`/labor-settings/tracks/${trackId}/sites/${workSiteId}`),
  userScopes: (q: Q<'ListLaborUserScopes'>, signal?: AbortSignal) => api.get<S<'LaborUserScopeItem'>[]>('/labor-settings/user-scopes', q, { signal }),
  addUserScope: (body: S<'AddLaborUserScopeRequest'>) => api.post('/labor-settings/user-scopes', body),
  removeUserScope: (scopeId: number) => api.delete(`/labor-settings/user-scopes/${scopeId}`),
};

export const auditApi = {
  search: (q: Q<'SearchAudit'>, signal?: AbortSignal) => api.get<Paged<S<'AuditLogItem'>>>('/audit', q, { signal }),
  get: (id: number) => api.get<unknown>(`/audit/${id}`),
  /** Filter values: semantic actions (by module), modules, entity types and actors (TL-N6). */
  options: () => api.get<S<'AuditOptions'>>('/audit/options'),
};

export const integrationApi = {
  workers: (q: Q<'ListIntegrationWorkers'>, signal?: AbortSignal) => api.get<Paged<S<'IntegrationWorkerItem'>>>('/integration/workers', q, { signal }),
  events: (q: Q<'ListIntegrationEvents'>, signal?: AbortSignal) => api.get<Paged<S<'IntegrationEventItem'>>>('/integration/events', q, { signal }),
  acknowledge: (noticeId: number, body: S<'AcknowledgeIntegrationEventRequest'>) => api.post(`/integration/events/${noticeId}/acknowledge`, body),
  failure: (noticeId: number, body: S<'ReportIntegrationFailureRequest'>) => api.post(`/integration/events/${noticeId}/failure`, body),
  log: (q: Q<'ListIntegrationLog'>, signal?: AbortSignal) => api.get<Paged<S<'IntegrationLogItem'>>>('/integration/log', q, { signal }),
  migrate: (body: S<'MigrateCurrentWorkersRequest'>) => api.post<S<'MigrationReport'>>('/migration/current-workers', body),
};

export const backupsApi = {
  overview: () => api.get<S<'DatabaseBackupOverview'>>('/backups'),
  create: () => api.post('/backups'),
};
