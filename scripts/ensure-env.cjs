// Creates/extends the local .env so Prisma finds the SQLite database in dev.
// Production (Fly.io) sets DATABASE_URL itself (see fly.toml).
const fs = require("fs");
const path = require("path");

// Already provided by the environment (Fly.io, CI) → nothing to do.
if (process.env.DATABASE_URL) process.exit(0);

const file = path.join(__dirname, "..", ".env");
const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
if (!/^DATABASE_URL=/m.test(existing)) {
  // Relative to prisma/schema.prisma → prisma/dev.sqlite (same file as before).
  const line = 'DATABASE_URL="file:dev.sqlite"\n';
  fs.writeFileSync(file, existing && !existing.endsWith("\n") ? `${existing}\n${line}` : existing + line);
  console.log("[ensure-env] added DATABASE_URL to .env");
}
