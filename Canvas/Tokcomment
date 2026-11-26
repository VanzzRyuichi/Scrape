 /**
 * Title: TokComment Sosmed Comment Generator
 * Base: https://tokcomment.com
 * Creator: Vanzz Ryuichi
 * Saluran: https://whatsapp.com/channel/0029VbEP4oP545v13dU72P35
 */

const {
    createCanvas,
    loadImage,
    GlobalFonts
} = require("@napi-rs/canvas");

const FONT_URLS = {
    bold: "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Regular.ttf", // <-- Ganti Bold jadi Regular (tidak bold)
    extraBold: "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-ExtraBold.ttf",
    emoji: "https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/fonts/NotoColorEmoji.ttf"
};

let fontsReady = false;

async function fetchBuffer(url, headers = {}) {
    const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} saat memuat ${url}`);
    return Buffer.from(await res.arrayBuffer());
}

async function ensureFonts() {
    if (fontsReady) return;

    const tasks = [];

    if (!GlobalFonts.has("TokSansBold")) {
        tasks.push(
            fetchBuffer(FONT_URLS.bold)
            .then((buf) => GlobalFonts.register(buf, "TokSansBold"))
            .catch(() => {})
        );
    }

    if (!GlobalFonts.has("TokSansExtraBold")) {
        tasks.push(
            fetchBuffer(FONT_URLS.extraBold)
            .then((buf) => GlobalFonts.register(buf, "TokSansExtraBold"))
            .catch(() => {})
        );
    }

    if (!GlobalFonts.has("NotoColorEmoji")) {
        tasks.push(
            fetchBuffer(FONT_URLS.emoji)
            .then((buf) => GlobalFonts.register(buf, "NotoColorEmoji"))
            .catch(() => {})
        );
    }

    await Promise.all(tasks);
    fontsReady = true;
}

function wrapText(ctx, text, maxWidth) {
    const words = String(text || "").trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let currentLine = "";

    for (const word of words) {
        if (ctx.measureText(word).width > maxWidth) {
            if (currentLine) {
                lines.push(currentLine);
                currentLine = "";
            }
            let chunk = "";
            for (const ch of Array.from(word)) {
                if (ctx.measureText(chunk + ch).width > maxWidth) {
                    lines.push(chunk);
                    chunk = ch;
                } else {
                    chunk += ch;
                }
            }
            currentLine = chunk;
            continue;
        }

        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(testLine).width <= maxWidth) {
            currentLine = testLine;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }

    if (currentLine) lines.push(currentLine);
    return lines.length ? lines : [""];
}

function drawBubbleShape(ctx, width, bubbleHeight, tailHeight, radius) {
    ctx.beginPath();
    ctx.moveTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.lineTo(width - radius, 0);
    ctx.quadraticCurveTo(width, 0, width, radius);
    ctx.lineTo(width, bubbleHeight - radius);
    ctx.quadraticCurveTo(width, bubbleHeight, width - radius, bubbleHeight);
    ctx.lineTo(58, bubbleHeight);
    ctx.lineTo(18, bubbleHeight + tailHeight - 6);
    ctx.quadraticCurveTo(7, bubbleHeight + tailHeight + 5, 2, bubbleHeight + tailHeight - 8);
    ctx.quadraticCurveTo(0, bubbleHeight + tailHeight - 16, 0, bubbleHeight - 18);
    ctx.lineTo(0, radius);
    ctx.closePath();
}

function drawDefaultSilhouette(ctx, cx, cy, r, isDark) {
    ctx.fillStyle = isDark ? "#2f3241" : "#c7cdd4";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isDark ? "#8a8f9e" : "#646d77";
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.1, r * 0.36, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy + r * 1.15, r * 0.78, Math.PI * 1.15, Math.PI * 1.85);
    ctx.lineTo(cx + r, cy + r);
    ctx.lineTo(cx - r, cy + r);
    ctx.closePath();
    ctx.fill();
}

function drawCoverImage(ctx, img, x, y, size) {
    const iw = img.width;
    const ih = img.height;
    const scale = Math.max(size / iw, size / ih);
    const sw = size / scale;
    const sh = size / scale;
    const sx = (iw - sw) / 2;
    const sy = (ih - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, size, size);
}

async function renderTikTokComment({
    username,
    comment,
    link,
    theme = "light"
}) {
    await ensureFonts();

    const isDark = String(theme).toLowerCase() === "dark";

    const palette = isDark ?
        {
            canvasBg: "#ffffff",
            bubbleBg: "#161823",
            headerText: "#989ba2",
            commentText: "#ffffff"
        } :
        {
            canvasBg: "#000000",
            bubbleBg: "#ffffff",
            headerText: "#757880",
            commentText: "#000000"
        };

    const MAX_CANVAS_W = 1000;
    const MIN_CANVAS_W = 800;
    const TEXT_START_X = 184;
    const RIGHT_PAD = 62;
    const TOP_PAD = 58;
    const HEADER_GAP = 10;
    const BOTTOM_PAD = 60;
    const TAIL_H = 53;
    const CORNER_R = 42;

    const AVATAR_R = 53;
    const AVATAR_CX = 98;
    const AVATAR_CY = 120;

    const HEADER_FONT_SIZE = 27;
    const COMMENT_FONT_SIZE = 55;
    const COMMENT_LINE_HEIGHT = 92;

    const HEADER_FONT = `700 ${HEADER_FONT_SIZE}px "TokSansBold", "NotoColorEmoji", sans-serif`;
    const COMMENT_FONT = `800 ${COMMENT_FONT_SIZE}px "TokSansExtraBold", "NotoColorEmoji", sans-serif`;

    const tempCanvas = createCanvas(MAX_CANVAS_W, 200);
    const tctx = tempCanvas.getContext("2d");

    const cleanUser = String(username || "username").trim().replace(/^@/, "");
    const headerText = `Reply to ${cleanUser}'s comment`;

    tctx.font = HEADER_FONT;
    const headerWidth = tctx.measureText(headerText).width;

    const maxAllowedTextW = MAX_CANVAS_W - TEXT_START_X - RIGHT_PAD;
    tctx.font = COMMENT_FONT;
    const lines = wrapText(tctx, comment, maxAllowedTextW);

    let widestLine = headerWidth;
    for (const line of lines) {
        const lw = tctx.measureText(line).width;
        if (lw > widestLine) widestLine = lw;
    }

    const canvasWidth = Math.min(
        MAX_CANVAS_W,
        Math.max(MIN_CANVAS_W, Math.ceil(TEXT_START_X + widestLine + RIGHT_PAD))
    );

    const textBlockHeight = HEADER_FONT_SIZE + HEADER_GAP + lines.length * COMMENT_LINE_HEIGHT;
    const bubbleHeight = Math.max(270, TOP_PAD + textBlockHeight + BOTTOM_PAD);
    const canvasHeight = bubbleHeight + TAIL_H;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Background 
    ctx.fillStyle = palette.canvasBg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    //  Komentar
    drawBubbleShape(ctx, canvasWidth, bubbleHeight, TAIL_H, CORNER_R);
    ctx.fillStyle = palette.bubbleBg;
    ctx.fill();

    // Avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(AVATAR_CX, AVATAR_CY, AVATAR_R, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    let loadedAvatar = null;
    if (link && /^https?:\/\//i.test(link)) {
        try {
            const imgBuf = await fetchBuffer(link, {
                "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36"
            });
            loadedAvatar = await loadImage(imgBuf);
        } catch (_) {
            loadedAvatar = null;
        }
    }

    if (loadedAvatar) {
        drawCoverImage(ctx, loadedAvatar, AVATAR_CX - AVATAR_R, AVATAR_CY - AVATAR_R, AVATAR_R * 2);
    } else {
        drawDefaultSilhouette(ctx, AVATAR_CX, AVATAR_CY, AVATAR_R, isDark);
    }
    ctx.restore();

    // Teks Reply ("Reply to username's comment")
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = HEADER_FONT;
    ctx.fillStyle = palette.headerText;
    ctx.fillText(headerText, Math.round(TEXT_START_X), Math.round(TOP_PAD));

    // Teks Komentar 
    ctx.font = COMMENT_FONT;
    ctx.fillStyle = palette.commentText;
    let lineY = TOP_PAD + HEADER_FONT_SIZE + HEADER_GAP;
    for (const line of lines) {
        ctx.fillText(line, Math.round(TEXT_START_X), Math.round(lineY));
        lineY += COMMENT_LINE_HEIGHT;
    }

    return canvas.toBuffer("image/png");
}

