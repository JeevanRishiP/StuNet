import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const OFFICIAL_CLUBS = [
  {
    slug: "nsgc",
    name: "NxtWave Student General Council (NSGC)",
    category: "Governance & Leadership",
    description:
      "The apex student governance body fostering student leadership, policy advocacy, inter-campus coordination, and student welfare.",
    instagramUrl: "https://instagram.com/niat_nsgc",
  },
  {
    slug: "advanced-tech",
    name: "Advanced Tech Club",
    category: "Technology",
    description:
      "High-performance computing, systems engineering, distributed architecture, and deep-tech hackathon development.",
    instagramUrl: "https://instagram.com/niat_advancedtech",
  },
  {
    slug: "arts",
    name: "Arts Club",
    category: "Cultural & Creative",
    description:
      "Visual arts, digital sketching, motion graphics, UI/UX storytelling, and campus cultural exhibitions.",
    instagramUrl: "https://instagram.com/niat_artsclub",
  },
  {
    slug: "sports",
    name: "Sports Club",
    category: "Athletics & Fitness",
    description:
      "Inter-campus tournaments, athletics, esports leagues, and physical wellness initiatives across NIAT campuses.",
    instagramUrl: "https://instagram.com/niat_sportsclub",
  },
  {
    slug: "edu",
    name: "EDU Club (Entrepreneurship & VC)",
    category: "Entrepreneurship",
    description:
      "Student venture incubation, founder pitches, angel/VC connect, BRAVE 1.0/2.0 challenges, and startup mentorship.",
    instagramUrl: "https://instagram.com/niat_educlub",
  },
  {
    slug: "gen-ai",
    name: "Gen AI Club",
    category: "Artificial Intelligence",
    description:
      "Generative AI, Large Language Models, agentic coding workflows, multimodal research, and AI hackathons.",
    instagramUrl: "https://instagram.com/niat_genai",
  },
  {
    slug: "media",
    name: "Media Club",
    category: "Media & Journalism",
    description:
      "Campus podcasting, tech journalism, event coverage, photography, videography, and NIAT Insider contributions.",
    instagramUrl: "https://instagram.com/niat_mediaclub",
  },
];

const CreateCampusSchema = z.object({
  name: z.string().min(2).max(200),
  universityName: z.string().max(200).optional(),
  slug: z.string().min(2).max(100).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  emailDomain: z.string().max(100).optional(),
  websiteUrl: z.string().url().or(z.string().length(0)).optional(),
  address: z.string().max(500).optional(),
  facilities: z.array(z.string()).default([]),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase();
  const state = searchParams.get("state");
  const city = searchParams.get("city");

  try {
    const campuses = await adminDb.campus.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { universityName: { contains: search, mode: "insensitive" } },
                { city: { contains: search, mode: "insensitive" } },
                { state: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(state ? { state: { equals: state, mode: "insensitive" } } : {}),
        ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
      },
      include: {
        _count: {
          select: {
            clubs: true,
            faculties: true,
            userIdentities: true,
          },
        },
      },
      orderBy: [{ state: "asc" }, { city: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ campuses });
  } catch (error) {
    console.error("Failed to fetch campuses:", error);
    return NextResponse.json({ error: "Failed to fetch campuses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CreateCampusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid campus data", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const { name, universityName, city, state, emailDomain, websiteUrl, address, facilities } =
      parsed.data;

    // Generate slug from name & city if not provided
    const baseSlug = (parsed.data.slug || `niat-${city}-${name}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    let slug = baseSlug;
    let counter = 1;
    while (await adminDb.campus.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Create Campus
    const newCampus = await adminDb.campus.create({
      data: {
        name,
        universityName: universityName || `${name} (${city})`,
        slug,
        city,
        state,
        emailDomain: emailDomain || `${slug}.niat.edu.in`,
        websiteUrl: websiteUrl || null,
        address: address || `${name}, ${city}, ${state}`,
        facilities:
          facilities && facilities.length > 0
            ? facilities
            : ["AI & ML Innovation Lab", "Hostel", "Transport", "Smart Classrooms"],
        isActive: true,
      },
    });

    // Automatically initialize ALL 7 Official Clubs for this campus!
    for (const club of OFFICIAL_CLUBS) {
      await adminDb.club.create({
        data: {
          campusId: newCampus.id,
          name: club.name,
          slug: club.slug,
          category: club.category,
          description: club.description,
          instagramUrl: club.instagramUrl,
          institutionalEmail: `${club.slug}@${newCampus.slug}.niat.edu.in`,
          isActive: true,
        },
      });
    }

    // Add default HOD faculty
    await adminDb.campusFaculty.create({
      data: {
        campusId: newCampus.id,
        name: `HOD, Computer Science & Engineering`,
        designation: "Professor & Head of Department",
        department: "Computer Science & Engineering",
        email: `hod.cse@${newCampus.slug}.niat.edu.in`,
        officeRoom: "Academic Block - Room 101",
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        campus: newCampus,
        message: `Campus '${newCampus.name}' created with all 7 official clubs initialized!`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create campus:", error);
    return NextResponse.json({ error: "Failed to create campus" }, { status: 500 });
  }
}
