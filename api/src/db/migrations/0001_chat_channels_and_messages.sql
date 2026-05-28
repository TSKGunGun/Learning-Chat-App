CREATE TABLE "chat_channels" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"channel_name" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"last_messaged_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"channel_id" uuid NOT NULL,
	"sender_type" text NOT NULL,
	"message_text" text,
	"status" text NOT NULL,
	"ai_feedback" boolean,
	"feedback_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_sender_type_check" CHECK ("messages"."sender_type" in ('user', 'ai')),
	CONSTRAINT "messages_status_check" CHECK ("messages"."status" in ('pending', 'completed', 'ai_timeout')),
	CONSTRAINT "messages_state_check" CHECK ((
        "messages"."sender_type" = 'user'
        and "messages"."status" = 'completed'
        and "messages"."message_text" is not null
        and "messages"."ai_feedback" is null
      ) or (
        "messages"."sender_type" = 'ai'
        and "messages"."status" = 'pending'
        and "messages"."message_text" is null
        and "messages"."ai_feedback" is null
      ) or (
        "messages"."sender_type" = 'ai'
        and "messages"."status" in ('completed', 'ai_timeout')
        and "messages"."message_text" is not null
      ))
);
--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "chat_channels" ADD CONSTRAINT "chat_channels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_channel_id_chat_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."chat_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_channels_user_id_idx" ON "chat_channels" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_channels_user_id_is_deleted_last_messaged_at_idx" ON "chat_channels" USING btree ("user_id","is_deleted","last_messaged_at");--> statement-breakpoint
CREATE INDEX "messages_channel_id_idx" ON "messages" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "messages_channel_id_created_at_idx" ON "messages" USING btree ("channel_id","created_at");