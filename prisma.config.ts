import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
