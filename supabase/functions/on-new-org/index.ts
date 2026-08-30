import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    console.log("Received body:", body);

    let record;
    try {
      const parsed = JSON.parse(body);
      record = parsed.record ?? parsed;
    } catch {
      console.log("Failed to parse body");
      return new Response("Bad request", { status: 400 });
    }

    console.log("Record:", JSON.stringify(record));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: notifError } = await supabase.from("notifications").insert({
      type: "new_org",
      title: "New Organization Registered",
      message: `${record.name ?? "Unknown"} from ${record.location ?? "Unknown"} has joined the platform.`,
    });

    if (notifError) console.log("Notification error:", notifError.message);

    const { error: actError } = await supabase.from("activity").insert({
      icon: "🏢",
      title: "New organization registered",
      sub: record.name ?? "Unknown",
    });

    if (actError) console.log("Activity error:", actError.message);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.log("Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});