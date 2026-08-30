// lib/engines/payments/manifest.ts

export const PAYMENTS_ENGINE = {
  id: "payments",

  name: "Payments",

  version: "1.0.0",

  category: "Finance",

  icon: "💸",

  description:
    "Payment provider configuration and collection — M-Pesa STK Push and future providers",

  routes: [
    "providers"
  ],

  permissions: [
    "payments.configure",
    "payments.initiate"
  ],

  dependencies: []
};