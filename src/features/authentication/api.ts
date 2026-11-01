import { api } from '@/services/api/client';
import type { S } from '@/types/api';

export const authApi = {
  login: (body: S<'LoginRequest'>) => api.post<S<'TokenResponse'>>('/auth/login', body),
  logout: (body: S<'LogoutRequest'>) => api.post('/auth/logout', body),
  me: () => api.get<S<'CurrentUserResponse'>>('/auth/me'),
  changePassword: (body: S<'ChangePasswordRequest'>) => api.post('/auth/change-password', body),
  setLanguage: (body: S<'SetPreferredLanguageRequest'>) => api.put('/auth/me/language', body),
};
