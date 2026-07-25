export type PaymentMethod = 0 | 1 | 2 | 3 | 4;

export type PaymentSource = 0 | 1 | 2;

export type PaymentResponse = {
  id: number;
  chargeId: number;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  source: PaymentSource;
  registeredByUserId: number;
  notes?: string | null;
  paidAt: string;
  createdAt: string;
};

export type CreateManualPaymentRequest = {
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paidAt?: string | null;
  notes?: string | null;
};
