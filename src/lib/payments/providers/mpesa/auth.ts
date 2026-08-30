export async function getAccessToken(
  consumerKey: string,
  consumerSecret: string,
  environment: "sandbox" | "live"
) {
  const auth = Buffer.from(
    `${consumerKey}:${consumerSecret}`
  ).toString("base64");

  const baseUrl =
    environment === "live"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

  const response = await fetch(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to obtain M-Pesa access token.");
  }

  const data = await response.json();

  return data.access_token as string;
}