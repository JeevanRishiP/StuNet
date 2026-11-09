import { z } from "zod";

export const UserRole = z.enum([
  "GUEST",
  "STUDENT",
  "FACULTY",
  "ALUMNI",
  "CLUB_MANAGER",
  "CAMPUS_MANAGER",
  "SUPER_ADMIN",
]);

export type UserRole = z.infer<typeof UserRole>;

export const RosterRole = z.enum(["STUDENT", "FACULTY"]);
export type RosterRole = z.infer<typeof RosterRole>;

export const RosterImportRowSchema = z.object({
  email: z.string().email().max(254),
  role: RosterRole,
  identifier: z.string().min(1).max(100), // USN for students, Employee ID for faculty
  campusId: z.string().min(1),
  currentCourseYear: z.coerce.number().int().min(1).max(10).optional(),
  joinedYear: z.coerce.number().int().min(1950).max(2100).optional(),
  graduationYear: z.coerce.number().int().min(1950).max(2150).optional(),
});

export type RosterImportRow = z.infer<typeof RosterImportRowSchema>;

export const SignupSchema = z.object({
  email: z.string().email().max(254),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and a number",
    ),
  displayName: z.string().min(2).max(60).trim(),
  joiningYear: z.coerce.number().int().min(1950).max(2100).optional(),
});

export type SignupInput = z.infer<typeof SignupSchema>;

export const LoginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
  totpCode: z.string().length(6).optional(),
});

export type LoginInput = z.infer<typeof LoginSchema>;
