/**
 * Ambassador matching and normalization utilities
 * Handles Hebrew spelling variants (מלא/חסר, א/ה, ו/י) and multi-key slug/ID matching.
 */

export function normalizeHebrewText(str?: string): string {
  if (!str) return "";
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[\u0591-\u05C7]/g, "") // remove Hebrew niqqud & cantillation
    .replace(/[־–—]/g, "-")
    .replace(/['"״׳`]/g, "")
    .replace(/\s+/g, " ");
}

export function getHebrewSkeleton(str?: string): string {
  const norm = normalizeHebrewText(str);
  if (!norm) return "";
  return norm
    .replace(/[ויו]/g, "") // strip vav and yod
    .replace(/ה(?=\s|$)/g, "") // normalize trailing heh
    .replace(/א(?=\s|$)/g, "") // normalize trailing alef
    .replace(/\s+/g, "");
}

export function isAmbassadorNameMatch(nameA?: string, nameB?: string): boolean {
  if (!nameA || !nameB) return false;
  const a = normalizeHebrewText(nameA);
  const b = normalizeHebrewText(nameB);
  if (!a || !b) return false;

  // Exact or substring match
  if (a === b || a.includes(b) || b.includes(a)) return true;

  // Skeleton match (handles נעמי vs נעומי, קיילא vs קיילה, וייס vs ויס)
  const skelA = getHebrewSkeleton(a);
  const skelB = getHebrewSkeleton(b);
  if (skelA && skelB && (skelA.length >= 2 || skelB.length >= 2)) {
    if (skelA === skelB || skelA.includes(skelB) || skelB.includes(skelA)) return true;
  }

  return false;
}

export function isDonationMatchingAmbassador(
  donation: {
    ambassadorId?: string | null;
    ambassadorSlug?: string | null;
    ambassadorName?: string | null;
    donorName?: string | null;
    [key: string]: any;
  },
  target: {
    id?: string | null;
    slug?: string | null;
    name?: string | null;
    leaderName?: string | null;
  }
): boolean {
  const dAmbName = (donation.ambassadorName || "").trim();
  const dAmbSlug = ((donation as any).ambassadorSlug || "").trim();
  const dAmbId = (donation.ambassadorId || "").trim();

  // If donation has no ambassador tag at all, it's not an ambassador donation
  if (!dAmbName && !dAmbSlug && !dAmbId) return false;

  const targetSlug = (target.slug || "").trim().toLowerCase();
  const targetId = (target.id || "").trim().toLowerCase();
  const targetName = (target.name || "").trim();
  const targetLeader = (target.leaderName || "").trim();

  // 1. Slug or ID match (case-insensitive)
  if (targetSlug) {
    const cleanDId = dAmbId.toLowerCase();
    const cleanDSlug = dAmbSlug.toLowerCase();
    const cleanDName = dAmbName.toLowerCase();
    if (cleanDSlug === targetSlug || cleanDId === targetSlug || cleanDName === targetSlug) {
      return true;
    }
  }

  if (targetId) {
    const cleanDId = dAmbId.toLowerCase();
    const cleanDSlug = dAmbSlug.toLowerCase();
    if (cleanDId === targetId || cleanDSlug === targetId) {
      return true;
    }
  }

  // 2. Name matching with Hebrew full/chaser normalization
  if (dAmbName) {
    if (targetName && isAmbassadorNameMatch(dAmbName, targetName)) {
      return true;
    }
    if (targetLeader && isAmbassadorNameMatch(dAmbName, targetLeader)) {
      return true;
    }
  }

  return false;
}
