CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "correction_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"channel_id" uuid NOT NULL,
	"trigger_message_id" uuid NOT NULL,
	"rule_text" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "correction_rules" ADD CONSTRAINT "correction_rules_channel_id_chat_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."chat_channels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correction_rules" ADD CONSTRAINT "correction_rules_trigger_message_id_messages_id_fk" FOREIGN KEY ("trigger_message_id") REFERENCES "public"."messages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "correction_rules_channel_id_idx" ON "correction_rules" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "correction_rules_trigger_message_id_idx" ON "correction_rules" USING btree ("trigger_message_id");--> statement-breakpoint
CREATE INDEX "correction_rules_embedding_hnsw_idx" ON "correction_rules" USING hnsw ("embedding" vector_cosine_ops);
