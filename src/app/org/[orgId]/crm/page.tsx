"use client";

import { useParams } from "next/navigation";
import CrmDashboard from "@/lib/engines/crm/CrmDashboard";

export default function CrmPage() {
  const { orgId } = useParams<{ orgId: string }>();
  return <CrmDashboard orgId={orgId} />;
}
