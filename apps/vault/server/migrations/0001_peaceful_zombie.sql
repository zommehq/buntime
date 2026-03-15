CREATE TABLE "parameters"."parameter_audit_log" (
	"audit_log_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "parameters"."parameter_audit_log_audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"cluster_space_parameter_id" bigint,
	"cluster_space_client_id" bigint NOT NULL,
	"parameter_key" varchar(256) NOT NULL,
	"action" varchar(32) NOT NULL,
	"actor_email" varchar(255),
	"actor_username" varchar(255),
	"ip_address" varchar(45),
	"old_value_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "parameters"."parameter_audit_log" ADD CONSTRAINT "parameter_audit_log_cluster_space_parameter_id_cluster_space_parameter_cluster_space_parameter_id_fk" FOREIGN KEY ("cluster_space_parameter_id") REFERENCES "parameters"."cluster_space_parameter"("cluster_space_parameter_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_audit_log_parameter" ON "parameters"."parameter_audit_log" USING btree ("cluster_space_parameter_id");--> statement-breakpoint
CREATE INDEX "ix_audit_log_client" ON "parameters"."parameter_audit_log" USING btree ("cluster_space_client_id");--> statement-breakpoint
CREATE INDEX "ix_audit_log_created_at" ON "parameters"."parameter_audit_log" USING btree ("created_at");