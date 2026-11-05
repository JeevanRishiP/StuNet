/**
 * Academic Year Utilities for StuNet
 *
 * Rules:
 * - Academic Year starts in August and ends in July.
 * - 4-year undergraduate cycle:
 *     - Joining Year Aug – Next Year Jul: 1st Year
 *     - +1 Year Aug – +2 Year Jul: 2nd Year
 *     - +2 Year Aug – +3 Year Jul: 3rd Year
 *     - +3 Year Aug – +4 Year Jul: 4th Year
 *     - After 4th Year: Alumni (Class of [JoiningYear + 4])
 */

export interface AcademicYearInfo {
  yearNumber: number;
  label: string;
  shortLabel: string;
  isAlumni: boolean;
  academicSession: string; // e.g. "2026–2027"
  joiningYear: number;
  graduationYear: number;
}

export function calculateAcademicYear(
  joiningYear: number | null | undefined,
  currentDate: Date = new Date(),
): AcademicYearInfo | null {
  if (
    joiningYear === null ||
    joiningYear === undefined ||
    isNaN(Number(joiningYear)) ||
    Number(joiningYear) < 1950
  ) {
    return null;
  }

  const year = Number(joiningYear);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0 = Jan, 6 = Jul, 7 = Aug, 11 = Dec

  // Academic year begins August 1 (month index 7)
  const academicStartYear = currentMonth >= 7 ? currentYear : currentYear - 1;
  const academicEndYear = academicStartYear + 1;
  const academicSession = `${academicStartYear}–${academicEndYear}`;
  const graduationYear = year + 4;

  const yearDiff = academicStartYear - year + 1;

  if (yearDiff <= 0) {
    return {
      yearNumber: 1,
      label: `Incoming Student (Batch of ${year})`,
      shortLabel: "Incoming",
      isAlumni: false,
      academicSession,
      joiningYear: year,
      graduationYear,
    };
  }

  const ordinals: Record<number, string> = {
    1: "1st Year",
    2: "2nd Year",
    3: "3rd Year",
    4: "4th Year",
  };

  if (yearDiff <= 4) {
    const label = ordinals[yearDiff] || `${yearDiff}th Year`;
    return {
      yearNumber: yearDiff,
      label,
      shortLabel: label,
      isAlumni: false,
      academicSession,
      joiningYear: year,
      graduationYear,
    };
  }

  return {
    yearNumber: yearDiff,
    label: `Alumni (Class of ${graduationYear})`,
    shortLabel: "Alumni",
    isAlumni: true,
    academicSession,
    joiningYear: year,
    graduationYear,
  };
}

/**
 * Returns a list of sensible joining years with their current academic status
 * for forms and select dropdowns.
 */
export function getJoiningYearOptions(currentDate: Date = new Date()): Array<{
  value: number;
  label: string;
  status: string;
}> {
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentSessionStart = currentMonth >= 7 ? currentYear : currentYear - 1;

  // Generate options from currentSessionStart + 1 (incoming) down to 6 years back
  const options: Array<{ value: number; label: string; status: string }> = [];

  for (let y = currentSessionStart + 1; y >= currentSessionStart - 6; y--) {
    const info = calculateAcademicYear(y, currentDate);
    options.push({
      value: y,
      label: `${y} — ${info?.label ?? ""}`,
      status: info?.shortLabel ?? "",
    });
  }

  return options;
}
