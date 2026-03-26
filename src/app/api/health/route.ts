import { jsonNoStore } from "@/lib/security";

export async function GET() {
  return jsonNoStore({
    status: "ok",
    service: "book",
    timestamp: new Date().toISOString(),
  });
}
