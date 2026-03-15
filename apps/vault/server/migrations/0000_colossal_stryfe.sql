CREATE SCHEMA IF NOT EXISTS "parameters";--> statement-breakpoint
CREATE TABLE "parameters"."client_category" (
	"client_category_id" bigint PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"status" char(1) DEFAULT 'A' NOT NULL,
	CONSTRAINT "client_category_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "parameters"."client" (
	"client_id" bigint PRIMARY KEY NOT NULL,
	"client_uuid" varchar(255) NOT NULL,
	"name" varchar(80) NOT NULL,
	"taxid" varchar(50) NOT NULL,
	"notes" text,
	"status" char(1) DEFAULT 'A' NOT NULL,
	"client_category_id" bigint NOT NULL,
	"address" varchar(150) NOT NULL,
	"complement" varchar(100),
	"zipcode" varchar(20),
	"city" varchar(80) NOT NULL,
	"stateprovince" varchar(50) NOT NULL,
	"state_id" bigint NOT NULL,
	CONSTRAINT "client_client_uuid_unique" UNIQUE("client_uuid"),
	CONSTRAINT "client_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "parameters"."cluster_space_client" (
	"cluster_space_client_id" bigint PRIMARY KEY NOT NULL,
	"cluster_space_uuid" varchar(255) NOT NULL,
	"main_url_dns" varchar(255) NOT NULL,
	"type_url_login" char(1) NOT NULL,
	"url_login" varchar(255) NOT NULL,
	"url_redirect_post_login" varchar(255),
	"post_login_script" text,
	"status" char(1) DEFAULT 'A' NOT NULL,
	"timezone" varchar(15) NOT NULL,
	"default_language" char(10) NOT NULL,
	"default_formatdate" varchar(50) NOT NULL,
	"default_formattime" varchar(50) NOT NULL,
	"default_formatdatetime" varchar(50) NOT NULL,
	"default_formatmoney" varchar(50) NOT NULL,
	"messaging_engine" char(5) NOT NULL,
	"messaging_config" text,
	"queue_data_exchange" varchar(120) NOT NULL,
	"realm" varchar(50) NOT NULL,
	"monitor_ingowner" char(1) NOT NULL,
	"home_url" varchar(255),
	"work_place_url" varchar(255),
	"logo" text,
	"logo_reports" text,
	"client_id" bigint,
	"cluster_id" bigint,
	"alias" varchar(100) NOT NULL,
	"custom_url_login" varchar(255),
	CONSTRAINT "cluster_space_client_cluster_space_uuid_unique" UNIQUE("cluster_space_uuid"),
	CONSTRAINT "cluster_space_client_main_url_dns_unique" UNIQUE("main_url_dns"),
	CONSTRAINT "cluster_space_client_alias_unique" UNIQUE("alias")
);
--> statement-breakpoint
CREATE TABLE "parameters"."cluster_space_parameter" (
	"cluster_space_parameter_id" bigint PRIMARY KEY NOT NULL,
	"cluster_space_parameter_parent_id" bigint,
	"cluster_space_client_id" bigint NOT NULL,
	"description" text NOT NULL,
	"parameter_key" varchar(256) NOT NULL,
	"parameter_value" text,
	"parameter_type" varchar(32) NOT NULL,
	CONSTRAINT "cluster_space_parameter_cluster_space_client_id_cluster_spa_key" UNIQUE("cluster_space_client_id","cluster_space_parameter_parent_id","parameter_key")
);
--> statement-breakpoint
CREATE TABLE "parameters"."cluster" (
	"cluster_id" bigint PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"notes" text,
	"status" char(1) DEFAULT 'A' NOT NULL,
	"region_id" bigint,
	CONSTRAINT "cluster_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "parameters"."country" (
	"country_id" bigint PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	CONSTRAINT "country_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "parameters"."region" (
	"region_id" bigint PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"status" char(1) DEFAULT 'A' NOT NULL,
	"state_id" bigint,
	CONSTRAINT "region_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "parameters"."state" (
	"state_id" bigint PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"country_id" bigint,
	CONSTRAINT "uq_state_country" UNIQUE("country_id","name")
);
--> statement-breakpoint
ALTER TABLE "parameters"."client" ADD CONSTRAINT "fk_client_clientcategory" FOREIGN KEY ("client_category_id") REFERENCES "parameters"."client_category"("client_category_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parameters"."client" ADD CONSTRAINT "fk_client_state" FOREIGN KEY ("state_id") REFERENCES "parameters"."state"("state_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parameters"."cluster_space_client" ADD CONSTRAINT "fk_clusterspace_client" FOREIGN KEY ("client_id") REFERENCES "parameters"."client"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parameters"."cluster_space_client" ADD CONSTRAINT "fk_clusterspace_cluster" FOREIGN KEY ("cluster_id") REFERENCES "parameters"."cluster"("cluster_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parameters"."cluster_space_parameter" ADD CONSTRAINT "fk_cluster_space_parameter_parent" FOREIGN KEY ("cluster_space_parameter_parent_id") REFERENCES "parameters"."cluster_space_parameter"("cluster_space_parameter_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parameters"."cluster_space_parameter" ADD CONSTRAINT "fk_cluster_space_parameter_cluster_space_client" FOREIGN KEY ("cluster_space_client_id") REFERENCES "parameters"."cluster_space_client"("cluster_space_client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parameters"."cluster" ADD CONSTRAINT "fk_cluster_region" FOREIGN KEY ("region_id") REFERENCES "parameters"."region"("region_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parameters"."region" ADD CONSTRAINT "fk_region_state" FOREIGN KEY ("state_id") REFERENCES "parameters"."state"("state_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parameters"."state" ADD CONSTRAINT "fk_state_country" FOREIGN KEY ("country_id") REFERENCES "parameters"."country"("country_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_client_category" ON "parameters"."client" USING btree ("client_category_id");--> statement-breakpoint
CREATE INDEX "ix_client_state" ON "parameters"."client" USING btree ("state_id");--> statement-breakpoint
CREATE INDEX "ix_clusterspace_cluster" ON "parameters"."cluster_space_client" USING btree ("cluster_id");--> statement-breakpoint
CREATE INDEX "ix_clusterspace_client" ON "parameters"."cluster_space_client" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "ix_cluster_region" ON "parameters"."cluster" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "ix_region_state" ON "parameters"."region" USING btree ("state_id");