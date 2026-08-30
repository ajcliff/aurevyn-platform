import { NextResponse } from "next/server";
import { OrganizationPaymentService } from "@/lib/payments/services/OrganizationPaymentService";
import { mpesaConfigSchema } from "@/lib/payments/validators/mpesa";

export async function POST(req: Request) {
  try {
    const json = await req.json();

    const body = mpesaConfigSchema.parse(json);

    const config =
      await OrganizationPaymentService.saveMpesaConfig(body);

    return NextResponse.json(config);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error";

    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}