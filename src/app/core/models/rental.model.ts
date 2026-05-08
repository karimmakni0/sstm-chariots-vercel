import { ForkliftType } from './forklift.model';

export type PaymentStatus = 'Paid' | 'Unpaid' | 'Partial';

export interface Rental {
  id: string;
  companyId: string;
  forkliftType: ForkliftType;
  hoursWorked: number;
  pricePerHour: number;
  totalPrice: number;
  startDate: string;
  endDate: string;
  paymentStatus: PaymentStatus;
  notes: string;
}
