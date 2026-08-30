"use client";

import { useParams } from "next/navigation";
import HrDashboard from "@/lib/engines/hr-payroll/HrDashboard";

export default function HrPayrollPage() {
  const { orgId } = useParams<{ orgId: string }>();
  return <HrDashboard orgId={orgId} />;
}
