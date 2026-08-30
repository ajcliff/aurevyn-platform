export type MpesaEnvironment = "sandbox" | "live";

export interface MpesaConfig {
  organizationId: string;
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  callbackUrl: string;
  environment: MpesaEnvironment;
}

export interface MpesaCredentials {
  organization_id: string;
  consumer_key: string;
  consumer_secret: string;
  shortcode: string;
  passkey: string;
  callback_url: string;
  environment: MpesaEnvironment;
  active: boolean;
}