import { api, type TransferOptions } from '@/services/api/client';
import type { S } from '@/types/api';

export const authApi = {
  login: (body: S<'LoginRequest'>) => api.post<S<'TokenResponse'>>('/auth/login', body),
  logout: (body: S<'LogoutRequest'>) => api.post('/auth/logout', body),
  me: () => api.get<S<'CurrentUserResponse'>>('/auth/me'),
  changePassword: (body: S<'ChangePasswordRequest'>) => api.post('/auth/change-password', body),
  setLanguage: (body: S<'SetPreferredLanguageRequest'>) => api.put('/auth/me/language', body),
  /** TL-N3: uploads (or replaces, until approved) the user's assignment letter — PDF in field `file`. */
  submitAssignment: (file: File, transfer?: TransferOptions) => api.postForm('/auth/me/assignment', { file }, transfer),
};
