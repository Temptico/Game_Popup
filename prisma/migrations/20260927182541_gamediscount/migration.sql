-- CreateTable
CREATE TABLE "Popup" (
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
    "strings" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "popupId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_popupId_fkey" FOREIGN KEY ("popupId") REFERENCES "Popup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Popup_shop_idx" ON "Popup"("shop");

-- CreateIndex
CREATE INDEX "Event_shop_type_createdAt_idx" ON "Event"("shop", "type", "createdAt");

-- CreateIndex
CREATE INDEX "Event_popupId_type_idx" ON "Event"("popupId", "type");
