"use client";

import s from "@/styles/layout.module.css";
import jsPDF from "jspdf";


type ReceiptItem = {
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
};

type Props = {
  open: boolean;
  onClose: () => void;

  sale: {
    id: string;
    total: number;
    payment_method: string;
    cashier: string;
    created_at?: string;
    items: ReceiptItem[];
  } | null;
};

export default function ReceiptModal({
  open,
  onClose,
  sale,
}: Props) {
  if (!open || !sale) return null;


function formatReceiptNumber(id: string) {
  const year = new Date().getFullYear();

  const digits = id
    .replace(/\D/g, "")
    .slice(-6)
    .padStart(6, "0");

  return `AV-${year}-${digits}`;
}



function handlePrint() {
  const receipt = document.getElementById("receipt-print");

  if (!receipt) return;

  const printWindow = window.open("", "", "width=400,height=700");

  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Receipt</title>
        <style>
          body{
            font-family:Arial,sans-serif;
            padding:20px;
            color:#000;
          }

          #receipt-print{
            width:300px;
            margin:auto;
          }

          button{
            display:none;
          }
        </style>
      </head>

      <body>
        ${receipt.outerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();

  printWindow.focus();

  printWindow.print();

  printWindow.close();
}

function handleDownloadPDF() {
  if (!sale) return;

  const pdf = new jsPDF();

  let y = 20;

 pdf.setFontSize(24);
  pdf.text("AUREVYN", 20, y);

  y += 10;

  pdf.setFontSize(10);

  pdf.text(
    `Receipt ${formatReceiptNumber(sale.id)}`,
    20,
    y
  );

  y += 10;

  pdf.text(
    `Date: ${new Date(
      sale.created_at ?? Date.now()
    ).toLocaleString()}`,
    20,
    y
  );

  y += 10;

  pdf.text(
    `Payment: ${sale.payment_method}`,
    20,
    y
  );

  y += 15;

  sale.items.forEach((item) => {
    pdf.text(
      `${item.product_name}`,
      20,
      y
    );

    pdf.text(
      `${item.quantity} x ${item.unit_price}`,
      110,
      y
    );

    pdf.text(
      `${item.total}`,
      170,
      y,
      {
        align: "right",
      }
    );

    y += 8;
  });

  y += 10;

  pdf.setFontSize(14);

  pdf.text(
    `TOTAL: KES ${sale.total.toLocaleString()}`,
    20,
    y
  );

  y += 20;

  pdf.setFontSize(10);

  pdf.text(
    "Thank you for shopping with AUREVYN",
    20,
    y
  );

  pdf.save(
    `Receipt-${formatReceiptNumber(sale.id)}.pdf`
  );
}

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.65)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
<div
  id="receipt-print"
  className={s.card}
        style={{
         width: 320,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 18,
          borderRadius: 16,
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: 20,
          }}
        >
<div
  style={{
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: 2,
  }}
>
  AUREVYN
</div>

<div
  style={{
    marginTop: 4,
    fontSize: 11,
  }}
>
  Intelligent Business Platform
</div>

<div
  style={{
    fontSize: 11,
  }}
>
  Nairobi, Kenya
</div>

<div
  style={{
    fontSize: 11,
  }}
>
  Tel: +254 703 366 475
</div>

<div
  style={{
    fontSize: 12,
    opacity: .6,
  }}
>
  www.aurevyn.com
</div>

          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              color: "#888",
            }}
          >
         Receipt No.

{formatReceiptNumber(sale.id)}
          </div>
        </div>

        <div
  style={{
    borderTop: "1px dashed #999",
    margin: "14px 0",
  }}
/>

        <div
          style={{
            marginTop: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ marginTop: 12, marginBottom: 12 }}>

  <div>
    <strong>Date:</strong>{" "}
    {new Date(sale.created_at ?? Date.now()).toLocaleString("en-KE")}
  </div>

  <div>
    <strong>Reference:</strong>{" "}
    {sale.id.slice(0,8).toUpperCase()}
  </div>

  <div>
    <strong>Cashier:</strong>{" "}
    {sale.cashier}
  </div>

  <div>
    <strong>Terminal:</strong> POS-01
  </div>

  <div>
    <strong>Payment:</strong>{" "}
    {sale.payment_method}
  </div>

  <div>
    <strong>Status:</strong> PAID
  </div>

</div>
        </div>

       <div
  style={{
    borderTop: "1px dashed #999",
    margin: "14px 0",
  }}
/>

        <div
          style={{
            marginTop: 15,
          }}
        >
          {sale.items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div>
                {item.product_name}

                <div
                  style={{
                    fontSize: 12,
                    opacity: .7,
                  }}
                >
                  {item.quantity} × KES{" "}
                  {item.unit_price.toLocaleString()}
                </div>
              </div>

              <strong>
                KES {item.total.toLocaleString()}
              </strong>
            </div>
          ))}
        </div>

        <div
  style={{
    borderTop: "1px dashed #999",
    margin: "14px 0",
  }}
/>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
           fontSize: 24,
            fontWeight: 700,
            marginTop: 20,
            letterSpacing: 1,
          }}
        >
          <span>TOTAL DUE</span>

          <span>
            KES {sale.total.toLocaleString()}
          </span>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: 25,
            color: "#999",
          }}
        >
         <div
  style={{
    marginTop: 18,
    fontWeight: 600,
  }}
>
  THANK YOU
</div>


<div
  style={{
    fontSize:11,
    marginTop:14
  }}
>
Visit us again
</div>

<div
  style={{
    fontSize: 11,
    marginTop: 8,
  }}
>
  Powered by AUREVYN
</div>

<div
  style={{
    fontSize: 10,
    opacity: .6,
    marginTop: 6,
  }}
>
  Intelligent Business Platform
</div>
        </div>

<div
  style={{
    display: "flex",
    gap: 10,
    marginTop: 25,
  }}
>
  <button
    className={s.btnGold}
    style={{ flex: 1 }}
    onClick={handlePrint}
  >
    🖨 Print
  </button>

  <button
    className={s.filterBtn}
    style={{ flex: 1 }}
    onClick={() => {
      handleDownloadPDF();
    }}
  >
    📄 PDF
  </button>

  <button
    className={s.btnGhost}
    style={{ flex: 1 }}
    onClick={onClose}
  >
    Close
  </button>
</div>
      </div>
    </div>
  );
}