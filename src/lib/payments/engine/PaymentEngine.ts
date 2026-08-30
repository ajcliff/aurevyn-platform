import { OrganizationPaymentService } from "../services/OrganizationPaymentService";
import { stkPush } from "../providers/mpesa/stkPush";

export interface CreatePaymentInput {
  organizationId: string;
  amount: number;
  phone: string;
  saleId?: string;
}

export class PaymentEngine {
  static async createPayment(input: CreatePaymentInput) {
    const config =
      await OrganizationPaymentService.getMpesaConfig(
        input.organizationId
      );

    return await stkPush({
      consumerKey: config.consumer_key,
      consumerSecret: config.consumer_secret,
      shortcode: config.shortcode,
      passkey: config.passkey,
      callbackUrl: config.callback_url,
      environment: config.environment,

      phone: input.phone,
      amount: input.amount,

      accountReference: input.saleId ?? "AUREVYN",
      transactionDesc: "Payment",
    });
  }
}