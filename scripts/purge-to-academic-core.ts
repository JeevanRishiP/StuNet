import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Purge all social, user-generated content, test, and benchmark data
 * while strictly preserving student academic identity, college, subjects, and faculties.
 */
async function main() {
  console.log("Starting database purge to academic core...");

  await prisma.$executeRawUnsafe(`
    BEGIN;

    -- 1. Truncate social, activity, post, poll, achievement, connection, group, initiative, project, and marketplace tables
    TRUNCATE TABLE 
      post_likes,
      post_views,
      post_comments,
      feed_impressions,
      comments,
      posts,
      author_engagement_stats,
      user_author_affinity,
      feed_model_versions,
      poll_submissions,
      poll_entries,
      poll_options,
      polls,
      achievement_rankings,
      achievements,
      brave_metrics,
      connections,
      user_follows,
      user_blocks,
      group_join_requests,
      group_members,
      groups,
      initiative_interest_requests,
      initiative_opportunities,
      company_follows,
      user_company_roles,
      companies,
      project_follows,
      project_links,
      project_members,
      open_source_projects,
      profile_links,
      campus_market_images,
      campus_market_listings,
      resources,
      events,
      professional_invites,
      notifications,
      reports,
      suggestion_votes,
      suggestions,
      suggestion_windows,
      taggables,
      tags,
      club_role_assignments,
      club_members
    CASCADE;

    -- 2. Delete synthetic benchmark users
    DELETE FROM auth_credentials WHERE user_id LIKE 'scale_user_%';
    DELETE FROM user_credentials WHERE user_id LIKE 'scale_user_%';
    DELETE FROM auth_sessions WHERE user_id LIKE 'scale_user_%';
    DELETE FROM user_private_details WHERE user_id LIKE 'scale_user_%';
    DELETE FROM student_academic_details WHERE user_id LIKE 'scale_user_%';
    DELETE FROM faculty_details WHERE user_id LIKE 'scale_user_%';
    DELETE FROM alumni_details WHERE user_id LIKE 'scale_user_%';
    DELETE FROM user_identity WHERE id LIKE 'scale_user_%';

    -- 3. Clear personal contact info and profile bio/headlines on real users
    UPDATE user_private_details 
    SET whatsapp_number = NULL, personal_email = NULL, professional_email = NULL;

    UPDATE user_identity 
    SET bio = NULL, headline = NULL;

    UPDATE campus_faculties
    SET phone = NULL;

    COMMIT;
  `);

  console.log("Database successfully purged to academic core.");
}

main()
  .catch((e) => {
    console.error("Purge error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
