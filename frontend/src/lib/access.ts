import type { User } from "@/types";

/**
 * Which portals a user may enter. Derived from assigned RBAC roles — NOT from
 * `is_staff`. An OIKN employee authenticated via SSO is `is_staff=true` with no
 * roles; they are a plain pemohon until a superadmin assigns them a staff role.
 *
 * This is the single source of truth for portal access. Login redirect, the
 * landing access panel, the public nav, and route guards all read from here so
 * they can never disagree.
 *
 * Access model (roles are additive — a user can hold several):
 *   - superadmin → all three portals + every izin (no assignment needed)
 *   - admin      → admin (+ pemohon). Does NOT imply verifier; to verify, the
 *                  admin must ALSO be given the verifier role.
 *   - verifier   → verifier (+ pemohon); queue scoped by VerifierPermitAssignment
 *   - everyone authenticated → pemohon (baseline)
 */
export interface PortalAccess {
  pemohon: boolean;
  verifier: boolean;
  admin: boolean;
}

export type StaffPortal = "verifier" | "admin";

function rolesOf(user: User | null): string[] {
  return user?.roles ?? [];
}

export function getPortals(user: User | null): PortalAccess {
  if (!user) return { pemohon: false, verifier: false, admin: false };
  const roles = rolesOf(user);
  const isSuperadmin = roles.includes("superadmin");
  const isAdmin = isSuperadmin || roles.includes("admin");
  // Admin does NOT imply verifier — only superadmin, an explicit verifier role,
  // or a sektor_admin:{key} role (carries a colon) grants verifier access.
  const isVerifier =
    isSuperadmin || roles.includes("verifier") || roles.some((r) => r.includes(":"));
  return {
    pemohon: true,
    verifier: isVerifier,
    admin: isAdmin,
  };
}

/** Staff portals the user can enter (excludes the baseline pemohon portal). */
export function staffPortals(user: User | null): StaffPortal[] {
  const p = getPortals(user);
  const out: StaffPortal[] = [];
  if (p.verifier) out.push("verifier");
  if (p.admin) out.push("admin");
  return out;
}

/**
 * True when an OIKN employee is signed in via SSO but has no staff role yet —
 * they behave exactly like a registered pemohon. Used to show a gentle "no role
 * assigned" hint instead of leaving them confused about missing portals.
 */
export function isStaffWithoutRole(user: User | null): boolean {
  if (!user?.is_staff) return false;
  const p = getPortals(user);
  return !p.verifier && !p.admin;
}

/** Short human label for the current user's highest role. */
export function getRoleLabel(user: User | null): string {
  if (!user) return "";
  const roles = rolesOf(user);
  if (roles.includes("superadmin")) return "Superadmin";
  if (roles.includes("admin")) return "Admin";
  if (roles.includes("verifier") || roles.some((r) => r.includes(":")))
    return "Verifikator";
  if (user.is_staff) return "Pegawai OIKN";
  return "Pemohon";
}
