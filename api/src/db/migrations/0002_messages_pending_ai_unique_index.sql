CREATE UNIQUE INDEX "messages_pending_ai_per_channel_idx"
  ON "messages" USING btree ("channel_id")
  WHERE "sender_type" = 'ai' AND "status" = 'pending';
