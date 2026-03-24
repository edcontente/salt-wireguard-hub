-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "profileId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CommercialProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommercialProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxFinalPriceAdjustment" INTEGER NOT NULL DEFAULT 0,
    "canManageCatalog" BOOLEAN NOT NULL DEFAULT false,
    "canManageProposals" BOOLEAN NOT NULL DEFAULT false,
    "canManageUsers" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CommercialItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unitPrice" REAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommercialItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CommercialItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currentRevision" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Proposal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Proposal_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProposalVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProposalVersion_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProposalVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProposalSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalVersionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProposalSection_proposalVersionId_fkey" FOREIGN KEY ("proposalVersionId") REFERENCES "ProposalVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProposalItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalSectionId" TEXT NOT NULL,
    "commercialItemId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" REAL NOT NULL,
    "unitPrice" REAL NOT NULL,
    "discountPercent" REAL NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProposalItem_proposalSectionId_fkey" FOREIGN KEY ("proposalSectionId") REFERENCES "ProposalSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProposalItem_commercialItemId_fkey" FOREIGN KEY ("commercialItemId") REFERENCES "CommercialItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProposalPublicLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalVersionId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProposalPublicLink_proposalVersionId_fkey" FOREIGN KEY ("proposalVersionId") REFERENCES "ProposalVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProposalAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "proposalVersionId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProposalAuditLog_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProposalAuditLog_proposalVersionId_fkey" FOREIGN KEY ("proposalVersionId") REFERENCES "ProposalVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProposalAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialProfile_slug_key" ON "CommercialProfile"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialItem_code_key" ON "CommercialItem"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_number_key" ON "Proposal"("number");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalVersion_proposalId_revisionNumber_key" ON "ProposalVersion"("proposalId", "revisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalSection_proposalVersionId_position_key" ON "ProposalSection"("proposalVersionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalItem_proposalSectionId_position_key" ON "ProposalItem"("proposalSectionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalPublicLink_token_key" ON "ProposalPublicLink"("token");
