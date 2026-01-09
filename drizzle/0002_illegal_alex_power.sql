CREATE TABLE IF NOT EXISTS "division_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"division_id" uuid NOT NULL,
	"rider_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "riders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"country" text NOT NULL,
	"sail_number" text,
	"email" text,
	"date_of_birth" date,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "division_participants" ADD CONSTRAINT "division_participants_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "division_participants" ADD CONSTRAINT "division_participants_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "division_participant_division_id_idx" ON "division_participants" USING btree ("division_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "division_participant_rider_id_idx" ON "division_participants" USING btree ("rider_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unique_division_rider_idx" ON "division_participants" USING btree ("division_id","rider_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "country_idx" ON "riders" USING btree ("country");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sail_number_idx" ON "riders" USING btree ("sail_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deleted_at_idx" ON "riders" USING btree ("deleted_at");