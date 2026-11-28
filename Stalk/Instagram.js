/**
Nama : Instagram Stalk
Creator: Vann Ryuichi
Source: https://whatsapp.com/channel/0029VbEP4oP545v13dU72P35
Note: Reshare Credit Jgn Di Hapus mas & Error Fix Sndri 😹
*/

const WEB_BASE = "https://www.instagram.com";
const WEB_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const HARDCODED_SESSIONID =
  "50541774528%3ABk2D03670AThaJ%3A18%3AAYm3UT0LF9CJtUoyD6h4Be0HfgmTN4NIDezrpWki0Q";
const HARDCODED_CSRFTOKEN = "RMxPL1vAUe7XEEYTa_af8U";
const HARDCODED_DS_USER_ID = "50541774528";
const HARDCODED_COOKIE = `sessionid=${HARDCODED_SESSIONID}; csrftoken=${HARDCODED_CSRFTOKEN}; dpr=2.4000000953674316; wd=450x834; ds_user_id=${HARDCODED_DS_USER_ID}`;

function decodeHtmlEntities(str) {
  if (!str) return null;
  const named = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'"
  };
  return String(str)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&(amp|lt|gt|quot|#39|apos);/g, (m) => named[m] || m);
}

function parseCompactCount(raw) {
  if (!raw) return null;
  const clean = String(raw).trim().replace(/,/g, "");
  const m = clean.match(/^([\d.]+)([KMB])?$/i);
  if (!m) return Number(clean) || null;
  const num = parseFloat(m[1]);
  const suffix = (m[2] || "").toUpperCase();
  if (suffix === "K") return Math.round(num * 1e3);
  if (suffix === "M") return Math.round(num * 1e6);
  if (suffix === "B") return Math.round(num * 1e9);
  return Math.round(num);
}

function stripNulls(obj) {
  if (Array.isArray(obj)) {
    return obj
      .map(stripNulls)
      .filter((item) => item !== null && item !== undefined);
  }
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      const cleaned = stripNulls(v);
      if (cleaned === null || cleaned === undefined) continue;
      if (Array.isArray(cleaned) && cleaned.length === 0) continue;
      out[k] = cleaned;
    }
    return out;
  }
  return obj;
}

function webHeaders() {
  return {
    "user-agent": WEB_USER_AGENT,
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9",
    "cache-control": "no-cache",
    "sec-fetch-site": "none",
    "sec-fetch-mode": "navigate",
    "sec-fetch-dest": "document",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
    cookie: HARDCODED_COOKIE
  };
}

function extractJsonScripts(html) {
  const scripts = [];
  const pattern = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g;
  let match;
  while ((match = pattern.exec(html)) !== null) scripts.push(match[1]);
  return scripts;
}

function deepFind(object, key, output = []) {
  if (!object || typeof object !== "object") return output;
  if (object[key] !== undefined) output.push(object[key]);
  if (Array.isArray(object)) {
    for (const value of object) deepFind(value, key, output);
  } else {
    for (const value of Object.values(object)) deepFind(value, key, output);
  }
  return output;
}

function parseMetaFallback(html, username) {
  const ogTitleRaw =
    html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/i)?.[1] || null;
  const ogDescRaw =
    html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i)?.[1] || null;
  const ogImgRaw =
    html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i)?.[1] || null;

  const ogTitle = decodeHtmlEntities(ogTitleRaw);
  const ogDesc = decodeHtmlEntities(ogDescRaw);
  const ogImg = decodeHtmlEntities(ogImgRaw);

  if (!ogTitle && !ogDesc && !ogImg) return null;

  const statsMatch = ogDesc
    ? ogDesc.match(/([\d.,]+[KMB]?)\s+Followers?,\s*([\d.,]+[KMB]?)\s+Following,\s*([\d.,]+[KMB]?)\s+Posts?/i)
    : null;

  return {
    username,
    full_name: ogTitle,
    biography: ogDesc,
    profile_pic_url: ogImg,
    follower_count: statsMatch ? parseCompactCount(statsMatch[1]) : null,
    following_count: statsMatch ? parseCompactCount(statsMatch[2]) : null,
    media_count: statsMatch ? parseCompactCount(statsMatch[3]) : null
  };
}

function normalizePost(node) {
  return {
    id: node.pk ?? node.id ?? null,
    shortcode: node.code ?? null,
    url: node.code ? `${WEB_BASE}/p/${node.code}/` : null,
    media_type: node.media_type ?? null,
    product_type: node.product_type ?? null,
    caption: decodeHtmlEntities(node.caption?.text ?? null),
    display_url: decodeHtmlEntities(node.display_uri ?? null),
    carousel_count: node.carousel_media_count ?? null,
    taken_at: node.taken_at_timestamp ?? node.taken_at ?? null,
    like_count: node.like_count ?? null,
    comment_count: node.comment_count ?? null
  };
}

