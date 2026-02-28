/**
 * event-utils.ts — Pure event registration logic
 * No side effects, no imports from services
 */

export interface RegistrationStatus {
  isFull: boolean;
  isExpired: boolean;
  spotsLeft: number | null;
  occupancyPercent: number;
}

export function getRegistrationStatus(
  maxCapacity: number | undefined,
  occupancy: number,
  deadline: string | undefined,
): RegistrationStatus {
  return {
    isFull: maxCapacity ? occupancy >= maxCapacity : false,
    isExpired: deadline ? new Date(deadline) < new Date() : false,
    spotsLeft: maxCapacity ? maxCapacity - occupancy : null,
    occupancyPercent: maxCapacity ? Math.min(100, Math.round((occupancy / maxCapacity) * 100)) : 0,
  };
}
