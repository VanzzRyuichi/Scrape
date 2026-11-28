/**
 * Title: Create Guest Akun Free Fire
 * Creator: https://gist.github.com/ayashiiiyo
 * Saluran: https://whatsapp.com/channel/0029VbEP4oP545v13dU72P35
 * Note: Error Fix Sndri😹
 */
 
const crypto = require("crypto");
const https = require("https");

const API_KEY =
  "2ee44819e9b4598845141067b281621874d0d5d7af9d8f7e00c1e54715b7d1e3";
const AES_KEY = Buffer.from("Yg&tc%DEuh6%Zc^8", "latin1");
const AES_IV = Buffer.from("6oyZDr22E3ychjM%", "latin1");
const CLIENT_ID = "100067";
const RELEASE_VERSION = "OB55";
const DEFAULT_LOGIN = "https://loginbp.ggblueshark.com/MajorLogin";
const GARENA_TOKEN_HOSTS = [
  "https://ffmconnect.live.gop.garenanow.com/oauth/guest/token/grant",
  "https://auth.garena.com/oauth/guest/token/grant"
];
const GUEST_REGISTER_JSON =
  "https://100067.connect.garena.com/api/v2/oauth/guest:register";
const GUEST_REGISTER_FORM =
  "https://ffmconnect.live.gop.garenanow.com/oauth/guest/register";
const REGISTER_HOST = "https://loginbp.ggblueshark.com";
const UNITY_UA =
  "Dalvik/2.1.0 (Linux; U; Android 13; A063 Build/TKQ1.221220.001)";

const CLUSTERS = [
  { cluster: "IND", host: "https://clientbp.freefireind.in" },
  { cluster: "IND", host: "https://client.ind.freefiremobile.com" },
  { cluster: "EUROPE", host: "https://clientbp.ppmainecoonghj.com" },
  { cluster: "US", host: "https://client.us.freefiremobile.com" }
];

const OB55_DEVICE_BLOB =
  "1a13323032352d31312d32362030313a35313a3238220966726565206669726528013a07312e3133322e314232416e64726f6964204f532039202f204150492d3238202850492f72656c2e636a772e32303232303531382e313134313333294a0848616e6468656c64520c4d544e2f537061636574656c5a045749464960800a68d00572033234307a2d7838362d3634205353453320535345342e3120535345342e32204156582041565832207c2032343030207c20348001e61e8a010f416472656e6f2028544d292036343092010d4f70656e474c20455320332e329a012b476f6f676c657c36323566373136662d393161372d343935622d396631362d303866653964336336353333a2010e3137362e32382e3133392e313835aa01026172b201203433303632343537393364653836646134323561353263616164663231656564ba010134c2010848616e6468656c64ca010d4f6e65506c7573204135303130ea014063363961653230386661643732373338623637346232383437623530613361316466613235643161313966616537343566633736616334613065343134633934f00101ca020c4d544e2f537061636574656cd2020457494649ca03203161633462383065636630343738613434323033626638666163363132306635e003b5ee02e8039a8002f003af13f80384078004a78f028804b5ee029004a78f029804b5ee02b00404c80401d2043d2f646174612f6170702f636f6d2e6474732e667265656669726574682d66705843537068495636644b43376a4c2d574f7952413d3d2f6c69622f61726de00401ea045f65363261623933353464386662356662303831646233333861636233333439317c2f646174612f6170702f636f6d2e6474732e667265656669726574682d66705843537068495636644b43376a4c2d574f7952413d3d2f626173652e61706bf00406f804018a050233329a050a32303139313139303236a80503b205094f70656e474c455332b805ff01c00504e005be7eea05093372645f7061727479f205704b717348543857393347646347335a6f7a454e6646775648746d377171316552554e6149444e67526f626f7a4942744c4f695943633459367a767670634943787a514632734f453463627974774c7334785a62526e70524d706d5752514b6d654f35766373386e51594268777148374bf805e7e4068806019006019a060134a2060134b2062213521146500e590349510e460900115843395f005b510f685b560a6107576d0f0366";

const varint = (n) => {
  const out = [];
  let v = Math.floor(Number(n));
  while (v > 0x7f) {
    out.push((v & 0x7f) | 0x80);
    v = Math.floor(v / 128);
  }
  out.push(v);
  return Buffer.from(out);
};

const tag = (field, wire) => varint((field << 3) | wire);

const fieldBytes = (field, value) => {
  const buf = Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8");
  return Buffer.concat([tag(field, 2), varint(buf.length), buf]);
};

const fieldNumber = (field, value) =>
  Buffer.concat([tag(field, 0), varint(value)]);

const fieldBool = (field, value) => fieldNumber(field, value ? 1 : 0);

