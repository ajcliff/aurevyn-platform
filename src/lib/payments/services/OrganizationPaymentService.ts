import { supabaseAdmin } from "@/lib/supabase/server";
import { encrypt, decrypt } from "../utils/encryption";
import type { MpesaConfig } from "../types/payment";

export class OrganizationPaymentService {
  static async getMpesaConfig(
  organizationId: string
): Promise<MpesaCredentials> {
    const { data, error } = await supabaseAdmin
      .from("organization_mpesa_configs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .single();

    if (error) {
      throw new Error("No active M-Pesa configuration found.");
    }

    return {
  ...data,
  consumer_key: decrypt(data.consumer_key),
  consumer_secret: decrypt(data.consumer_secret),
  passkey: decrypt(data.passkey),
};
  }

static async saveMpesaConfig({
  organizationId,
  consumerKey,
  consumerSecret,
  shortcode,
  passkey,
  callbackUrl,
  environment,
}: MpesaConfig) {
  const { data, error } = await supabaseAdmin
    .from("organization_mpesa_configs")
    .upsert(
      {
        organization_id: organizationId,

        consumer_key: encrypt(consumerKey),
        consumer_secret: encrypt(consumerSecret),

        shortcode,

        passkey: encrypt(passkey),

        callback_url: callbackUrl,

        environment,

        active: true,
      },
      {
        onConflict: "organization_id",
      }
    )
    .select()
    .single();

  if (error) throw error;

  return data;
}

}