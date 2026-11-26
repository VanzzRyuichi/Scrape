/**
Nama : Roblox Assets Detail
Base: roblox.com
Creator: Vann Ryuichi
Method: Get
Source: https://whatsapp.com/channel/0029VbEP4oP545v13dU72P35
*/

const express = require("express");
const axios = require("axios");

function extractId(raw) {
  if (!raw) return null;
  raw = String(raw).trim();
  const m = raw.match(/asset\/(\d+)/i) || raw.match(/catalog\/(\d+)/i);
  if (m) return m[1];
  const digits = raw.match(/\d+/);
  return digits ? digits[0] : null;
}

async function fetchAssetDetails(id) {
  const url = `https://economy.roblox.com/v2/assets/${id}/details`;
  const response = await axios.get(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
  });
  return response.data;
}

module.exports = function (app) {
  app.use(express.json());

  app.get("/vsunseeV8/roblox/assetid/check", async (req, res) => {
    try {
      const { id: rawInput, input } = req.query;
      const targetInput = rawInput || input;

      if (!targetInput) {
        return res.status(400).json({
          status: false,
          creator: "Vanzz Ryuichi",
          error: "Parameter 'id' atau 'input' wajib diisi"
        });
      }

      const assetId = extractId(targetInput);

      if (!assetId) {
        return res.status(400).json({
          status: false,
          creator: "Vanzz Ryuichi",
          error: "ID Aset tidak valid atau tidak ditemukan pada input"
        });
      }

      const data = await fetchAssetDetails(assetId);

      if (!data) {
        return res.status(404).json({
          status: false,
          creator: "Vanzz Ryuichi",
          error: "Aset tidak ditemukan di server Roblox"
        });
      }

      const creatorId = data.Creator?.TargetId || data.Creator?.Id;
      const creatorType = data.Creator?.Type || "User";
      let creatorProfileUrl = "";

      if (creatorId) {
        creatorProfileUrl = creatorType === "Group"
          ? `https://www.roblox.com/communities/${creatorId}`
          : `https://www.roblox.com/users/${creatorId}/profile`;
      }

      return res.json({
        status: true,
        creator: "Vanzz Ryuichi",
        result: {
          assetId: data.AssetId || parseInt(assetId, 10),
          name: data.Name || "Unknown Name",
          assetTypeId: data.AssetTypeId || 0,
          priceInRobux: data.PriceInRobux ?? null,
          isForSale: data.IsForSale ?? false,
          created: data.Created || "",
          updated: data.Updated || "",
          creator: {
            id: creatorId || null,
            name: data.Creator?.Name || "Unknown",
            type: creatorType,
            profileUrl: creatorProfileUrl
          }
        }
      });

    } catch (error) {
      return res.status(500).json({
        status: false,
        creator: "Vanzz Ryuichi",
        error: error.response?.data?.errors?.[0]?.message || error.message
      });
    }
  });
};
