CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"project_id" uuid,
	"action" text NOT NULL,
	"input_context" jsonb,
	"reasoning" text,
	"agent_name" text,
	"confidence_score" real,
	"trace_id" text,
	"span_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "catalog_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"fingerprint" text NOT NULL,
	"label" text NOT NULL,
	"source_type" text NOT NULL,
	"format" text NOT NULL,
	"origin" text,
	"product_count" integer DEFAULT 0 NOT NULL,
	"last_imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feedback_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"product_id" uuid,
	"end_user_id" text NOT NULL,
	"event_type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "funnel_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"funnel_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"match_field" text DEFAULT 'event_name' NOT NULL,
	"match_value" text NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funnels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "intent_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"project_id" uuid,
	"name" text NOT NULL,
	"sliders" jsonb DEFAULT '{"relevance":0.5,"diversity":0.5,"novelty":0.5,"popularity":0.5}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"project_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"preference_vector" vector(768),
	"behavior_config" jsonb DEFAULT '{}'::jsonb,
	"simulation_results" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"project_id" uuid,
	"external_id" text,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"embedding" vector(768),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "products_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recommendation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"end_user_id" text NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"avg_confidence" real,
	"sliders" jsonb,
	"category" text,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scoring_functions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"project_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"code" text NOT NULL,
	"version" integer DEFAULT 1,
	"is_committed" boolean DEFAULT false,
	"mentor_feedback" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "synthetic_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"project_id" uuid,
	"user_id" text NOT NULL,
	"interaction_type" text NOT NULL,
	"confidence" real NOT NULL,
	"reasoning" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_project_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"active_project_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_sources" ADD CONSTRAINT "catalog_sources_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_events" ADD CONSTRAINT "feedback_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_events" ADD CONSTRAINT "feedback_events_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_steps" ADD CONSTRAINT "funnel_steps_funnel_id_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnels" ADD CONSTRAINT "funnels_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intent_profiles" ADD CONSTRAINT "intent_profiles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_events" ADD CONSTRAINT "recommendation_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scoring_functions" ADD CONSTRAINT "scoring_functions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "synthetic_interactions" ADD CONSTRAINT "synthetic_interactions_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "synthetic_interactions" ADD CONSTRAINT "synthetic_interactions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "synthetic_interactions" ADD CONSTRAINT "synthetic_interactions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_project_preferences" ADD CONSTRAINT "user_project_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_project_preferences" ADD CONSTRAINT "user_project_preferences_active_project_id_projects_id_fk" FOREIGN KEY ("active_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_user_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_keys_project_idx" ON "api_keys" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "api_keys_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_project_idx" ON "audit_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_trace_idx" ON "audit_logs" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "catalog_sources_user_idx" ON "catalog_sources" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "catalog_sources_project_idx" ON "catalog_sources" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "catalog_sources_imported_at_idx" ON "catalog_sources" USING btree ("last_imported_at");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_sources_project_fingerprint_idx" ON "catalog_sources" USING btree ("project_id","fingerprint");--> statement-breakpoint
CREATE INDEX "feedback_user_idx" ON "feedback_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_project_idx" ON "feedback_events" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "feedback_product_idx" ON "feedback_events" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "feedback_end_user_idx" ON "feedback_events" USING btree ("end_user_id");--> statement-breakpoint
CREATE INDEX "feedback_event_type_idx" ON "feedback_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "feedback_created_at_idx" ON "feedback_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "funnel_steps_funnel_idx" ON "funnel_steps" USING btree ("funnel_id");--> statement-breakpoint
CREATE INDEX "funnel_steps_order_idx" ON "funnel_steps" USING btree ("funnel_id","step_order");--> statement-breakpoint
CREATE INDEX "funnels_user_idx" ON "funnels" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "funnels_project_idx" ON "funnels" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "intent_profiles_user_idx" ON "intent_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "intent_profiles_project_idx" ON "intent_profiles" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "personas_user_idx" ON "personas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "personas_project_idx" ON "personas" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "products_user_idx" ON "products" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "products_project_idx" ON "products" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "products_embedding_idx" ON "products" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "products_external_id_idx" ON "products" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "projects_user_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rec_events_user_idx" ON "recommendation_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rec_events_project_idx" ON "recommendation_events" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "rec_events_end_user_idx" ON "recommendation_events" USING btree ("end_user_id");--> statement-breakpoint
CREATE INDEX "rec_events_created_at_idx" ON "recommendation_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "scoring_functions_user_idx" ON "scoring_functions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scoring_functions_project_idx" ON "scoring_functions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "synth_interactions_persona_idx" ON "synthetic_interactions" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "synth_interactions_product_idx" ON "synthetic_interactions" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "synth_interactions_project_idx" ON "synthetic_interactions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "synth_interactions_user_idx" ON "synthetic_interactions" USING btree ("user_id");