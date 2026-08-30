"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import s from "@/styles/layout.module.css";

import { createClient } from "@/lib/supabase";
import { getCurrentOrg } from "@/lib/runtime/currentOrg";

import { createReturn } from "@/lib/returns";

export default function ReturnSalePage() {
  const params = useParams<{ orgId: string; saleID: string }>();

  const router = useRouter();

  const supabase = createClient();

  const saleId = params.saleID;
  const orgIdFromUrl = params.orgId;

  const [orgId, setOrgId] = useState("");

  const [sale, setSale] = useState<any>(null);

  const [reason, setReason] = useState("");

  const [refundMethod, setRefundMethod] =
    useState("Cash");

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    load();
  }, []);

 async function load() {
    const org = await getCurrentOrg(orgIdFromUrl);

    if (!org) return;

    setOrgId(org.id);

    const { data } = await supabase
      .from("pos_sales")
      .select("*")
      .eq("id", saleId)
      .single();

    setSale(data);

    setLoading(false);
  }

  async function submitReturn() {
    if (!sale) return;

    await createReturn({
      orgId,
      saleId,

      reason,

      refundMethod,

      items:
        sale.items?.map((item: any) => ({
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
        })) ?? [],
    });

    alert("Return submitted.");

  router.push(`/org/${orgId}/pos/return`);
  }

  if (loading)
    return <div className="page-shell">Loading...</div>;

  return (
    <div className="page-shell">
      <main className="page-main">

        <h1 className={s.pageTitle}>
          Return Sale
        </h1>

        <div
          className={s.card}
          style={{ marginTop: 20 }}
        >
          <h3>
            Sale Total

            {" "}

            KES {Number(sale.total).toLocaleString()}
          </h3>

          <br />

          {sale.items?.map((item: any) => (
            <div
              key={item.product_name}
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                marginBottom: 10,
              }}
            >
              <span>
                {item.product_name}
              </span>

              <span>
                {item.quantity} × KES{" "}
                {Number(
                  item.unit_price
                ).toLocaleString()}
              </span>
            </div>
          ))}

          <br />

          <textarea
            className={s.input}
            placeholder="Reason"

            value={reason}

            onChange={(e) =>
              setReason(e.target.value)
            }
          />

          <br />

          <select
            className={s.input}
            value={refundMethod}
            onChange={(e) =>
              setRefundMethod(
                e.target.value
              )
            }
          >
            <option>Cash</option>

            <option>M-Pesa</option>

            <option>Bank</option>

            <option>Card</option>
          </select>

          <br />
          <br />

          <button
            className={s.btnGold}
            onClick={submitReturn}
          >
            Submit Return
          </button>

        </div>

      </main>
    </div>
  );
}