const encodeValue = (field, value) => {
  if (typeof value === "number") return fieldNumber(field, value);
  if (typeof value === "boolean") return fieldBool(field, value);
  return fieldBytes(field, value);
};

const encode = (fields) => {
  const parts = [];
  for (const [field, value] of fields) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) parts.push(encodeValue(field, item));
    } else {
      parts.push(encodeValue(field, value));
    }
  }
  return Buffer.concat(parts);
};

const readVarint = (buf, offset) => {
  let value = 0;
  let shift = 0;
  let pos = offset;
  while (pos < buf.length) {
    const byte = buf[pos++];
    value += (byte & 0x7f) * Math.pow(2, shift);
    if ((byte & 0x80) === 0) return [value, pos];
    shift += 7;
    if (shift > 63) throw new Error("invalid varint");
  }
  throw new Error("unexpected end of varint");
};

const decodeAt = (buf, offset) => {
  const result = {};
  let pos = offset;
  while (pos < buf.length) {
    let header;
    try {
      header = readVarint(buf, pos);
    } catch {
      return null;
    }
    const key = header[0];
    pos = header[1];
    const field = key >> 3;
    const wire = key & 7;
    if (field === 0) return null;
    try {
      if (wire === 0) {
        const value = readVarint(buf, pos);
        pos = value[1];
        (result[field] ||= []).push(value[0]);
      } else if (wire === 2) {
        const len = readVarint(buf, pos);
        pos = len[1];
        if (pos + len[0] > buf.length) return null;
        (result[field] ||= []).push(buf.subarray(pos, pos + len[0]));
        pos += len[0];
      } else if (wire === 5) {
        if (pos + 4 > buf.length) return null;
        (result[field] ||= []).push(buf.subarray(pos, pos + 4));
        pos += 4;
      } else if (wire === 1) {
        if (pos + 8 > buf.length) return null;
        (result[field] ||= []).push(buf.subarray(pos, pos + 8));
        pos += 8;
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }
  return result;
};

const decode = (buf) => {
  const direct = decodeAt(buf, 0);
  if (direct) return direct;
  for (let offset = 1; offset <= 128 && offset < buf.length; offset++) {
    const candidate = decodeAt(buf, offset);
    if (candidate && Object.keys(candidate).length > 0) return candidate;
  }
  return {};
};

const decodeWithOffset = (buf, predicate, limit = 160) => {
  const max = Math.min(limit, buf.length - 1);
  for (let offset = 0; offset <= max; offset++) {
    const candidate = decodeAt(buf, offset);
    if (candidate && predicate(candidate)) return { fields: candidate, offset };
  }
  return null;
};

const firstNumber = (fields, field) => {
  const values = fields[field];
  if (!values || values.length === 0) return undefined;
  return values[0];
};

const firstText = (fields, field) => {
  const values = fields[field];
  if (!values || values.length === 0) return undefined;
  return Buffer.isBuffer(values[0]) ? values[0].toString("utf8") : undefined;
};

const encrypt = (buf) => {
  const cipher = crypto.createCipheriv("aes-128-cbc", AES_KEY, AES_IV);
  return Buffer.concat([cipher.update(buf), cipher.final()]);
};

const request = (url, options = {}) =>
  new Promise((resolve, reject) => {
    const target = new URL(url);
    const method = options.method || "GET";
    const body = options.body || Buffer.alloc(0);
    const headers = { ...options.headers };
    if (options.body) headers["Content-Length"] = body.length;
    const req = https.request(
      {
        hostname: target.hostname,
        port: target.port || 443,
        path: target.pathname + target.search,
        method,
        headers,
        rejectUnauthorized: options.rejectUnauthorized !== false
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks)
          });
        });
      }
    );
    req.on("error", reject);
    if (body.length) req.write(body);
    req.end();
  });

const trim = (value) => String(value || "").trim();

const makePassword = () => {
  const charset = "0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()";
  let raw = "";
  for (let i = 0; i < 64; i++) raw += charset[crypto.randomInt(charset.length)];
  return crypto.createHash("sha256").update(raw).digest("hex").toUpperCase();
};

