import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const campuses = await db.campus.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        universityName: true,
        slug: true,
        city: true,
        state: true,
        facilities: true,
        websiteUrl: true,
      },
      orderBy: [{ state: "asc" }, { city: "asc" }, { name: "asc" }],
    });

    // Group into State -> City -> Campuses hierarchy
    const stateMap = new Map<
      string,
      Map<string, Array<{ id: string; name: string; slug: string; universityName: string | null }>>
    >();

    for (const c of campuses) {
      let cityMap = stateMap.get(c.state);
      if (!cityMap) {
        cityMap = new Map();
        stateMap.set(c.state, cityMap);
      }
      let campusList = cityMap.get(c.city);
      if (!campusList) {
        campusList = [];
        cityMap.set(c.city, campusList);
      }
      campusList.push({
        id: c.id,
        name: c.name,
        slug: c.slug,
        universityName: c.universityName,
      });
    }

    const hierarchy = Array.from(stateMap.entries()).map(([state, cities]) => ({
      state,
      cities: Array.from(cities.entries()).map(([cityName, campusList]) => ({
        name: cityName,
        campuses: campusList,
      })),
    }));

    return NextResponse.json({ hierarchy, campuses });
  } catch (error) {
    console.error("Failed to load campus hierarchy:", error);
    return NextResponse.json({ error: "Failed to load hierarchy" }, { status: 500 });
  }
}
