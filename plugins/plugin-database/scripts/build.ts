import { createPluginBuilder } from "@buntime/shared/build";

createPluginBuilder({
  client: true,
  external: ["@electric-sql/pglite"],
}).run();
