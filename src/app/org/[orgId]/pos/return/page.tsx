"use client";

import { useEffect, useState } from "react";

import s from "@/styles/layout.module.css";

import {
  getReturns,
  approveReturn,
  rejectReturn,
} from "@/lib/returns";

import { createRefund } from "@/lib/refunds";

import { useParams } from "next/navigation";
import { getCurrentOrg } from "@/lib/runtime/currentOrg";

export default function ReturnsPage() {
  const { orgId } = useParams<{ orgId: string }>();

  const [returns, setReturns] =
    useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {

const org =
      await getCurrentOrg(orgId);

    if (!org) return;

    setReturns(
      await getReturns(org.id)
    );
  }

  async function approve(item: any) {

    await approveReturn(item.id);

    await createRefund(
      item.id,
      item.refund_amount,
      item.refund_method
    );

    await load();
  }

  async function reject(item: any) {

    await rejectReturn(item.id);

    await load();
  }

  return (
    <div className="page-shell">

      <main className="page-main">

        <h1 className={s.pageTitle}>
          Returns
        </h1>

        <div
          style={{
            display: "grid",
            gap: 15,
            marginTop: 20,
          }}
        >
          {returns.map((item) => (

            <div
              key={item.id}
              className={s.card}
            >

              <h3>{item.reason}</h3>

              <p>
                Refund: KES{" "}
                {Number(
                  item.refund_amount
                ).toLocaleString()}
              </p>

              <p>{item.status}</p>

              {item.status ===
                "pending" && (
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 15,
                  }}
                >
                  <button
                    className={s.btnGold}
                    onClick={() =>
                      approve(item)
                    }
                  >
                    Approve
                  </button>

                  <button
                    className={s.btnGhost}
                    onClick={() =>
                      reject(item)
                    }
                  >
                    Reject
                  </button>
                </div>
              )}

            </div>

          ))}
        </div>

      </main>

    </div>
  );
}