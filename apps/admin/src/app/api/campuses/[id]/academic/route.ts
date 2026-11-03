import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const CreateAlertSchema = z.object({
  type: z.enum(["ALERT", "CIA", "IA"]),
  title: z.string().min(2).max(200),
  body: z.string().max(1000).optional(),
  subject: z.string().max(200).optional(),
  component: z.string().max(100).optional(),
  scheduledAt: z.string().optional(),
  venue: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CreateAlertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid academic data", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const {
      type,
      title,
      body: alertBody,
      subject,
      component,
      scheduledAt,
      venue,
      notes,
    } = parsed.data;

    if (type === "ALERT") {
      const alert = await adminDb.campusLiveAlert.create({
        data: {
          campusId: params.id,
          createdById: session.user.id ?? "admin",
          title,
          body: alertBody || title,
          severity: "INFO",
        },
      });
      return NextResponse.json({ success: true, item: alert });
    } else if (type === "CIA") {
      const cia = await adminDb.campusCiaSchedule.create({
        data: {
          campusId: params.id,
          createdById: session.user.id ?? "admin",
          subject: subject || title,
          component: component || "CIA 1",
          scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(Date.now() + 86400000 * 5),
          venue: venue || null,
          notes: notes || null,
        },
      });
      return NextResponse.json({ success: true, item: cia });
    } else {
      const ia = await adminDb.campusIaExam.create({
        data: {
          campusId: params.id,
          createdById: session.user.id ?? "admin",
          subject: subject || title,
          examType: component || "IA 1",
          scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(Date.now() + 86400000 * 10),
          venue: venue || null,
          notes: notes || null,
        },
      });
      return NextResponse.json({ success: true, item: ia });
    }
  } catch (error) {
    console.error("Failed to create academic item:", error);
    return NextResponse.json({ error: "Failed to create academic item" }, { status: 500 });
  }
}
