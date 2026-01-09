CREATE TABLE IF NOT EXISTS "scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"score_uuid" text NOT NULL,
	"heat_id" text NOT NULL,
	"rider_id" uuid NOT NULL,
	"judge_id" uuid NOT NULL,
	"score_type" text NOT NULL,
	"score_value" numeric(4, 2) NOT NULL,
	"jump_type" text,
	"jump_modifiers" text,
	"timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scores_score_uuid_unique" UNIQUE("score_uuid")
);
--> statement-breakpoint
ALTER TABLE "heats" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scores" ADD CONSTRAINT "scores_heat_id_heats_heat_id_fk" FOREIGN KEY ("heat_id") REFERENCES "public"."heats"("heat_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scores" ADD CONSTRAINT "scores_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scores" ADD CONSTRAINT "scores_judge_id_users_id_fk" FOREIGN KEY ("judge_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "score_heat_id_idx" ON "scores" USING btree ("heat_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "score_rider_id_idx" ON "scores" USING btree ("rider_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "score_uuid_idx" ON "scores" USING btree ("score_uuid");