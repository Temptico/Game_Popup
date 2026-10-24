-- Install alert: install and uninstall times per shop
ALTER TABLE "ShopState" ADD COLUMN "installedAt" DATETIME;
ALTER TABLE "ShopState" ADD COLUMN "uninstalledAt" DATETIME;

-- Shops installed before this release count as known installs, so they don't trigger an alert.
INSERT INTO "ShopState" ("shop") SELECT DISTINCT "shop" FROM "Session" WHERE "shop" NOT IN (SELECT "shop" FROM "ShopState");
UPDATE "ShopState" SET "installedAt" = CAST(strftime('%s','now') AS INTEGER) * 1000;
