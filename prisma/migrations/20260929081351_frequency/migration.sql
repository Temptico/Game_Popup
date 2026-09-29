-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Popup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "discountCode" TEXT NOT NULL,
    "delaySec" INTEGER NOT NULL DEFAULT 15,
    "surviveSec" INTEGER NOT NULL DEFAULT 15,
    "vx" REAL NOT NULL DEFAULT 4.5,
    "vy" REAL NOT NULL DEFAULT -5.0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "primaryColor" TEXT NOT NULL DEFAULT '#830522',
    "accentColor" TEXT NOT NULL DEFAULT '#d9caa0',
    "target" TEXT NOT NULL DEFAULT 'all',
    "requireConsent" BOOLEAN NOT NULL DEFAULT true,
    "autoApply" BOOLEAN NOT NULL DEFAULT true,
    "codeMode" TEXT NOT NULL DEFAULT 'static',
    "discountType" TEXT NOT NULL DEFAULT 'percentage',
    "discountValue" REAL NOT NULL DEFAULT 10,
    "codePrefix" TEXT NOT NULL DEFAULT 'WIN',
    "codeExpiryDays" INTEGER NOT NULL DEFAULT 7,
    "gameType" TEXT NOT NULL DEFAULT 'paddle',
    "trigger" TEXT NOT NULL DEFAULT 'both',
    "frequency" TEXT NOT NULL DEFAULT 'session',
    "teaser" BOOLEAN NOT NULL DEFAULT true,
    "tiered" BOOLEAN NOT NULL DEFAULT false,
    "tierValues" TEXT NOT NULL DEFAULT '15,10,5',
    "urgencyMinutes" INTEGER NOT NULL DEFAULT 0,
    "strings" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Popup" ("accentColor", "active", "autoApply", "codeExpiryDays", "codeMode", "codePrefix", "createdAt", "delaySec", "discountCode", "discountType", "discountValue", "gameType", "id", "maxAttempts", "name", "primaryColor", "requireConsent", "shop", "strings", "surviveSec", "target", "teaser", "tierValues", "tiered", "trigger", "updatedAt", "urgencyMinutes", "vx", "vy") SELECT "accentColor", "active", "autoApply", "codeExpiryDays", "codeMode", "codePrefix", "createdAt", "delaySec", "discountCode", "discountType", "discountValue", "gameType", "id", "maxAttempts", "name", "primaryColor", "requireConsent", "shop", "strings", "surviveSec", "target", "teaser", "tierValues", "tiered", "trigger", "updatedAt", "urgencyMinutes", "vx", "vy" FROM "Popup";
DROP TABLE "Popup";
ALTER TABLE "new_Popup" RENAME TO "Popup";
CREATE INDEX "Popup_shop_idx" ON "Popup"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
