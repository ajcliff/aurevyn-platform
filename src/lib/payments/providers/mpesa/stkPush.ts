import { getAccessToken } from "./auth";
import { generatePassword } from "./password";

interface STKPushInput {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  callbackUrl: string;
  environment: "sandbox" | "live";

  phone: string;
  amount: number;

  accountReference: string;
  transactionDesc: string;
}

export async function stkPush(input: STKPushInput) {
  const accessToken = await getAccessToken(
    input.consumerKey,
    input.consumerSecret,
    input.environment
  );

  const { password, timestamp } = generatePassword(
    input.shortcode,
    input.passkey
  );

  const baseUrl =
    input.environment === "live"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

  const response = await fetch(
    `${baseUrl}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: input.shortcode,
        Password: password,
        Timestamp: timestamp,

        TransactionType: "CustomerPayBillOnline",

        Amount: input.amount,

        PartyA: input.phone,

        PartyB: input.shortcode,

        PhoneNumber: input.phone,

        CallBackURL: input.callbackUrl,

        AccountReference: input.accountReference,

        TransactionDesc: input.transactionDesc,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.errorMessage ?? "STK Push failed.");
  }

  return data;
}