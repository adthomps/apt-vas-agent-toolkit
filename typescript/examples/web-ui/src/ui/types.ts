// Shared UI types

export type Toast = {
  type: 'success' | 'error' | 'warning' | 'info' | 'primary' | 'muted' | 'destructive';
  message: string;
};

export interface Invoice {
  id?: string;
  customerInformation?: { name?: string };
  orderInformation?: {
    amountDetails?: { totalAmount?: string; currency?: string };
    lineItems?: Array<{ productName?: string; productDescription?: string }>;
  };
  status?: string;
  invoiceInformation?: { dueDate?: string; paymentLink?: string; paymentPageUrl?: string; invoiceUrl?: string };
  [key: string]: any;
}

export interface PayLink {
  id?: string;
  amount?: string;
  currency?: string;
  memo?: string;
  created?: string;
  [key: string]: any;
}