function normalizeProfile(profileData, timeline) {
  const edges = Array.isArray(timeline?.edges) ? timeline.edges : [];
  return {
    id: profileData.pk ?? profileData.id ?? null,
    username: profileData.username ?? null,
    full_name: decodeHtmlEntities(profileData.full_name ?? null),
    biography: decodeHtmlEntities(profileData.biography ?? null),
    profile_pic_url: decodeHtmlEntities(profileData.profile_pic_url ?? null),
    is_private: Boolean(profileData.is_private),
    is_verified: Boolean(profileData.is_verified),
    is_memorialized: Boolean(profileData.is_memorialized),
    follower_count: profileData.follower_count ?? null,
    following_count: profileData.following_count ?? null,
    media_count: profileData.all_media_count ?? null,
    pronouns: Array.isArray(profileData.pronouns) ? profileData.pronouns : [],
    bio_links: Array.isArray(profileData.bio_links)
      ? profileData.bio_links.map((link) => ({
          title: decodeHtmlEntities(link.title || null),
          url: decodeHtmlEntities(link.url || null)
        }))
      : [],
    latest_posts: edges
      .map((edge) => edge?.node)
      .filter(Boolean)
      .map(normalizePost)
  };
}

async function getProfile(username) {
  const clean = String(username || "").replace(/^@/, "").trim();
  if (!clean) throw new Error("Parameter 'username' wajib diisi");

  const targetUrl = `${WEB_BASE}/${encodeURIComponent(clean)}/`;
  const response = await fetch(targetUrl, {
    headers: webHeaders(),
    redirect: "follow"
  });
  const html = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} saat mengambil halaman ${targetUrl}`);
  }

  let foundProfile = null;
  let foundTimeline = null;

  for (const source of extractJsonScripts(html)) {
    let json;
    try {
      json = JSON.parse(source);
    } catch {
      continue;
    }

    for (const candidate of deepFind(json, "xig_user_by_username")) {
      if (
        candidate &&
        typeof candidate === "object" &&
        candidate.username &&
        candidate.follower_count !== undefined
      ) {
        foundProfile = candidate;
      }
    }

    const timeline = deepFind(json, "polaris_ordered_timeline_connection")[0];
    if (timeline && Array.isArray(timeline.edges)) foundTimeline = timeline;
  }

  if (foundProfile) {
    return stripNulls({
      source: targetUrl,
      ...normalizeProfile(foundProfile, foundTimeline)
    });
  }

  const fallback = parseMetaFallback(html, clean);
  if (fallback) {
    return stripNulls({
      source: targetUrl,
      ...fallback
    });
  }

  throw new Error(
    `Data profil untuk @${clean} tidak ditemukan; akun mungkin tidak tersedia atau mengarah ke halaman login.`
  );
}

module.exports = function (app) {
  app.get("/api/instagram/profile", async (req, res) => {
    const { username, user } = req.query;
    const targetUser = String(username || user || "").trim();

    if (!targetUser) {
      return res.status(400).json({
        status: false,
        creator: "Vanzz Ryuichi",
        error: "Parameter 'username' wajib diisi"
      });
    }

    try {
      const data = await getProfile(targetUser);
      return res.json({
        status: true,
        creator: "Vanzz Ryuichi",
        result: data
      });
    } catch (err) {
      return res.status(500).json({
        status: false,
        creator: "Vanzz Ryuichi",
        error: err.message
      });
    }
  });
};


Response:
{
  "status": true,
  "creator": "Vanzz Ryuichi",
  "result": {
    "source": "https://www.instagram.com/facebook/",
    "username": "facebook",
    "full_name": "Facebook (@facebook) • Instagram photos and videos",
    "biography": "8M Followers, 43 Following, 1,683 Posts - See Instagram photos and videos from Facebook (@facebook)",
    "profile_pic_url": "https://scontent-sin2-1.cdninstagram.com/v/t51.82787-19/550076155_18561115294015200_6727228761423599898_n.jpg?stp=dst-jpg_s150x150_tt6&_nc_cat=1&ig_cache_key=GPt_ySDgHrxrPPFBABrZcYfq6ltdbmNDAQAB1501500j-ccb7-5&ccb=7-5&_nc_sid=669407&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=uNWgI9VDIWQQ7kNvwEEFYdL&_nc_oc=AdoNQlXIxEW9lsiy3Vh4ybWnidjV3DimZgCxaDTWdJHJichtHbAvrO3DX3Ce0bxmRcI&_nc_zt=24&_nc_ht=scontent-sin2-1.cdninstagram.com&_nc_gid=w-nOyLGDtwT5ns4t_88yrA&_nc_ss=707a8&_nc_ct=RQosPBUCFQIAAAA&oh=00_AQWiZT7WXvylhhekx8I2R_y_rRBy8oN3KdVFAVS7FhpaAw&oe=6B10A4B6",
    "follower_count": 8000000,
    "following_count": 43,
    "media_count": 1683
  }
}
