/**
Nama : Telegram Stalk
Creator: Vann Ryuichi
Source: https://whatsapp.com/channel/0029VbEP4oP545v13dU72P35
*/

const axios = require("axios");
const cheerio = require("cheerio");

async function stalkTelegram(username) {
  const cleanUsername = username.replace(/^@/, "").trim();
  const url = `https://t.me/${cleanUsername}`;

  const { data: html } = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  const $ = cheerio.load(html);

  const title = $(".tgme_page_title span").first().text().trim();
  
  if (!title) {
    throw new Error("Username Telegram tidak ditemukan atau akun privat");
  }

  const bio = $(".tgme_page_description").text().trim() || null;
  const extra = $(".tgme_page_extra").text().trim(); // Isinya @username atau jumlah subscribers/members
  const avatar = $(".tgme_page_photo_image").attr("src") || null;
  const isVerified = $(".tgme_page_title .verified-icon").length > 0;

  let type = "user/bot";
  if (extra.toLowerCase().includes("subscribers")) {
    type = "channel";
  } else if (extra.toLowerCase().includes("members")) {
    type = "group";
  }

  return {
    title,
    username: cleanUsername,
    type,
    isVerified,
    bio,
    info: extra || `@${cleanUsername}`,
    avatar,
    url,
  };
}

module.exports = function (app) {
  app.get("/api/telegram/stalk", async (req, res) => {
    try {
      const { username } = req.query;

      if (!username) {
        return res.status(400).json({
          status: false,
          creator: "Vanzz Ryuichi",
          error: "Parameter 'username' wajib diisi",
          example: "/vsunseeV8/telegram/stalk?username=durov",
        });
      }

      const result = await stalkTelegram(username);

      res.status(200).json({
        status: true,
        creator: "Vanzz Ryuichi",
        result,
      });
    } catch (err) {
      const isNotFound = err.message.includes("tidak ditemukan");
      res.status(isNotFound ? 404 : 500).json({
        status: false,
        creator: "Vanzz Ryuichi",
        error: err.message,
      });
    }
  });
};
