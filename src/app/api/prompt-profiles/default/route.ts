import { NextResponse } from "next/server";

import { getDexterApiRoute } from "@/app/config/env";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch(getDexterApiRoute("/prompt-profiles/default"), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => null);
      return NextResponse.json(
        { ok: false, error: "default_profile_failed", status: response.status, body: bodyText },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("/api/prompt-profiles/default GET error", error);
    return NextResponse.json({ ok: false, error: "default_profile_failed" }, { status: 500 });
  }
}
