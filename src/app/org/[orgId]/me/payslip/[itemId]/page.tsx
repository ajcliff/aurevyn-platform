"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import jsPDF from "jspdf";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getPayslip, type Payslip } from "@/lib/hr";
import EmptyState from "@/components/EmptyState";

const kes = (n: number) => `KES ${Number(n).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;

const cardStyle: React.CSSProperties = {
  background: "var(--surface, #12161f)",
  border: "1px solid var(--border, #232838)",
  borderRadius: 12,
  padding: 24,
  maxWidth: 560,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 0",
  borderBottom: "1px solid var(--border, #232838)",
  fontSize: 14,
};

export default function PayslipPage() {
  const { orgId, itemId } = useParams<{ orgId: string; itemId: string }>();
  const { organization } = useEngine();

  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPayslip(orgId, itemId).then((p) => {
      setPayslip(p);
      setLoading(false);
    });
  }, [orgId, itemId]);

  function handleDownloadPDF() {
    if (!payslip) return;
    const { item, employee, run } = payslip;
    const pdf = new jsPDF();
    let y = 20;

    pdf.setFontSize(16);
    pdf.text(organization.name, 20, y);
    y += 8;
    pdf.setFontSize(11);
    pdf.text("Payslip", 20, y);
    y += 10;

    pdf.setFontSize(10);
    pdf.text(`Employee: ${employee.full_name}`, 20, y); y += 6;
    pdf.text(`Role: ${employee.role ?? "—"}${employee.department ? " · " + employee.department : ""}`, 20, y); y += 6;
    pdf.text(`Period: ${run.period_start} to ${run.period_end}`, 20, y); y += 10;

    pdf.line(20, y, 190, y);
    y += 8;

    const line = (label: string, value: string) => {
      pdf.text(label, 20, y);
      pdf.text(value, 190, y, { align: "right" });
      y += 7;
    };

    line("Gross Pay", kes(item.gross_pay));
    y += 3;
    pdf.setFontSize(9);
    pdf.text("Deductions", 20, y); y += 6;
    pdf.setFontSize(10);
    line("  NSSF", `-${kes(item.nssf)}`);
    line("  SHIF", `-${kes(item.shif)}`);
    line("  Affordable Housing Levy", `-${kes(item.ahl)}`);
    line("  PAYE", `-${kes(item.paye)}`);
    if (item.advance_repayment > 0) line("  Salary Advance Repayment", `-${kes(item.advance_repayment)}`);
    y += 3;
    pdf.line(20, y, 190, y);
    y += 8;
    pdf.setFontSize(12);
    line("Net Pay", kes(item.net_pay));

    if (item.employer_contributions > 0) {
      y += 10;
      pdf.setFontSize(8);
      pdf.text(
        `Employer statutory contributions (not deducted from your pay): ${kes(item.employer_contributions)}`,
        20,
        y
      );
    }

    pdf.save(`Payslip-${employee.full_name.replace(/\s+/g, "-")}-${run.period_start}.pdf`);
  }

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (!payslip) return <EmptyState icon="🧾" message="Payslip not found." />;

  const { item, employee, run } = payslip;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 560, marginBottom: 16 }}>
        <h1 style={{ fontSize: 20 }}>Payslip</h1>
        <button
          onClick={handleDownloadPDF}
          style={{ background: "var(--accent, #e8b923)", color: "#111", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: "pointer" }}
        >
          Download PDF
        </button>
      </div>

      <div style={cardStyle}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{employee.full_name}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {employee.role ?? "—"}{employee.department ? ` · ${employee.department}` : ""}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {run.period_start} to {run.period_end} · {run.status}
          </div>
        </div>

        <div style={rowStyle}><span>Gross Pay</span><span style={{ fontWeight: 600 }}>{kes(item.gross_pay)}</span></div>

        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 12, marginBottom: 4 }}>DEDUCTIONS</div>
        <div style={rowStyle}><span>NSSF</span><span>-{kes(item.nssf)}</span></div>
        <div style={rowStyle}><span>SHIF</span><span>-{kes(item.shif)}</span></div>
        <div style={rowStyle}><span>Affordable Housing Levy</span><span>-{kes(item.ahl)}</span></div>
        <div style={rowStyle}><span>PAYE</span><span>-{kes(item.paye)}</span></div>
        {item.advance_repayment > 0 && (
          <div style={rowStyle}><span>Salary Advance Repayment</span><span>-{kes(item.advance_repayment)}</span></div>
        )}

        <div style={{ ...rowStyle, borderBottom: "none", marginTop: 8, fontSize: 16, fontWeight: 700 }}>
          <span>Net Pay</span><span>{kes(item.net_pay)}</span>
        </div>

        {item.employer_contributions > 0 && (
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 16, paddingTop: 12, borderTop: "1px dashed var(--border, #232838)" }}>
            Employer statutory contributions (NSSF + AHL match — not deducted from your pay): {kes(item.employer_contributions)}
          </div>
        )}
      </div>
    </div>
  );
}
