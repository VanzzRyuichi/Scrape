/**
 * *Name :* `Nano Banana AI Image`
 * *Author :* XvnSynC - t.me/luyatiem
 * *Base Url :* https://deepfakemaker[.]io
 * *Channel :* https://whatsapp.com/channel/0029VbEGQYwFMqrOXqPPdz3W
* *Channel Share :* https://whatsapp.com/channel/0029VbEP4oP545v13dU72P35
 * *Description :* Mengedit gambar menggunakan Nano Banana AI
 **/
 
const axios = require("axios");
const crypto = require("crypto");

const config = {
  baseUrl: "https://apiv1.deepfakemaker.io/api",
  sSalt: "NHGNy5YFz7HeFb",
  publicKey:
    "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDa2oPxMZe71V4dw2r8rHWt59gH\nW5INRmlhepe6GUanrHykqKdlIB4kcJiu8dHC/FJeppOXVoKz82pvwZCmSUrF/1yr\nrnmUDjqUefDu8myjhcbio6CnG5TtQfwN2pz3g6yHkLgp8cFfyPSWwyOCMMMsTU9s\nsnOjvdDb4wiZI8x3UwIDAQAB\n-----END PUBLIC KEY-----",
  headers: {
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
    "User-Agent":
      "Mozilla/5.0 (Android 15; Mobile; SM-F958; rv:130.0) Gecko/130.0 Firefox/130.0",
    Referer: "https://deepfakemaker.io/nano-banana-ai/"
  }
};

const createRandomStr = (length) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    crypto.randomBytes(length),
    (b) => chars[b % chars.length]
  ).join("");
};

const getSecurityParams = (appId) => {
  const t = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();
  const tempAesKey = createRandomStr(16);
  const secretKey = crypto
    .publicEncrypt(
      { key: config.publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from(tempAesKey)
    )
    .toString("base64");

  const dataToSign = `${appId}:${config.sSalt}:${t}:${nonce}:${secretKey}`;
  const cipher = crypto.createCipheriv(
    "aes-128-cbc",
    Buffer.from(tempAesKey, "utf8"),
    Buffer.from(tempAesKey, "utf8")
  );
  const sign =
    cipher.update(dataToSign, "utf8", "base64") + cipher.final("base64");

  return { app_id: appId, t, nonce, sign, secret_key: secretKey };
};

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const downloadImageBuffer = async (imageUrl) => {
  const cleanUrl = String(imageUrl || "").trim();
  if (!cleanUrl) {
    throw new Error("Parameter 'image_url' wajib diisi");
  }
  if (!/^https?:\/\//i.test(cleanUrl)) {
    throw new Error("URL gambar tidak valid");
  }

  const imgRes = await axios.get(cleanUrl, {
    responseType: "arraybuffer"
  });
  const buf = Buffer.from(imgRes.data);
  if (!buf.length) {
    throw new Error("Gambar dari URL kosong");
  }
  return buf;
};

const processNanoBanana = async (promptText, imageUrl, outputFormat = "png") => {
  const cleanPrompt = String(promptText || "").trim();
  if (!cleanPrompt) {
    throw new Error("Parameter 'prompt' wajib diisi");
  }

  const imageBuffer = await downloadImageBuffer(imageUrl);
  const userId = createRandomStr(64).toLowerCase();
  const fileHash = crypto
    .createHash("sha256")
    .update(imageBuffer)
    .digest("hex");
  const filename = `${createRandomStr(32)}_${Date.now()}.jpg`;

  const uploadSignRes = await axios.post(
    `${config.baseUrl}/user/v2/upload-sign`,
    { filename, hash: fileHash, user_id: userId },
    { params: getSecurityParams("ai_df"), headers: config.headers }
  );

  const fileSignData = uploadSignRes.data?.data;
  if (!fileSignData?.url || !fileSignData?.object_name) {
    throw new Error("Gagal mendapatkan link upload storage internal.");
  }

  await axios.put(fileSignData.url, imageBuffer, {
    headers: {
      "content-type": "image/jpeg",
      "content-length": imageBuffer.length
    },
    maxBodyLength: Infinity
  });

  const taskRes = await axios.post(
    `${config.baseUrl}/replicate/v1/free/nano/banana/task`,
    {
      prompt: cleanPrompt,
      platform: "nano_banana",
      images: [`https://cdn.deepfakemaker.io/${fileSignData.object_name}`],
      output_format: outputFormat || "png",
      user_id: userId
    },
    { params: getSecurityParams("ai_df"), headers: config.headers }
  );

  const taskData = taskRes.data?.data;
  if (!taskData) {
    throw new Error(taskRes.data?.msg || "Gagal membuat task antrean gambar.");
  }

  let resultImageUrl = null;
  let retries = 30;

  while (!resultImageUrl && retries > 0) {
    await delay(2500);
    const pollParams = {
      ...getSecurityParams("ai_df"),
      user_id: userId,
      ...taskData
    };
    const checkRes = await axios.get(
      `${config.baseUrl}/replicate/v1/free/nano/banana/task`,
      {
        params: pollParams,
        headers: config.headers
      }
    );

    if (checkRes.data?.msg === "success" && checkRes.data?.data?.generate_url) {
      resultImageUrl = checkRes.data.data.generate_url;
      break;
    }

    retries--;
  }

  if (!resultImageUrl) {
    throw new Error("Waktu proses melebihi batas");
  }

  return {
    prompt: cleanPrompt,
    image_url: resultImageUrl,
    task: taskData
  };
};

module.exports = function (app) {
  app.get("/vsunseeV8/ai/nanobanana", async (req, res) => {
    const { prompt, image_url, imageUrl, image, url, format } = req.query;
    const sourceUrl = String(
      image_url || imageUrl || image || url || ""
    ).trim();

    if (!String(prompt || "").trim()) {
      return res.status(400).json({
        status: false,
        creator: "Vanzz Ryuichi",
        error: "Parameter 'prompt' wajib diisi"
      });
    }

    if (!sourceUrl) {
      return res.status(400).json({
        status: false,
        creator: "Vanzz Ryuichi",
        error: "Parameter 'image_url' wajib diisi"
      });
    }

    try {
      const result = await processNanoBanana(prompt, sourceUrl, format);
      return res.json({
        status: true,
        creator: "Vanzz Ryuichi",
        result
      });
    } catch (err) {
      return res.status(err.response?.status || 500).json({
        status: false,
        creator: "Vanzz Ryuichi",
        error: err.message
      });
    }
  });
};
