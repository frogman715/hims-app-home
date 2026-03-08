import type { ReactNode } from "react";
import { requireUser } from "@/lib/authz";

export default async function PrincipalLayout({ children }: { children: ReactNode }) {
  await requireUser({
    allowedRoles: ["PRINCIPAL"],
    redirectOnDisallowed: "/dashboard",
  });

  return <>{children}</>;
}
