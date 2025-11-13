ALTER TABLE "projects" ADD COLUMN "share_code" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "state" text DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_share_code_unique" UNIQUE("share_code");