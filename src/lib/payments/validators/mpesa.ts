import { z } from "zod";

export const mpesaConfigSchema = z.object({
  organizationId: z.uuid(),

  consumerKey: z.string().min(1, "Consumer Key is required"),

  consumerSecret: z.string().min(1, "Consumer Secret is required"),

  shortcode: z.string().min(5).max(10),

  passkey: z.string().min(1, "Passkey is required"),

  callbackUrl: z.url(),

  environment: z.enum(["sandbox", "live"]),
});

export type MpesaConfigInput = z.infer<typeof mpesaConfigSchema>;