import { getLowStockProducts, getProducts } from "@/lib/inventory";
import { getSales } from "@/lib/pos";
import { getApprovalRequests } from "@/lib/approvals";
import { getOrgActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase";

export async function buildOrgBrainPrompt(
  orgId: string,
  orgName: string,
  installedSlugs: string[]
): Promise<string> {
  const supabase = createClient();
  const sections: string[] = [];

  if (installedSlugs.includes("inventory")) {
    const [products, lowStock] = await Promise.all([
      getProducts(orgId),
      getLowStockProducts(orgId),
    ]);
    const totalValue = products.reduce((s, p) => s + p.stock_quantity * p.unit_price, 0);
    sections.push(
      `INVENTORY: ${products.length} products, total stock value KES ${totalValue.toLocaleString()}. ` +
      `${lowStock.length} product(s) low on stock: ${lowStock.map(p => `${p.name} (${p.stock_quantity} left)`).join(", ") || "none"}.`
    );
  }

  if (installedSlugs.includes("pos")) {
    const sales = await getSales(orgId);
    const today = new Date().toDateString();
    const todaySales = sales.filter(s => new Date(s.created_at!).toDateString() === today);
    const todayRevenue = todaySales.reduce((s, x) => s + Number(x.total), 0);
    const last7 = sales.filter(s => (Date.now() - new Date(s.created_at!).getTime()) / 86400000 <= 7);
    const last7Total = last7.reduce((s, x) => s + Number(x.total), 0);
    sections.push(
      `SALES: Today's revenue KES ${todayRevenue.toLocaleString()} (${todaySales.length} transactions). ` +
      `Last 7 days: KES ${last7Total.toLocaleString()} across ${last7.length} transactions.`
    );
  }

  if (installedSlugs.includes("crm")) {
    const { data: customers } = await supabase.from("customers").select("id, status").eq("org_id", orgId);
    const { data: deals } = await supabase.from("deals").select("value, stage").eq("org_id", orgId);
    const openPipeline = (deals || []).filter(d => d.stage !== "won" && d.stage !== "lost")
      .reduce((s, d) => s + Number(d.value || 0), 0);
    sections.push(
      `CRM: ${customers?.length || 0} customers. Open pipeline value: KES ${openPipeline.toLocaleString()} across ${(deals || []).filter(d => d.stage !== "won" && d.stage !== "lost").length} active deals.`
    );
  }

  if (installedSlugs.includes("hr-payroll")) {
    const { data: employees } = await supabase.from("employees").select("employment_status").eq("org_id", orgId);
    const { data: pendingLeave } = await supabase.from("leave_requests").select("id").eq("org_id", orgId).eq("status", "pending");
    const active = (employees || []).filter(e => e.employment_status === "active").length;
    sections.push(
      `HR: ${employees?.length || 0} employees (${active} active). ${pendingLeave?.length || 0} leave request(s) awaiting decision.`
    );
  }

  const approvals = await getApprovalRequests(orgId);
  const pending = approvals.filter(a => a.status === "pending");
  sections.push(
    `APPROVALS: ${pending.length} pending request(s): ${pending.map(a => `${a.title} (${a.type}${a.amount ? `, KES ${a.amount.toLocaleString()}` : ""})`).join("; ") || "none"}.`
  );

  const recentActivity = await getOrgActivity(orgId, 8);
  sections.push(
    `RECENT ACTIVITY: ${recentActivity.map(a => `${a.title}${a.sub ? ` (${a.sub})` : ""}`).join("; ") || "none"}.`
  );

  return `You are the AUREVYN Intelligence assistant for "${orgName}". You have access to this organization's live, real data below — nothing is simulated. Answer questions using only this data. Be concise, sharp, and specific with real numbers. Use bullet points for lists. Keep responses under 150 words unless asked for more detail.

LIVE DATA FOR ${orgName.toUpperCase()}:

${sections.join("\n\n")}`;
}