module.exports = function(app) {
    app.get("/maker/tokcomment", async (req, res) => {
        const {
            username = "username",
                comment,
                text,
                link,
                avatar,
                url,
                theme = "light"
        } = req.query;

        const commentText = String(comment || text || "").trim();
        const avatarLink = String(link || avatar || url || "").trim();
        const selectedTheme = String(theme || "light").trim().toLowerCase();

        if (!commentText) {
            return res.status(400).json({
                status: false,
                creator: "Vanzz Ryuichi",
                error: "Parameter 'comment' wajib diisi"
            });
        }

        if (!["light", "dark"].includes(selectedTheme)) {
            return res.status(400).json({
                status: false,
                creator: "Vanzz Ryuichi",
                error: "Parameter 'theme' harus 'light' atau 'dark'"
            });
        }

        try {
            const pngBuffer = await renderTikTokComment({
                username: String(username).trim() || "username",
                comment: commentText,
                link: avatarLink || null,
                theme: selectedTheme
            });

            res.setHeader("Content-Type", "image/png");
            res.setHeader("Content-Disposition", 'inline; filename="tokcomment.png"');
            res.setHeader("Content-Length", pngBuffer.length);
            return res.send(pngBuffer);
        } catch (err) {
            return res.status(500).json({
                status: false,
                creator: "Vanzz Ryuichi",
                error: err.message || "Gagal membuat gambar komentar TikTok"
            });
        }
    });
};

Example Input:

username=vanzry
comment=Like Es Goreng
link=
theme=light/dark
