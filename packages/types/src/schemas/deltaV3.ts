import { z } from "zod";

export const ProfilePlatformEnum = z.enum([
  "LINKTREE",
  "PORTFOLIO",
  "INSTAGRAM",
  "YOUTUBE",
  "TWITTER",
  "THREADS",
  "LINKEDIN",
  "GITHUB",
  "HUGGINGFACE",
  "LEETCODE",
  "HACKERRANK",
  "CODEFORCES",
  "KAGGLE",
]);

export type ProfilePlatformEnum = z.infer<typeof ProfilePlatformEnum>;

export const ProfileLinkSchema = z.object({
  platform: ProfilePlatformEnum,
  url: z.string().url().max(2000),
});

export const CompanyOwnerTypeEnum = z.enum(["FOUNDER", "CO_FOUNDER"]);
export type CompanyOwnerTypeEnum = z.infer<typeof CompanyOwnerTypeEnum>;

export const CreateCompanySchema = z.object({
  name: z.string().min(2).max(200).trim(),
  description: z.string().max(2000).optional(),
  websiteUrl: z.string().url().max(2000).optional().or(z.literal("")),
  linkedinUrl: z.string().url().max(2000).optional().or(z.literal("")),
  ownerType: CompanyOwnerTypeEnum.default("FOUNDER"),
  position: z.string().max(100).optional(),
  showOnProfile: z.boolean().default(true),
});

export const OpenSourceProjectSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  description: z.string().max(2000).optional(),
  githubUrl: z.string().url().max(2000),
  links: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        url: z.string().url().max(2000),
      }),
    )
    .optional(),
});

export const EventModeEnum = z.enum(["ONLINE", "OFFLINE"]);
export const EventTypeEnum = z.enum(["HACKATHON", "COMPETITION", "WORKSHOP", "MEETUP"]);

export const PlatformEventSchema = z
  .object({
    name: z.string().min(2).max(200).trim(),
    description: z.string().max(5000).optional(),
    mode: EventModeEnum,
    type: EventTypeEnum,
    eventDate: z.coerce.date(),
    registrationDeadline: z.coerce.date().optional(),
    location: z.string().max(500).optional(),
  })
  .refine((data) => data.mode !== "OFFLINE" || (data.location && data.location.trim().length > 0), {
    message: "Location is required for offline events",
    path: ["location"],
  });

export const ProfessionalInviteSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  description: z.string().max(5000).optional(),
  mode: z.string().max(50),
  type: z.string().max(50),
  requirements: z.string().max(3000).optional(),
  eventDate: z.coerce.date().optional(),
  registrationDeadline: z.coerce.date().optional(),
  location: z.string().max(500).optional(),
  expiresAt: z.coerce.date().optional(),
});

export const UsefulResourceCategoryEnum = z.enum([
  "GITHUB_REPO",
  "BLOG",
  "RESEARCH_PAPER",
  "NEWS_ARTICLE",
]);

export const UsefulResourceSchema = z.object({
  category: UsefulResourceCategoryEnum,
  title: z.string().min(2).max(300).trim(),
  url: z.string().url().max(2000).optional().or(z.literal("")),
  description: z.string().max(3000).optional(),
});

export const PostTargetConnectionScope = z.enum(["ALL", "CONNECTED"]);
export type PostTargetConnectionScope = z.infer<typeof PostTargetConnectionScope>;

export const LikedBySummarySchema = z.object({
  likeCount: z.number(),
  viewerHasLiked: z.boolean(),
  featuredName: z.string().nullable().optional(),
  displayString: z.string(),
});

export type LikedBySummary = z.infer<typeof LikedBySummarySchema>;
