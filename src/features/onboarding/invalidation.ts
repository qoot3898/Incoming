import type { QueryKey } from '@tanstack/react-query';
import { onboardingKeys } from './api';
import { workersKeys } from '@/features/workers/api';
import { tasksKeys } from '@/features/tasks/api';
import { payrollKeys } from '@/features/payroll/api';

/** Query keys refreshed after any onboarding action. */
export function useOnboardingInvalidation(): QueryKey[] {
  return [onboardingKeys.all, workersKeys.all, tasksKeys.all, payrollKeys.all];
}
