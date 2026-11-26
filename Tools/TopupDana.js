/**
 * Title: Topup Dana Scrape
 * Base: https://topup.shinkyreal.my.id
 * Creator: Vanzz Ryuichi
 * Saluran: https://whatsapp.com/channel/0029VbEP4oP545v13dU72P35
 * Reshare Credit Jgn Hapus Mas😹
 * Note: Error Fix Sndri😹
 */
 
 const QRCode = require("qrcode");

const BASE_API = "https://topup.shinkyreal.my.id";
const DEFAULT_TOKO = "surabaya";

function normalizePhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("620")) return "62" + digits.slice(3);
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json, text/plain, */*",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch (_) {
    throw new Error(`Respon server bukan JSON (HTTP ${res.status})`);
  }

  if (!res.ok) {
    throw new Error(json.msg || json.message || `HTTP ${res.status}`);
  }

  return json;
}

async function findDanaSku(skuInput, nominalInput, tokoSlug = DEFAULT_TOKO) {
  if (skuInput && String(skuInput).trim()) {
    return { sku_code: String(skuInput).trim(), item: null };
  }

  const tokoData = await fetchJson(`${BASE_API}/api/toko/publik?slug=${encodeURIComponent(tokoSlug)}`);
  const allItems = Array.isArray(tokoData.items) ? tokoData.items : [];
  const danaItems = allItems
    .filter((it) => String(it.g || "").toLowerCase() === "dana")
    .sort((a, b) => Number(a.harga || 0) - Number(b.harga || 0));

  if (!danaItems.length) {
    throw new Error("Produk DANA tidak ditemukan di toko");
  }

  if (nominalInput) {
    const targetNominal = Number(String(nominalInput).replace(/\D/g, ""));
    const matched = danaItems.find((it) => {
      const nameDigits = Number(String(it.n || "").replace(/\D/g, ""));
      return nameDigits === targetNominal || Number(it.harga) === targetNominal;
    });
    if (matched) return { sku_code: matched.k, item: matched };
  }

  return { sku_code: danaItems[0].k, item: danaItems[0] };
}

async function buildQrPayload(qrString) {
  if (!qrString) return null;
  const dataUrl = await QRCode.toDataURL(String(qrString), {
    width: 600,
    margin: 2
  });
  const base64Clean = dataUrl.replace(/^data:image\/png;base64,/, "");
  return {
    qr_string: String(qrString),
    qr_image_base64: dataUrl,
    qr_buffer: Buffer.from(base64Clean, "base64")
  };
}

async function createDanaTopup({ target, buyer, sku, nominal, toko, promo, email }) {
  const targetId = String(target || "").replace(/\D/g, "").trim();
  const waNorm = normalizePhone(buyer);
  const tokoSlug = String(toko || DEFAULT_TOKO).trim();

  if (!targetId) {
    throw new Error("Parameter 'target' (nomor DANA) wajib diisi");
  }
  if (!/^628\d{7,12}$/.test(waNorm)) {
    throw new Error("Parameter 'buyer' (nomor pembeli) belum valid");
  }

  const { sku_code, item } = await findDanaSku(sku, nominal, tokoSlug);
  const payload = {
    sku_code,
    target_id: targetId,
    target_server: "",
    wa: waNorm,
    metode: "qris",
    toko: tokoSlug,
    qty: 1
  };
  if (promo) payload.kode_promo = String(promo).trim();
  if (email) payload.email = String(email).trim();

  const created = await fetchJson(`${BASE_API}/api/buat-order`, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  if (!created || !created.result || !created.order_code) {
    throw new Error((created && created.msg) || "Gagal membuat transaksi top up DANA");
  }

  const detail = await fetchJson(`${BASE_API}/api/cek?code=${encodeURIComponent(created.order_code)}`);
  const d = detail.data || {};
  const qr = await buildQrPayload(d.qr_string || created.qr_string || "");

  return {
    order_code: d.order_code || created.order_code,
    status: d.status || "Menunggu Bayar",
    target: targetId,
    buyer: "+" + waNorm,
    product_name: d.product_name || (item && item.n) || sku_code,
    total: d.total ?? (item && item.harga) ?? 0,
    sisa_detik: d.sisa ?? null,
    qr_string: qr ? qr.qr_string : null,
    qr_image_base64: qr ? qr.qr_image_base64 : null
  };
}

async function checkOrderStatus(code) {
  const cleanCode = String(code || "").trim().toUpperCase();
  if (!cleanCode) {
    throw new Error("Parameter 'code' (nomor invoice) wajib diisi");
  }

  const detail = await fetchJson(`${BASE_API}/api/cek?code=${encodeURIComponent(cleanCode)}`);
  if (!detail || !detail.result || !detail.data) {
    throw new Error((detail && detail.msg) || "Invoice tidak ditemukan");
  }

  const d = detail.data;
  const qr = await buildQrPayload(d.qr_string || "");

  return {
    order_code: d.order_code || cleanCode,
    status: d.status,
    product_name: d.product_name,
    target_id: d.target_id,
    total: d.total,
    sisa_detik: d.sisa ?? null,
    qr_string: qr ? qr.qr_string : null,
    qr_image_base64: qr ? qr.qr_image_base64 : null,
    _qrBuffer: qr ? qr.qr_buffer : null
  };
}

async function cancelOrderStatus(code, target) {
  const cleanCode = String(code || "").trim().toUpperCase();
  if (!cleanCode) {
    throw new Error("Parameter 'code' (nomor invoice) wajib diisi");
  }

  let targetId = String(target || "").replace(/\D/g, "").trim();
  if (!targetId) {
    const check = await fetchJson(`${BASE_API}/api/cek?code=${encodeURIComponent(cleanCode)}`);
    targetId = String((check && check.data && check.data.target_id) || "").trim();
  }

  const cancelled = await fetchJson(`${BASE_API}/api/batal`, {
    method: "POST",
    body: JSON.stringify({
      order_code: cleanCode,
      target_id: targetId
    })
  });

  if (!cancelled || !cancelled.result) {
    throw new Error((cancelled && cancelled.msg) || "Pesanan belum bisa dibatalkan");
  }

  return cancelled;
}

module.exports = function (app) {
  app.get("/api/dana/topup", async (req, res) => {
    const {
      action,
      target,
      ewallet,
      no_hp,
      buyer,
      wa,
      code,
      invoice,
      sku,
      nominal,
      toko,
      promo,
      email,
      format
    } = req.query;
    const selectedAction = String(action || "create").trim().toLowerCase();

    try {
      if (selectedAction === "status" || selectedAction === "cek") {
        const result = await checkOrderStatus(code || invoice);
        const { _qrBuffer, ...cleanResult } = result;
        return res.json({
          status: true,
          creator: "Vanzz Ryuichi",
          action: "status",
          result: cleanResult
        });
      }

      if (selectedAction === "cancel" || selectedAction === "batal") {
        const result = await cancelOrderStatus(code || invoice, target || ewallet || no_hp);
        return res.json({
          status: true,
          creator: "Vanzz Ryuichi",
          action: "cancel",
          result
        });
      }

      if (selectedAction === "qris" || selectedAction === "qr") {
        const info = await checkOrderStatus(code || invoice);
        if (!info.qr_string || !info._qrBuffer) {
          return res.status(404).json({
            status: false,
            creator: "Vanzz Ryuichi",
            error: "QR QRIS tidak tersedia untuk status pesanan ini"
          });
        }
        if (String(format || "").toLowerCase() === "image" || String(format || "").toLowerCase() === "png") {
          return res.type("image/png").send(info._qrBuffer);
        }
        return res.json({
          status: true,
          creator: "Vanzz Ryuichi",
          action: "qris",
          result: {
            order_code: info.order_code,
            status: info.status,
            total: info.total,
            qr_string: info.qr_string,
            qr_image_base64: info.qr_image_base64
          }
        });
      }

      const result = await createDanaTopup({
        target: target || ewallet || no_hp,
        buyer: buyer || wa,
        sku,
        nominal,
        toko,
        promo,
        email
      });

      return res.json({
        status: true,
        creator: "Vanzz Ryuichi",
        action: "create",
        result
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
