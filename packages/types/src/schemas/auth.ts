import { z } from "zod";

export const UserRole = z.enum([
  "STUDENT",
  "CLUB_MANAGER",
  "CAMPUS_MANAGER",
  "SUPER_ADMIN",
]);

export type UserRole = z.infer<typeof UserRole>;

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
});

export type SignupInput = z.infer<typeof SignupSchema>;

export const LoginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
  totpCode: z.string().length(6).optional(),
});

export type LoginInput = z.infer<typeof LoginSchema>;
