import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/server/guards";

// Marks the welcome tour as seen. Done server-side because owners can't update
// the organizations table directly (founder-only), so a client update silently failed.
export async function POST(req: NextRequest) {
  const { orgId } = await req.json();
  const access = orgId ? await requireOrgMember(orgId) : null;
  if (!access) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const { error } = await supabaseAdmin.from("organizations").update({ onboarding_completed: true }).eq("id", orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
