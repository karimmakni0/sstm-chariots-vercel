export type ChariotType = '3T' | '5T' | '7T' | '16T' | 'TP' | 'CM';
export type PaymentStatus = 'Paid' | 'Unpaid';

export interface ChariotUsage {
  id: string;
  chariotType: ChariotType;
  hoursWorked: number;
  pricePerHour: number;
  totalPrice: number;
  paymentStatus: PaymentStatus;
}

export interface Company {
  id: string;
  name: string;
  paymentStatus: 'PAID' | 'UNPAID';
  usages: ChariotUsage[];
}

export const DEFAULT_PRICES: Record<ChariotType, number> = {
  '3T': 50,
  '5T': 70,
  '7T': 120,
  '16T': 200,
  'TP': 30,
  'CM': 150,
};
