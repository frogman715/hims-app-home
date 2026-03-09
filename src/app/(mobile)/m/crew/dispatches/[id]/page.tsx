import { requireUser } from "@/lib/authz";
import MobileShell from "../../MobileShell";
import DispatchDetailClient from "./DispatchDetailClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DriverDispatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser({
    allowedRoles: ["DRIVER"],
    redirectOnDisallowed: "/m/crew",
  });

  const { id } = await params;

  return (
    <MobileShell title="Dispatch Detail" subtitle="Update pickup and check-in progress." activeTab="dispatch">
      <DispatchDetailClient dispatchId={id} />
    </MobileShell>
  );
}
