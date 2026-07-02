import { getAccessToken } from "@/lib/auth";

/**
 * Download a file from an authenticated API endpoint as a blob, preserving the
 * Authorization header (an <a href> can't send it). Falls back to opening the
 * URL if the fetch fails.
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
