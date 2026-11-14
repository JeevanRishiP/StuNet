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

export const CompanyOwnerTypeEnum = z.enum([
  "FOUNDER",
  "CO_FOUNDER",
  "FOUNDING_MEMBER",
  "EMPLOYEE",
  "ADVISOR",
]);
export type CompanyOwnerTypeEnum = z.infer<typeof CompanyOwnerTypeEnum>;

export const CreateCompanySchema = z.object({
  name: z.string().min(2).max(200).trim(),
  description: z.string().max(2000).optional(),
  tagline: z.string().max(300).optional(),
  logoUrl: z.string().url().max(2000).optional().or(z.literal("")),
  websiteUrl: z.string().url().max(2000).optional().or(z.literal("")),
  linkedinUrl: z.string().url().max(2000).optional().or(z.literal("")),
  stage: z.string().max(50).default("IDEA"),
  verifiedRevenue: z.number().min(0).default(0),
  revenueCurrency: z.string().max(10).default("INR"),
  verificationProofUrl: z.string().url().max(2000).optional().or(z.literal("")),
  hiringStatus: z.boolean().default(false),
  ownerType: CompanyOwnerTypeEnum.default("FOUNDER"),
  position: z.string().max(100).optional(),
  showOnProfile: z.boolean().default(true),
});

export const OpenSourceProjectSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  description: z.string().max(2000).optional(),
  tagline: z.string().max(300).optional(),
  logoUrl: z.string().url().max(2000).optional().or(z.literal("")),
  githubUrl: z.string().url().max(2000),
  starsCount: z.number().int().min(0).default(0),
  contributorsCount: z.number().int().min(1).default(1),
  forksCount: z.number().int().min(0).default(0),
  primaryLanguage: z.string().max(50).optional(),
  license: z.string().max(50).optional(),
  isOpenForContributors: z.boolean().default(true),
  links: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        url: z.string().url().max(2000),
      }),
    )
    .optional(),
});

export const ProjectMemberRoleEnum = z.enum(["MAINTAINER", "CORE_CONTRIBUTOR", "CONTRIBUTOR"]);
export type ProjectMemberRoleEnum = z.infer<typeof ProjectMemberRoleEnum>;

export const OpportunityRoleTypeEnum = z.enum([
  "CO_FOUNDER",
  "FOUNDING_MEMBER",
  "FULL_TIME",
  "PART_TIME",
  "INTERN",
  "CONTRIBUTOR",
]);
export type OpportunityRoleTypeEnum = z.infer<typeof OpportunityRoleTypeEnum>;

export const CreateOpportunitySchema = z.object({
  companyId: z.string().optional(),
  projectId: z.string().optional(),
  title: z.string().min(2).max(200).trim(),
  roleType: OpportunityRoleTypeEnum,
  description: z.string().min(10).max(5000).trim(),
  skills: z.array(z.string().trim().max(50)).default([]),
  compensation: z.string().max(200).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  applyUrl: z.string().url().max(2000).optional().or(z.literal("")),
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
    tags: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
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
  recipientUserId: z.string().optional().nullable(),
  isDirectInvite: z.boolean().default(false),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
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
  tags: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
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
