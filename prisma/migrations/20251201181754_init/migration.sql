-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "globalPreferences" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goalText" TEXT,
    "budgetMin" REAL,
    "budgetMax" REAL,
    "hardConstraints" TEXT NOT NULL DEFAULT '{}',
    "softPreferences" TEXT NOT NULL DEFAULT '{}',
    "deadlineDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "winnerDealId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "listingTitle" TEXT NOT NULL,
    "marketplaceType" TEXT NOT NULL DEFAULT 'other',
    "listingDescription" TEXT,
    "listingUrl" TEXT,
    "askingPrice" REAL NOT NULL,
    "listingAttributes" TEXT NOT NULL DEFAULT '{}',
    "distanceKm" REAL,
    "postedDaysAgo" INTEGER,
    "fitScore" REAL NOT NULL DEFAULT 0,
    "priceScore" REAL NOT NULL DEFAULT 0,
    "riskScore" REAL NOT NULL DEFAULT 0,
    "leverageScore" REAL NOT NULL DEFAULT 0,
    "dealScore" REAL NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL DEFAULT 'active',
    "outcome" TEXT,
    "agentRating" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Deal_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NegotiationPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "targetPrice" REAL NOT NULL,
    "walkawayPrice" REAL NOT NULL,
    "maxConcessions" INTEGER NOT NULL DEFAULT 3,
    "currentConcessionStep" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NegotiationPlan_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatTurn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatTurn_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NegotiationPlan_dealId_key" ON "NegotiationPlan"("dealId");
