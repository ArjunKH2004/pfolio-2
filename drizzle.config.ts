import { defineConfig } from 'drizzle-kit';

// drizzle-kit config — used when the agent declares an App Database (AD-18).
// Migrations are output to .mfg/migrations/ per the AD-14 bundle layout.
// Run: npx drizzle-kit generate
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/server/schema.ts',
  out: './.mfg/migrations',
});
