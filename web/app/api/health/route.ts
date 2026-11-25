import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = getDb();
    await sql`select 1`;
    return NextResponse.json({ ok: true, database: "connected" });
  } catch {
    return NextResponse.json(
      { ok: false, database: "unreachable" },
      { status: 503 },
    );
  }
}
