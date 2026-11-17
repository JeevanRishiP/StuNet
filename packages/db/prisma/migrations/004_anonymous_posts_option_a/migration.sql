-- AlterTable: Make author_id nullable
ALTER TABLE "posts" ALTER COLUMN "author_id" DROP NOT NULL;

-- Backfill: Disconnect real author from any existing anonymous posts
UPDATE "posts" SET "author_id" = NULL WHERE "is_anonymous" = true;

-- Constraint: Hard database guarantee that anonymous posts have no author
ALTER TABLE "posts" ADD CONSTRAINT "anonymous_posts_have_no_author"
  CHECK (NOT is_anonymous OR author_id IS NULL);

-- Update trigger function to allow anonymous posts (where author_id is NULL)
CREATE OR REPLACE FUNCTION stunet_enforce_non_guest_author()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_actor_id text;
  v_audience text;
BEGIN
  IF TG_TABLE_NAME = 'posts' THEN
    IF NEW.is_anonymous THEN
      RETURN NEW;
    END IF;
    v_actor_id := NEW.author_id;
  ELSIF TG_TABLE_NAME = 'professional_invites' THEN
    v_actor_id := NEW.creator_user_id;
  ELSE
    v_actor_id := NULL;
  END IF;

  v_audience := stunet_viewer_audience_role(v_actor_id);
  IF v_audience = 'GUEST' THEN
    RAISE EXCEPTION 'GUEST, inactive, or banned accounts cannot create posts or invites (%).', COALESCE(v_actor_id, 'NULL')
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
