CREATE TABLE IF NOT EXISTS "heats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"heat_id" text NOT NULL,
	"bracket_id" uuid NOT NULL,
	"rider_ids" text NOT NULL,
	"waves_counting" integer NOT NULL,
	"jumps_counting" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "heats_heat_id_unique" UNIQUE("heat_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "heats" ADD CONSTRAINT "heats_bracket_id_brackets_id_fk" FOREIGN KEY ("bracket_id") REFERENCES "public"."brackets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "heat_id_idx" ON "heats" USING btree ("heat_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bracket_id_idx" ON "heats" USING btree ("bracket_id");