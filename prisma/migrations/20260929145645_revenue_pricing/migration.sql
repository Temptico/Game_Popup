-- CreateTable
CREATE TABLE "AttributedOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "popupId" TEXT,
    "code" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "amountUsd" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ShopState" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "overLimitSince" DATETIME
);

-- CreateIndex
CREATE INDEX "AttributedOrder_shop_createdAt_idx" ON "AttributedOrder"("shop", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AttributedOrder_shop_orderId_key" ON "AttributedOrder"("shop", "orderId");
