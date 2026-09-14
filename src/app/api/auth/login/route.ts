import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "alpha.prototype.session";
const PROTOTYPE_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(request: NextRequest) {
  const sessionToken = process.env.ALPHA_SESSION_TOKEN;
  if (!sessionToken || sessionToken.length < 32) {
    return NextResponse.json({ error: "Prototype authentication is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { nationalId?: string; phone?: string } | null;
  const expectedNationalId = process.env.ALPHA_DEMO_NATIONAL_ID ?? "123456789";
  const expectedPhone = process.env.ALPHA_DEMO_PHONE ?? "0501234567";

  if (!body || body.nationalId !== expectedNationalId || body.phone !== expectedPhone) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const response = NextResponse.json({
    userId: PROTOTYPE_USER_ID,
    platformAdmin: true,
    displayName: "מנהל מערכת",
  });
  response.cookies.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
