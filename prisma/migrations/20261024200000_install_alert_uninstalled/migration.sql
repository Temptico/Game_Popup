-- Shops that uninstalled before install alerts existed (no session left) count
-- as uninstalled, so installing again sends a "Reinstall" alert.
UPDATE "ShopState" SET "uninstalledAt" = CAST(strftime('%s','now') AS INTEGER) * 1000 + 1000
WHERE "uninstalledAt" IS NULL AND "shop" NOT IN (SELECT "shop" FROM "Session");
