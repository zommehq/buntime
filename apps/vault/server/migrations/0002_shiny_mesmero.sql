CREATE TABLE "parameters"."parameter_version" (
	"version_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "parameters"."parameter_version_version_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"cluster_space_parameter_id" bigint NOT NULL,
	"encrypted_value" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(255)
);
--> statement-breakpoint
ALTER TABLE "parameters"."parameter_version" ADD CONSTRAINT "parameter_version_cluster_space_parameter_id_cluster_space_parameter_cluster_space_parameter_id_fk" FOREIGN KEY ("cluster_space_parameter_id") REFERENCES "parameters"."cluster_space_parameter"("cluster_space_parameter_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_parameter_version_parameter" ON "parameters"."parameter_version" USING btree ("cluster_space_parameter_id","version");