const grantToken = async (uid, password) => {
  const body = new URLSearchParams({
    uid: String(uid),
    password,
    response_type: "token",
    client_type: "2",
    client_secret: API_KEY,
    client_id: CLIENT_ID
  }).toString();
  let lastError;
  for (const endpoint of GARENA_TOKEN_HOSTS) {
    try {
      const res = await request(endpoint, {
        method: "POST",
        body: Buffer.from(body),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "GarenaMSDK/4.0.19P9(A063 ;Android 13;en;IN;)"
        }
      });
      if (res.status !== 200) {
        lastError = new Error(`token grant failed: HTTP ${res.status}`);
        continue;
      }
      const json = JSON.parse(res.body.toString("utf8"));
      if (!json.access_token || !json.open_id) {
        lastError = new Error("token grant failed: missing access_token or open_id");
        continue;
      }
      return {
        uid: Number(json.uid || uid),
        openId: json.open_id,
        accessToken: json.access_token,
        tokenType: json.token_type || "Bearer",
        expiresAt: json.expiry_time || null,
        refreshExpiresAt: json.refresh_expiry_time || null
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("token grant failed");
};

const registerGuest = async () => {
  const password = makePassword();
  const payload = JSON.stringify({
    app_id: Number(CLIENT_ID),
    client_type: 2,
    password,
    source: 2
  });
  const signature = crypto.createHmac("sha256", API_KEY).update(payload).digest("hex");
  let lastError;
  try {
    const res = await request(GUEST_REGISTER_JSON, {
      method: "POST",
      body: Buffer.from(payload),
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
        "User-Agent": "GarenaMSDK/4.0.19P9(A063 ;Android 13;en;IN;)",
        Authorization: `Signature ${signature}`
      }
    });
    const json = JSON.parse(res.body.toString("utf8"));
    if (res.status === 200 && json.data && json.data.uid) {
      return { uid: Number(json.data.uid), password, passwordHash: password };
    }
    lastError = new Error(
      `guest register failed: HTTP ${res.status} ${json.msg || json.message || ""}`.trim()
    );
  } catch (error) {
    lastError = error;
  }
  const form = new URLSearchParams({
    password,
    client_type: "2",
    source: "2",
    app_id: CLIENT_ID
  }).toString();
  const formSignature = crypto.createHmac("sha256", API_KEY).update(form).digest("hex");
  const res = await request(GUEST_REGISTER_FORM, {
    method: "POST",
    body: Buffer.from(form),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "GarenaMSDK/4.0.19P9(A063 ;Android 13;en;IN;)",
      Authorization: `Signature ${formSignature}`
    }
  });
  const json = JSON.parse(res.body.toString("utf8"));
  const uid = json.uid || (json.data && json.data.uid);
  if (res.status === 200 && uid) {
    return { uid: Number(uid), password, passwordHash: password };
  }
  throw lastError || new Error(`guest register failed: HTTP ${res.status}`);
};

const createGuest = async () => {
  const guest = await registerGuest();
  const token = await grantToken(guest.uid, guest.password);
  return { ...guest, ...token };
};

const xorOpenId = (openId) => {
  const stream = [
    0x30, 0x30, 0x30, 0x32, 0x30, 0x31, 0x37, 0x30, 0x30, 0x30, 0x30, 0x30,
    0x32, 0x30, 0x31, 0x37, 0x30, 0x30, 0x30, 0x30, 0x30, 0x32, 0x30, 0x31,
    0x37, 0x30, 0x30, 0x30, 0x30, 0x30, 0x32, 0x30
  ];
  const source = Buffer.from(openId, "utf8");
  const out = Buffer.alloc(source.length);
  for (let i = 0; i < source.length; i++) {
    out[i] = source[i] ^ stream[i % stream.length];
  }
  return out;
};

const majorLogin = async (token, options = {}) => {
  const releaseVersion = options.releaseVersion || RELEASE_VERSION;
  const loginUrl = options.loginUrl || DEFAULT_LOGIN;
  const payload = encode([
    [22, token.openId],
    [23, "4"],
    [29, token.accessToken],
    [77, "4"],
    [99, "4"]
  ]);
  const body = encrypt(payload);
  const res = await request(loginUrl, {
    method: "POST",
    body,
    headers: {
      "User-Agent": UNITY_UA,
      "X-GA": "v1 1",
      "X-GA-SV": "1",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Bearer",
      "X-Unity-Version": "2018.4.11f1",
      ReleaseVersion: releaseVersion
    }
  });
  const text = res.body.toString("utf8");
  if (res.status !== 200) {
    throw new Error(
      `major login failed: HTTP ${res.status} ${text.trim().slice(0, 120)}`.trim()
    );
  }
  const isJwt = (value) =>
    Boolean(value) && value.length > 40 && value.toString("utf8", 0, 3) === "eyJ";
  const found = decodeWithOffset(
    res.body,
    (fields) => typeof firstNumber(fields, 1) === "number" && isJwt(fields[8]?.[0]),
    1024
  );
  if (!found) {
    const note = res.body.toString("latin1").match(/[\x20-\x7e]{6,}/g);
    throw new Error(
      `major login failed: unexpected response${note ? ` (${note.join(" ").slice(0, 120)})` : ""}`
    );
  }
  const fields = found.fields;
  const accountId = firstNumber(fields, 1);
  const jwt = firstText(fields, 8);
  const serverUrl = firstText(fields, 10) || options.serverUrl || null;
  return {
    uid: token.uid,
    openId: token.openId,
    accessToken: token.accessToken,
    accountId,
    token: jwt,
    serverUrl,
    lockRegion: firstText(fields, 2),
    notiRegion: firstText(fields, 3),
    ipRegion: firstText(fields, 4),
    ttl: firstNumber(fields, 9)
  };
};

