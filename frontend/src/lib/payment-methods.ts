export type PaymentMethod = "CASH" | "QR" | "CARD" | "TRANSFER" | "OTHER";

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "เงินสด",
  QR: "QR PromptPay",
  CARD: "บัตร",
  TRANSFER: "โอนเงิน",
  OTHER: "อื่น ๆ",
};

export const checkoutPaymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: "CASH", label: paymentMethodLabels.CASH },
  { value: "QR", label: paymentMethodLabels.QR },
  { value: "CARD", label: paymentMethodLabels.CARD },
  { value: "TRANSFER", label: paymentMethodLabels.TRANSFER },
];
