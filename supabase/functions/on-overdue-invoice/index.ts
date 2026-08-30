import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;

    if (record.status !== "overdue") {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("notifications").insert({
      type: "overdue_invoice",
      title: "Payment Overdue",
      message: `${record.org_name} has an overdue invoice of ${record.amount}.`,
    });

    await supabase.from("activity").insert({
      icon: "⚠",
      title: "Invoice overdue",
      sub: `${record.amount} from ${record.org_name}`,
    });

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