-- Cart condition for opening the popup by itself: any | empty | items
ALTER TABLE "Popup" ADD COLUMN "cartRule" TEXT NOT NULL DEFAULT 'any';
