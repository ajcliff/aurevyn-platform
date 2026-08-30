import { createClient } from "@/lib/supabase";

const supabase = createClient();

export interface RegisterSession {

  id: string;

  org_id: string;

  register_id: string;

  opened_by: string | null;

  closed_by: string | null;

  opening_float: number;

  expected_cash: number;

  actual_cash: number;

  variance: number;

  status: "OPEN" | "CLOSED";

  opened_at: string;

  closed_at: string | null;
}

export async function getOpenRegister(
  orgId: string
): Promise<RegisterSession | null> {

  const { data, error } = await supabase

    .from("pos_register_sessions")

    .select("*")

    .eq("org_id", orgId)

    .eq("status", "OPEN")

    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function openRegister(

  orgId: string,

  registerId: string,

  openingFloat: number

): Promise<void> {

  const { error } = await supabase

    .from("pos_register_sessions")

    .insert({

      org_id: orgId,

      register_id: registerId,

      opening_float: openingFloat,

      status: "OPEN"

    });

  if (error) throw error;
}

export async function closeRegister(

  sessionId: string,

  expectedCash: number,

  actualCash: number

): Promise<void> {

  const variance = actualCash - expectedCash;

  const { error } = await supabase

    .from("pos_register_sessions")

    .update({

      expected_cash: expectedCash,

      actual_cash: actualCash,

      variance,

      status: "CLOSED",

      closed_at: new Date().toISOString()

    })

    .eq("id", sessionId);

  if (error) throw error;
}

export interface PosRegister {
  id: string;
  org_id: string;
  name: string;
}

export async function getRegisters(
  orgId: string
): Promise<PosRegister[]> {

  const { data, error } = await supabase
    .from("pos_registers")
    .select("*")
    .eq("org_id", orgId)
    .order("name");

  if (error) throw error;

  return data ?? [];
}