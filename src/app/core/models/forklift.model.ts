export type ForkliftType = '3T' | '5T' | '7T' | '16T';
export type ForkliftStatus = 'Available' | 'In Use' | 'Maintenance';

export interface Forklift {
  id: string;
  type: ForkliftType;
  description: string;
  hourlyPrice: number;
  availabilityStatus: ForkliftStatus;
}
