ALTER TABLE "heats" ADD COLUMN "round_number" integer;--> statement-breakpoint
ALTER TABLE "heats" ADD COLUMN "round_name" text;--> statement-breakpoint
ALTER TABLE "heats" ADD COLUMN "position" text;--> statement-breakpoint
ALTER TABLE "heats" ADD COLUMN "winner_destination_heat_id" text;--> statement-breakpoint
ALTER TABLE "heats" ADD COLUMN "loser_destination_heat_id" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "heats" ADD CONSTRAINT "heats_winner_destination_heat_id_heats_heat_id_fk" FOREIGN KEY ("winner_destination_heat_id") REFERENCES "public"."heats"("heat_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "heats" ADD CONSTRAINT "heats_loser_destination_heat_id_heats_heat_id_fk" FOREIGN KEY ("loser_destination_heat_id") REFERENCES "public"."heats"("heat_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "round_number_idx" ON "heats" USING btree ("round_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "position_idx" ON "heats" USING btree ("position");
