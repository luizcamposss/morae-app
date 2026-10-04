export type PaymentMethod = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

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

export type PaymentReceipt = {
  chargeId: number;
  description: string;
  scope: 1 | 2;
  condominiumName: string;
  unitLabel?: string | null;
  receiverName: string;
  amountPaid: number;
  paidAt: string;
  paymentMethod: PaymentMethod;
  source: PaymentSource;
  mercadoPagoPaymentId?: number | null;
  registeredByName: string;
  canRefund: boolean;
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  0: "Não informado",
  1: "Pix",
  2: "Cartão de crédito",
  3: "Cartão de débito",
  4: "Boleto",
  5: "Transferência bancária",
  6: "Saldo Mercado Pago",
  7: "Cartão pré-pago",
  8: "Carteira digital",
  9: "Outro",
};
