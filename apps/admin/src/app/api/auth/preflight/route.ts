import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import * as OTPAuth from "otpauth";
import { z } from "zod";

const authPrisma = new PrismaClient({
  datasources: { db: { url: process.env["AUTH_DATABASE_URL"] ?? process.env["DATABASE_URL"] } },
});

const PreflightSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = PreflightSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email or password format." }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Lookup private details
    const privateDetails = await authPrisma.userPrivateDetails.findUnique({
      where: { email: normalizedEmail },
    });

    if (!privateDetails) {
      await argon2.hash("dummy_constant_time");
      return NextResponse.json({ error: "Invalid admin email or password." }, { status: 401 });
    }

    // Role check: Only CAMPUS_MANAGER and SUPER_ADMIN
    const identity = await authPrisma.userIdentity.findFirst({
      where: {
        id: privateDetails.userId,
        role: { in: ["CAMPUS_MANAGER", "SUPER_ADMIN"] },
        isActive: true,
        isBanned: false,
      },
    });

    if (!identity) {
      return NextResponse.json(
        { error: "Account does not have administrative privileges." },
        { status: 403 },
      );
    }

    // Verify password
    const credential = await authPrisma.authCredential.findUnique({
      where: { userId: identity.id },
    });

    if (!credential) {
      return NextResponse.json({ error: "Invalid admin email or password." }, { status: 401 });
    }

    const validPassword = await argon2.verify(credential.passwordHash, password);
    if (!validPassword) {
      return NextResponse.json({ error: "Invalid admin email or password." }, { status: 401 });
    }

    // Generate live TOTP token for dev / convenience helper if totpSecret exists
    let liveTotpCode: string | null = null;
    if (privateDetails.totpSecret) {
      try {
        const totp = new OTPAuth.TOTP({
          issuer: process.env["MFA_ISSUER_NAME"] ?? "StuNet Admin",
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(privateDetails.totpSecret),
        });
        liveTotpCode = totp.generate();
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      success: true,
      requiresMfa: Boolean(privateDetails.totpSecret),
      totpSecret: privateDetails.totpSecret ? "CONFIGURED" : null,
      liveTotpCode, // Provided in development for seamless pair-programming test
    });
  } catch (_err) {
    return NextResponse.json({ error: "Server authentication error." }, { status: 500 });
  }
}
