"use client";

import { useEffect, useState } from "react";
import s from "@/styles/layout.module.css";

import {
  getCustomers,
  type Customer,
} from "@/lib/customers";

type Props = {
  orgId: string;
  value: string;
  onChange: (customer: Customer | null) => void;
  refreshKey: number;
};

export default function CustomerSelector({
  orgId,
  value,
  onChange,
  refreshKey,
}: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    if (!orgId) return;

    getCustomers(orgId)
      .then(setCustomers)
      .catch(console.error);
  }, [orgId, refreshKey]);

  function handleChange(id: string) {
    if (!id) {
      onChange(null);
      return;
    }
    const found = customers.find((c) => c.id === id);
    onChange(found ?? null);
  }

  return (
    <select
      className={s.input}
      value={value}
      onChange={(e) => handleChange(e.target.value)}
    >
      <option value="">
        Walk-in Customer
      </option>

      {customers.map((customer) => (
        <option
          key={customer.id}
          value={customer.id}
        >
          {customer.name}
        </option>
      ))}
    </select>
  );
}