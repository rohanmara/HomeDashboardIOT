const HOTSTAR_API = 'https://api.hotstar.com/o/v1';
const SHOW_LINK_RE =
  /^https?:\/\/(?:www\.)?hotstar\.com(?:\/in)?\/shows\/([^/?#]+)\/(\d{10})\/?(?:[?#].*)?$/i;

const defaultHeaders = {
  'x-country-code': 'IN',
  'x-platform-code': 'PCTV',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
};

/** @type {Map<string, { expiresAt: number, value: HotstarResolveResult }>} */
const resolveCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * @typedef {object} HotstarResolveResult
 * @property {string} showSlug
 * @property {string} showId
 * @property {string} showDeepLink
 * @property {string} deepLink
 * @property {string[]} candidates
 * @property {{ contentId: string, title: string, episodeNo: number | null, broadcastDate: number | null }} episode
 */

/**
 * @param {string} deepLink
 * @returns {{ showSlug: string, showId: string } | null}
 */
export function parseHotstarShowLink(deepLink) {
  const match = String(deepLink ?? '')
    .trim()
    .match(SHOW_LINK_RE);
  if (!match) {
    return null;
  }
  return { showSlug: match[1], showId: match[2] };
}

/**
 * @param {string} title
 */
function slugifyEpisodeTitle(title) {
  return String(title ?? 'episode')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'episode';
}

/**
 * @param {string} pathAndQuery
 */
async function hotstarGet(pathAndQuery) {
  const response = await fetch(`${HOTSTAR_API}/${pathAndQuery}`, {
    headers: defaultHeaders,
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) {
    const error = new Error(`Hotstar API ${response.status} for ${pathAndQuery}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * @param {unknown[]} items
 */
function pickLatestEpisode(items) {
  const episodes = items.filter(
    (item) =>
      item &&
      typeof item === 'object' &&
      'contentId' in item &&
      item.contentId != null &&
      String(/** @type {{ contentType?: string, assetType?: string }} */ (item).contentType ?? '').toUpperCase() ===
        'EPISODE'
  );

  if (episodes.length === 0) {
    return null;
  }

  return [...episodes].sort((a, b) => {
    const episodeDiff =
      Number(/** @type {{ episodeNo?: number }} */ (b).episodeNo ?? 0) -
      Number(/** @type {{ episodeNo?: number }} */ (a).episodeNo ?? 0);
    if (episodeDiff !== 0) {
      return episodeDiff;
    }

    return (
      Number(
        /** @type {{ broadCastDate?: number, broadcastDate?: number }} */ (b).broadCastDate ??
          /** @type {{ broadcastDate?: number }} */ (b).broadcastDate ??
          0
      ) -
      Number(
        /** @type {{ broadCastDate?: number, broadcastDate?: number }} */ (a).broadCastDate ??
          /** @type {{ broadcastDate?: number }} */ (a).broadcastDate ??
          0
      )
    );
  })[0];
}

/**
 * Resolve the latest episode deep link for a Hotstar show URL.
 * Falls back to the show page when the catalog lookup fails.
 *
 * @param {string} showDeepLink
 * @returns {Promise<HotstarResolveResult | { showDeepLink: string, deepLink: string, candidates: string[], warning: string, episode: null }>}
 */
export async function resolveHotstarLatestEpisode(showDeepLink) {
  const trimmed = String(showDeepLink ?? '').trim();
  const parsed = parseHotstarShowLink(trimmed);
  if (!parsed) {
    return {
      showDeepLink: trimmed,
      deepLink: trimmed,
      candidates: [trimmed],
      warning: 'Hotstar link is not a /shows/{slug}/{id} URL; using as-is.',
      episode: null
    };
  }

  const cacheKey = `${parsed.showSlug}:${parsed.showId}`;
  const cached = resolveCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    await hotstarGet(`show/detail?contentId=${parsed.showId}&tas=5`);

    const tray = await hotstarGet(
      `tray/g/1/items?etid=0&eid=${parsed.showId}&tao=0&tas=20`
    );
    const items =
      tray?.body?.results?.items ??
      tray?.body?.results?.assets?.items ??
      [];
    const latest = pickLatestEpisode(Array.isArray(items) ? items : []);

    if (!latest) {
      return {
        showDeepLink: trimmed,
        deepLink: trimmed,
        candidates: [trimmed],
        warning: `No episodes found for Hotstar show ${parsed.showId}; opening show page.`,
        episode: null
      };
    }

    const contentId = String(latest.contentId);
    const title = String(latest.title ?? 'Latest episode');
    const episodeSlug = slugifyEpisodeTitle(title);
    const episodeDeepLink = `https://www.hotstar.com/in/shows/${parsed.showSlug}/${parsed.showId}/${episodeSlug}/${contentId}/watch?ulp_id=${parsed.showId}`;
    const shortEpisodeDeepLink = `https://www.hotstar.com/in/shows/${parsed.showSlug}/${parsed.showId}/${contentId}`;

    /** @type {HotstarResolveResult} */
    const value = {
      showSlug: parsed.showSlug,
      showId: parsed.showId,
      showDeepLink: trimmed,
      deepLink: episodeDeepLink,
      candidates: [...new Set([episodeDeepLink, shortEpisodeDeepLink, trimmed])],
      episode: {
        contentId,
        title,
        episodeNo:
          latest.episodeNo == null ? null : Number(latest.episodeNo),
        broadcastDate:
          latest.broadCastDate == null && latest.broadcastDate == null
            ? null
            : Number(latest.broadCastDate ?? latest.broadcastDate)
      }
    };

    resolveCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value });
    return value;
  } catch (error) {
    const status = error?.status;
    const reason =
      status === 404
        ? `Hotstar show id ${parsed.showId} was not found (catalog may have remapped).`
        : `Hotstar latest-episode lookup failed (${error?.message ?? 'unknown error'}).`;

    return {
      showDeepLink: trimmed,
      deepLink: trimmed,
      candidates: [trimmed],
      warning: `${reason} Opening show page instead.`,
      episode: null
    };
  }
}
