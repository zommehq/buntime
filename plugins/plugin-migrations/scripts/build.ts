import { createPluginBuilder } from "@buntime/shared/build";

createPluginBuilder({ external: ["@electric-sql/pglite"] }).run();
