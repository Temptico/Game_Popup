-- Reward in the headline, consolation reward, email after the game
ALTER TABLE "Popup" ADD COLUMN "showValue" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Popup" ADD COLUMN "consolation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Popup" ADD COLUMN "consolationValue" REAL NOT NULL DEFAULT 5;
ALTER TABLE "Popup" ADD COLUMN "emailAfter" BOOLEAN NOT NULL DEFAULT false;
