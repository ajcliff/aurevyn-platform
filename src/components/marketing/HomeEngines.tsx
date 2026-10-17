// Every engine here exists in the app today. Keep this list in step with the engines table.
const ENGINES = [
  { icon: "🛒", name: "Point of Sale", core: true, body: "Barcode sales, split payments, discounts, refunds and receipts. Record cash, M-Pesa, bank and cheque payments. Keeps selling offline and syncs when you reconnect." },
  { icon: "📦", name: "Inventory", core: true, body: "Stock across shops and warehouses, transfers, batches, stock-takes and low-stock alerts, with cost tracked as stock comes in." },
  { icon: "💰", name: "Finance", core: true, body: "Cash, M-Pesa and bank accounts, customer invoices, credit customers, petty cash, reconciliation and a full ledger with VAT." },
  { icon: "📋", name: "Procurement", body: "Suppliers and purchase orders. Receive part of an order, or close it short when a supplier under-delivers." },
  { icon: "🧑‍💼", name: "HR & Payroll", body: "Staff records, payroll with PAYE, NSSF and NHIF, salary advances and payslips staff can open themselves." },
  { icon: "👥", name: "CRM", body: "Leads, customers and your sales pipeline, with follow-ups so nobody is forgotten." },
  { icon: "🧭", name: "Business Operations", body: "Projects, tasks, departments and teams, plus internal mail so staff talk inside AUREVYN." },
  { icon: "📊", name: "Analytics", body: "Revenue, trends and what is actually selling, from the same records your till and books use." },
  { icon: "⚙️", name: "Automation", body: "Scheduled invoices and purchase orders, and recurring tasks that run without you." },
  { icon: "✨", name: "AI Insights", body: "Recommendations and predictions drawn from your own sales and stock." },
];

export default function HomeEngines() {
  return (
    <section id="engines" className="mkt-section">
      <div className="mkt-container">
        <div className="mkt-eyebrow mkt-eyebrow--brass">The engines</div>
        <h2 className="mkt-h2" style={{ marginTop: 14, maxWidth: 620 }}>Ten engines that share one set of records.</h2>
        <p className="mkt-body-lg" style={{ marginTop: 12, maxWidth: 560 }}>
          A sale at the till lowers stock, lands in your cash account and shows in your reports without anyone retyping it. Start with the three core engines and add the rest when you need them.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginTop: 36 }}>
          {ENGINES.map((e) => (
            <div key={e.name} className="mkt-card" style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span aria-hidden="true" style={{ fontSize: "1.5rem" }}>{e.icon}</span>
                {e.core && <span className="mkt-tag">Core</span>}
              </div>
              <h3 className="mkt-h3" style={{ marginTop: 12, fontSize: "1.125rem" }}>{e.name}</h3>
              <p className="mkt-body" style={{ marginTop: 8, fontSize: "0.9375rem" }}>{e.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
