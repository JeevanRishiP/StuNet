/**
 * apps/web/src/app/api/auth/signup/route.ts
 *
 * Self-service registration endpoint for:
 * 1. New User Form (Student)
 * 2. New Alumni Form
 * 3. New Faculty Form
 */
import { NextRequest, NextResponse } from "next/server";
import { signupMember, PortalSignupInputSchema } from "@/lib/signup";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();

    const parsed = PortalSignupInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Invalid form submission",
          details: parsed.error.format(),
        },
        { status: 400 },
      );
    }

    const result = await signupMember(parsed.data);

    if (!result.success) {
      const isDuplicate = result.error === "EMAIL_IN_USE";
      return NextResponse.json(
        {
          error: isDuplicate
            ? "An account with this email address already exists in StuNet."
            : result.error,
        },
        { status: isDuplicate ? 409 : 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        userId: result.userId,
        username: result.username,
        verificationStatus: result.verificationStatus,
        message:
          result.verificationStatus === "VERIFIED"
            ? "Account created and verified! You can log in right away."
            : "Account registered successfully! Your profile is pending campus admin review.",
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/auth/signup error:", err);
    return NextResponse.json(
      { error: "Failed to process registration. Please try again." },
      { status: 500 },
    );
  }
}
