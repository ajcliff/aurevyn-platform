import { createClient } from "@/lib/supabase";
import type { CommandItem } from "@/components/CommandPalette";

export async function searchOrgData(
  orgId: string,
  query: string,
  installedSlugs: string[],
  currentUserId?: string | null
): Promise<CommandItem[]> {
  if (!query.trim() || query.length < 2) return [];

  const supabase = createClient();
  const results: CommandItem[] = [];
  const q = `%${query}%`;

  if (installedSlugs.includes("inventory")) {
    const { data } = await supabase
      .from("inventory_products")
      .select("id, name, sku")
      .eq("org_id", orgId)
      .ilike("name", q)
      .limit(5);

    (data || []).forEach((p) => {
      results.push({
        id: `product-${p.id}`,
        label: `${p.name} (${p.sku})`,
        icon: "📦",
        path: `/org/${orgId}/inventory`,
        keywords: "product inventory stock",
      });
    });

    // If the query looks like a price, also match products near that value
    const numericQuery = Number(query.replace(/[^0-9.]/g, ""));
    if (!isNaN(numericQuery) && numericQuery > 0) {
      const { data: priceMatches } = await supabase
        .from("inventory_products")
        .select("id, name, sku, unit_price")
        .eq("org_id", orgId)
        .gte("unit_price", numericQuery * 0.9)
        .lte("unit_price", numericQuery * 1.1)
        .limit(5);

      (priceMatches || []).forEach((p) => {
        if (results.some((r) => r.id === `product-${p.id}`)) return;
        results.push({
          id: `product-${p.id}`,
          label: `${p.name} — KES ${Number(p.unit_price).toLocaleString()}`,
          icon: "💰",
          path: `/org/${orgId}/inventory`,
          keywords: "product price",
        });
      });
    }

    const { data: warehouses } = await supabase
      .from("warehouses")
      .select("id, name, code")
      .eq("org_id", orgId)
      .ilike("name", q)
      .limit(5);

    (warehouses || []).forEach((w) => {
      results.push({
        id: `warehouse-${w.id}`,
        label: `${w.name}${w.code ? ` (${w.code})` : ""}`,
        icon: "🏬",
        path: `/org/${orgId}/warehouses`,
        keywords: "warehouse location",
      });
    });

    const { data: pricelists } = await supabase
      .from("pricelists")
      .select("id, name")
      .eq("org_id", orgId)
      .ilike("name", q)
      .limit(5);

    (pricelists || []).forEach((pl) => {
      results.push({
        id: `pricelist-${pl.id}`,
        label: pl.name,
        icon: "🏷️",
        path: `/org/${orgId}/pricelists`,
        keywords: "pricelist pricing",
      });
    });
  }

  if (installedSlugs.includes("crm")) {
    const { data } = await supabase
      .from("customers")
      .select("id, name, company")
      .eq("org_id", orgId)
      .ilike("name", q)
      .limit(5);

    (data || []).forEach((c) => {
      results.push({
        id: `customer-${c.id}`,
        label: `${c.name}${c.company ? ` — ${c.company}` : ""}`,
        icon: "👥",
        path: `/org/${orgId}/crm`,
        keywords: "customer crm",
      });
    });

    const { data: deals } = await supabase
      .from("deals")
      .select("id, title, value")
      .eq("org_id", orgId)
      .ilike("title", q)
      .limit(5);

    (deals || []).forEach((d) => {
      results.push({
        id: `deal-${d.id}`,
        label: `${d.title} — KES ${Number(d.value).toLocaleString()}`,
        icon: "📈",
        path: `/org/${orgId}/crm`,
        keywords: "deal pipeline",
      });
    });
  }

  if (installedSlugs.includes("hr-payroll")) {
    const { data } = await supabase
      .from("employees")
      .select("id, full_name, role")
      .eq("org_id", orgId)
      .ilike("full_name", q)
      .limit(5);

    (data || []).forEach((e) => {
      results.push({
        id: `employee-${e.id}`,
        label: `${e.full_name}${e.role ? ` — ${e.role}` : ""}`,
        icon: "🧑‍💼",
        path: `/org/${orgId}/employees`,
        keywords: "employee staff hr",
      });
    });
  }

  if (installedSlugs.includes("finance")) {
    const { data: invoices } = await supabase
      .from("org_invoices")
      .select("id, invoice_number, total, customers(name)")
      .eq("org_id", orgId)
      .ilike("invoice_number", q)
      .limit(5);

    (invoices || []).forEach((inv: any) => {
      results.push({
        id: `invoice-${inv.id}`,
        label: `${inv.invoice_number} — KES ${Number(inv.total).toLocaleString()}`,
        icon: "🧾",
        path: `/org/${orgId}/finance/invoices`,
        keywords: "invoice finance billing",
      });
    });
  }

  const { data: docs } = await supabase
    .from("documents")
    .select("id, name, category")
    .eq("org_id", orgId)
    .ilike("name", q)
    .limit(5);

  (docs || []).forEach((d) => {
    results.push({
      id: `document-${d.id}`,
      label: `${d.name} (${d.category})`,
      icon: "📄",
      path: `/org/${orgId}/documents`,
      keywords: "document file",
    });
  });

  const { data: articles } = await supabase
    .from("knowledge_articles")
    .select("id, title, category")
    .eq("org_id", orgId)
    .ilike("title", q)
    .limit(5);

  (articles || []).forEach((a) => {
    results.push({
      id: `knowledge-${a.id}`,
      label: `${a.title} (${a.category})`,
      icon: "📚",
      path: `/org/${orgId}/knowledge`,
      keywords: "knowledge base sop policy",
    });
  });

  const { data: approvals } = await supabase
    .from("approval_requests")
    .select("id, title, status")
    .eq("org_id", orgId)
    .ilike("title", q)
    .limit(5);

  (approvals || []).forEach((a) => {
    results.push({
      id: `approval-${a.id}`,
      label: `${a.title} (${a.status})`,
      icon: "✅",
      path: `/org/${orgId}/approvals`,
      keywords: "approval request",
    });
  });

  // Salary is never searchable across the org — only surfaced from the
  // searching person's own linked employee record, never anyone else's
  if (currentUserId && /salary|pay ?slip|wage/i.test(query)) {
    const { data: myEmployee } = await supabase
      .from("employees")
      .select("id, salary")
      .eq("org_id", orgId)
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (myEmployee) {
      results.push({
        id: "my-salary",
        label: `My Salary — KES ${Number(myEmployee.salary).toLocaleString()}`,
        icon: "💵",
        path: `/org/${orgId}/employees`,
        keywords: "salary payslip pay wage personal",
      });
    }
  }

  return results;
}