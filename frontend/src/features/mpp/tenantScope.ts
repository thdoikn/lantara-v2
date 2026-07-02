import { useOutletContext } from "react-router-dom";
import type { Instansi } from "./api";

/** The selected tenant + the full list, provided by TenantLayout via Outlet
 * context. Kept in its own module so TenantLayout only exports a component
 * (react-refresh / fast-refresh requirement). */
export interface TenantScope {
  tenant: Instansi;
  tenants: Instansi[];
}

export function useTenantScope() {
  return useOutletContext<TenantScope>();
}