const login = async (uid, password, options = {}) => {
  if (!uid || !password) throw new Error("uid and password are required");
  const token = await grantToken(trim(uid), trim(password));
  return majorLogin(token, options);
};

const resolveDeviceIp = async (options = {}) => {
  if (options.ip) return options.ip;
  try {
    const res = await request("https://api.ipify.org?format=json", {
      method: "GET",
      headers: { "User-Agent": UNITY_UA }
    });
    return JSON.parse(res.body.toString("utf8")).ip || "";
  } catch {
    return "";
  }
};

const buildRegisterPayload = (token, name, regionCode, ip) => {
  const template = decode(Buffer.from(OB55_DEVICE_BLOB, "hex"));
  const fields = {};
  for (const [key, values] of Object.entries(template)) fields[key] = [...values];
  fields[1] = [name];
  fields[2] = [token.accessToken];
  fields[3] = [token.openId];
  fields[5] = [102000007];
  fields[6] = [4];
  fields[7] = [1];
  fields[13] = [1];
  fields[14] = [xorOpenId(token.openId)];
  fields[15] = [regionCode];
  fields[16] = [1];
  fields[19] = [`Google|${crypto.randomUUID()}`];
  fields[20] = [ip || ""];
  fields[22] = [token.openId];
  fields[23] = ["4"];
  fields[29] = [token.accessToken];
  fields[99] = ["4"];
  const entries = [];
  for (const key of Object.keys(fields)
    .map(Number)
    .sort((a, b) => a - b)) {
    for (const value of fields[key]) entries.push([key, value]);
  }
  return encode(entries);
};

const registerGame = async (guest, nickname, region = "IND", options = {}) => {
  const token = guest.accessToken
    ? guest
    : await grantToken(guest.uid, guest.password);
  const regionCode = String(region || "IND").toUpperCase();
  const host = options.host || REGISTER_HOST;
  const name = String(nickname || "").trim();
  if (name.length < 4 || name.length > 12) {
    throw new Error("nickname must be between 4 and 12 characters");
  }
  const ip = await resolveDeviceIp(options);
  const payload = buildRegisterPayload(token, name, regionCode, ip);
  const res = await request(`${host.replace(/\/+$/, "")}/MajorRegister`, {
    method: "POST",
    body: encrypt(payload),
    headers: {
      "User-Agent":
        "UnityPlayer/2018.4.12f1 (UnityWebRequest/1.0, libcurl/8.5.0-DEV)",
      Accept: "*/*",
      Authorization: `Bearer ${token.accessToken}`,
      Connection: "Keep-Alive",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-GA": "v1 1",
      "X-GA-SV": String(Math.floor(Date.now() / 1000)),
      "X-Unity-Version": "2018.4.11f1",
      ReleaseVersion: options.releaseVersion || RELEASE_VERSION
    }
  });
  const text = res.body
    .toString("latin1")
    .replace(/[^\x20-\x7e]/g, "")
    .trim();
  return {
    success: res.status === 200,
    status: res.status,
    message: res.status === 200 ? "" : text,
    nickname: name,
    region: regionCode,
    ip
  };
};

const createGuestAccount = async (options = {}) => {
  const regionCode = String(options.region || "IND").toUpperCase();
  const guest = await createGuest();
  const nickname =
    trim(options.nickname) ||
    `Player${Math.floor(Math.random() * 900000 + 100000)}`;
  const registration = await registerGame(guest, nickname, regionCode, options).catch(
    (err) => ({
      success: false,
      status: 0,
      message: err.message,
      nickname,
      region: regionCode
    })
  );
  const gameSession = registration.success
    ? await login(guest.uid, guest.password, options).catch(() => null)
    : null;
  const clusterHost =
    CLUSTERS.find((item) => item.cluster === regionCode)?.host ||
    CLUSTERS[0].host;

  return {
    uid: guest.uid,
    password: guest.password,
    passwordHash: guest.passwordHash,
    nickname: registration.nickname,
    region: registration.region,
    registered: registration.success,
    accountId: gameSession?.accountId || null,
    serverUrl: gameSession?.serverUrl || (registration.success ? clusterHost : null)
  };
};

module.exports = function (app) {
  app.get("/api/ff/create-guest", async (req, res) => {
    const { region, nickname } = req.query;
    try {
      const created = await createGuestAccount({ region, nickname });
      return res.json({
        status: true,
        creator: "Vanzz Ryuichi",
        result: created
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
