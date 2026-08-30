import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check for overdue invoices
    const { data: overdueInvoices } = await supabase
      .from("invoices")
      .select("*")
      .eq("status", "overdue");

    if (overdueInvoices && overdueInvoices.length > 0) {
      await supabase.from("notifications").insert({
        type: "system_alert",
        title: "Overdue Invoices Alert",
        message: `${overdueInvoices.length} invoice${overdueInvoices.length > 1 ? "s are" : " is"} currently overdue.`,
      });
    }

    // Check for critical orgs
    const { data: criticalOrgs } = await supabase
      .from("organizations")
      .select("*")
      .eq("status", "critical");

    if (criticalOrgs && criticalOrgs.length > 0) {
      await supabase.from("notifications").insert({
        type: "system_alert",
        title: "Critical Organizations",
        message: `${criticalOrgs.length} organization${criticalOrgs.length > 1 ? "s require" : " requires"} immediate attention.`,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});