import { clearAuthCookies } from "@/lib/auth";
import { ok } from "@/lib/response";

export async function POST(): Promise<Response> {
  await clearAuthCookies();
  return ok({ message: "Logged out" });
}
