import { LayoutDashboard, ShieldCheck } from "lucide-react";
import PortalShell from "@/components/PortalShell";
import type { NavItem } from "@/components/SharedSidebar";

const NAV: NavItem[] = [
  { to: "/verifier", label: "Antrean", icon: LayoutDashboard, exact: true },
];

export default function VerifierLayout() {
  return (
    <PortalShell
      portalLabel="Workspace"
      variant="verifier"
      roleBadge={{ icon: ShieldCheck, label: "Verifikator" }}
      nav={NAV}
    />
  );
}
