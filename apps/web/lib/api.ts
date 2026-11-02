const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("at") : null;
  const r = await fetch(API + path, { ...init, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "Request failed");
  return r.json();
}
export const inr = (n: number | string) => "₹" + Number(n).toLocaleString("en-IN");
