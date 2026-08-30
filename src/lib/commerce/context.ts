import { CheckoutItem } from "./engine";

export interface CheckoutContext {
  items: CheckoutItem[];

  subtotal: number;

  customerId?: string;

  branchId?: string;

  cashier?: string;

  paymentMethod?: string;

  date: Date;
}