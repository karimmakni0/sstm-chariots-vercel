import { Company } from '../models/company.model';

export const MOCK_COMPANIES: Company[] = [
  {
    id: 'c1', name: 'BTP Constructions', paymentStatus: 'PAID',
    usages: [
      { id: 'u1', chariotType: '5T', hoursWorked: 40, pricePerHour: 70, totalPrice: 2800, paymentStatus: 'Paid' },
      { id: 'u2', chariotType: '3T', hoursWorked: 24, pricePerHour: 50, totalPrice: 1200, paymentStatus: 'Unpaid' },
    ]
  },
  {
    id: 'c2', name: 'Logistique Express', paymentStatus: 'UNPAID',
    usages: [
      { id: 'u3', chariotType: '3T', hoursWorked: 60, pricePerHour: 50, totalPrice: 3000, paymentStatus: 'Paid' },
      { id: 'u4', chariotType: '7T', hoursWorked: 30, pricePerHour: 120, totalPrice: 3600, paymentStatus: 'Unpaid' },
    ]
  },
  {
    id: 'c3', name: 'Mines du Nord', paymentStatus: 'PAID',
    usages: [
      { id: 'u5', chariotType: '16T', hoursWorked: 80, pricePerHour: 200, totalPrice: 16000, paymentStatus: 'Paid' },
      { id: 'u6', chariotType: '7T', hoursWorked: 45, pricePerHour: 120, totalPrice: 5400, paymentStatus: 'Unpaid' },
    ]
  },
  {
    id: 'c4', name: 'Port Services SA', paymentStatus: 'PAID',
    usages: [
      { id: 'u7', chariotType: '16T', hoursWorked: 120, pricePerHour: 200, totalPrice: 24000, paymentStatus: 'Paid' },
    ]
  },
  {
    id: 'c5', name: 'Agro Maroc', paymentStatus: 'UNPAID',
    usages: [
      { id: 'u8', chariotType: '3T', hoursWorked: 20, pricePerHour: 50, totalPrice: 1000, paymentStatus: 'Unpaid' },
      { id: 'u9', chariotType: 'TP', hoursWorked: 50, pricePerHour: 30, totalPrice: 1500, paymentStatus: 'Paid' },
      { id: 'u10', chariotType: 'CM', hoursWorked: 10, pricePerHour: 150, totalPrice: 1500, paymentStatus: 'Unpaid' },
    ]
  },
];
