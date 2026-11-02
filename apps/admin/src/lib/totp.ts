/**
 * apps/admin/src/lib/totp.ts
 *
 * TOTP MFA setup utilities for admin users.
 * - Generate a new TOTP secret
 * - Generate a QR code URL for authenticator apps
 * - Verify a TOTP token
 * - Save/enable TOTP for a user (writes to user_private_details via authPrisma)
 */
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { PrismaClient } from "@prisma/client";

// Auth-level DB connection (can access user_private_details)
const authPrisma = new PrismaClient({
  datasources: {
    db: { url: process.env["AUTH_DATABASE_URL"] ?? process.env["DATABASE_URL"] },
  },
});

const ISSUER = process.env["MFA_ISSUER_NAME"] ?? "StuNet Admin";

export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

export async function generateQrCodeDataUrl(secret: string, accountEmail: string): Promise<string> {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: accountEmail,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  const otpauthUrl = totp.toString();
  return QRCode.toDataURL(otpauthUrl);
}

export function verifyTotp(secret: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.validate({ token, window: 1 }) !== null;
}

export async function enableTotp(
  userId: string,
  secret: string,
  verificationToken: string,
): Promise<boolean> {
  // Verify the token before saving to ensure the user has the correct secret
  if (!verifyTotp(secret, verificationToken)) return false;

  await authPrisma.userPrivateDetails.update({
    where: { userId },
    data: {
      totpSecret: secret,
      totpEnabledAt: new Date(),
    },
  });

  return true;
}
