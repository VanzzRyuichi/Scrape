/**
 * Title: Stalk Mobile Legend Lengkap Jir
 * Creator: https://gist.github.com/ayashiiiyo
 * Saluran: https://whatsapp.com/channel/0029VbEP4oP545v13dU72P35
 * Note: Error Fix Sndri😹
 */

const net = require("net");
const zlib = require("zlib");

const RANK_GROUPS = [
  { name: "Warrior", start: 1, end: 10, divisions: 3 },
  { name: "Elite", start: 11, end: 25, divisions: 3 },
  { name: "Master", start: 26, end: 45, divisions: 4 },
  { name: "Grandmaster", start: 46, end: 75, divisions: 5 },
  { name: "Epic", start: 76, end: 105, divisions: 5 },
  { name: "Legend", start: 106, end: 135, divisions: 5 },
  { name: "Mythic", start: 136, end: 160, divisions: 0 },
  { name: "Mythical Honor", start: 161, end: 185, divisions: 0 },
  { name: "Mythical Glory", start: 186, end: 235, divisions: 0 },
  { name: "Glorious Mythic", start: 236, end: 9999, divisions: 0 }
];

const DIVISIONS = {
  3: ["III", "II", "I"],
  4: ["IV", "III", "II", "I"],
  5: ["V", "IV", "III", "II", "I"]
};

const rankOf = (value) => {
  const level = Number(value);
  if (!Number.isFinite(level) || level <= 0) return null;
  const group = RANK_GROUPS.find(
    (item) => level >= item.start && level <= item.end
  );
  if (!group) {
    return { level, name: "Unranked", division: null, fullName: "Unranked" };
  }
  if (!group.divisions) {
    return {
      level,
      name: group.name,
      division: null,
      fullName: group.name
    };
  }
  const span = (group.end - group.start + 1) / group.divisions;
  const index = Math.min(
    group.divisions - 1,
    Math.floor((level - group.start) / span)
  );
  const division = DIVISIONS[group.divisions][index];
  return {
    level,
    name: group.name,
    division,
    fullName: `${group.name} ${division}`
  };
};

class MlbbError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "MlbbError";
    this.code = details.code;
    this.status = details.status;
  }
}

const asNumber = (value, label) => {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new MlbbError(`${label} harus berupa angka bulat positif`);
  }
  return number;
};

const parseTarget = (value, zoneId) => {
  if (value && typeof value === "object") {
    return {
      roleId: asNumber(value.roleId, "userid"),
      zoneId: asNumber(value.zoneId, "zoneid")
    };
  }
  if (zoneId !== undefined && zoneId !== null && String(zoneId).trim() !== "") {
    return {
      roleId: asNumber(value, "userid"),
      zoneId: asNumber(zoneId, "zoneid")
    };
  }
  const text = String(value ?? "").trim();
  const match = text.match(
    /^(\d{3,})\s*(?:[\(\[]\s*(\d{2,})\s*[\)\]]|[,/|:\-\s]\s*(\d{2,}))$/
  );
  if (!match) {
    throw new MlbbError(
      'Parameter userid dan zoneid wajib diisi (atau format "12345678 (1234)")'
    );
  }
  return {
    roleId: asNumber(match[1], "userid"),
    zoneId: asNumber(match[2] ?? match[3], "zoneid")
  };
};

const GAME_AUTH_HOST = "login.ml.youngjoygame.com";
const GAME_AUTH_PORT = 30021;
const GAME_OP_AUTH_SC = 0x70000201;
const GAME_OP_UPGRADE = 0x70000501;
const GAME_OP_UPGRADE_SC = 0x70000601;
const GAME_OP_CONNECT = 0x7000914e;
const GAME_OP_CONNECT_SC = 0x7000924e;
const GAME_OP_ROLE = 0x7000f54e;
const GAME_OP_ROLE_SC = 0x7000f64e;
const GAME_OP_PROFILE = 0x70009f4f;
const GAME_OP_PROFILE_SC = 0x7000a04f;
const GAME_OP_STATS = 0x7000d694;
const GAME_OP_STATS_SC = 0x7000d794;
const GAME_OP_HISTORY = 0x7000d895;
const GAME_OP_HISTORY_SC = 0x7000d995;

const GAME_TEMPLATES = {
  loginInner:
    "cAABAQFFrwhwQFhhbmRfY2Q5ZTQ1OWVhNzA4YTk0OGQ1YzJmNWE2Y2E4ODM4Y2ZhODM0NTZhZWI3ZTg5OTIyMTQ2ZDU1YWQtZTVkMi00MDYyLTgwZmYtOTAwMTEwZmI0YzQ1QXtncHNfYWRpZD0xNDZkNTVhZC1lNWQyLTQwNjItODBmZi05MDAxMTBmYjRjNDUmYW5kcm9pZF9pZD1hODM0NTZhZWI3ZTg5OTIyJmRldmljZV91bmlxdWVfaWQ9Y2Q5ZTQ1OWVhNzA4YTk0OGQ1YzJmNWE2Y2E4ODM4Y2ZCDTIuMi4xNi4xMjMyLjFDB2FuZF91c2FEAmVuBQJJAlVTTREyMDE5LTIuMDEuMDA1Ni4wOE6IAWdwc19hZGlkPTE0NmQ1NWFkLWU1ZDItNDA2Mi04MGZmLTkwMDExMGZiNGM0NSZhbmRyb2lkX2lkPWE4MzQ1NmFlYjdlODk5MjImaWRmYT0maWRmdj0mb3NfdmVyc2lvbj0xMyZkZXZpY2VfbmFtZT0yMTA4MTExMVJHJmlzc2ltdWxhdG9yPTBvDwFABGlkZmFAJDE0NmQ1NWFkLWU1ZDItNDA2Mi04MGZmLTkwMDExMGZiNGM0NX8QEAFBPWJ1aWxkX2JyYW5kPVJlZG1pJmJ1aWxkX2RldmljZT1tZXJsaW54JmxvZ2luc3ZpcD0mY291bnRyaWVzPTSAfxNAB2FuZHJvaWRDJDE0NmQ1NWFkLWU1ZDItNDA2Mi04MGZmLTkwMDExMGZiNGM0NUQQYTgzNDU2YWViN2U4OTkyMkUkNjA1N2QxMmYtNTM4NC0xMmEyLTNmN2YtMWU1ZmQzMTA2YWQ1RiA3OTdjNTIzM2I5MTg4NTUwNmE4M2YwMzUwM2Y4YTE5OYBPFFhhbmRfY2Q5ZTQ1OWVhNzA4YTk0OGQ1YzJmNWE2Y2E4ODM4Y2ZhODM0NTZhZWI3ZTg5OTIyMTQ2ZDU1YWQtZTVkMi00MDYyLTgwZmYtOTAwMTEwZmI0YzQ1TxUgY2Q5ZTQ1OWVhNzA4YTk0OGQ1YzJmNWE2Y2E4ODM4Y2ZPFgxhb3NwX21lcmxpbnhPFwJlbg8YZQ8ZAU8afGNIQUJBVU1CTUVRQk1JQkJKUWkyVlVvNzVMMHY4bllFYnJTeTJudWhET0RvZ0RmcG9YZ2xRRG5xNGVMUUFmZ3d4UVJDS0dJMlkyUTBZbU5sT0daaU5UTm1ZV1psT0RjMU1HUmtORGRsWTJNNE9ESmlNbUV4Wm1NeE56ZUFPGyA3Yjc2ODllOWIzZDhmMDM5ZTUwMzQ1YjZkMGVhN2NiYQ8ctgEPHQVPJCQyZWE5YWVmMi0zZGRlLTRlNWMtYTY5MS0wOTM3ZDVhY2RmY2JPJQMxODIPJlpPKiBlZTliZjhhNDE2YWYzMjJhMTJkZDlmZjllNTAzNjc0NQ8sAoCA",
  checkUpgrade:
    "cADRoq6eAUFES1o5eU5mbCtlazZkNC9FemdtdExldU11eVNyUHJ0OW5XeSt5K1kwRkQzKzNrQis4VnVmUGwrbTlrcE9HSkYxN0FnPT1CDTIuMi4xNi4xMjMyLjEFgkhGB2FuZF91c2FKDjE1OC4xNDAuMTcwLjgxC9Oo/N8FDAFNAlVTDw9ZDxECTxICSURfExRAKTQ0X3Jlc291cmNlbWFuYWdlP3siZ3JvdXBfdGFnIjoiY29udHJvbCJ9QCk0MjJfY3BsdXNkb3dubG9hZD97Imdyb3VwX3RhZyI6ImNvbnRyb2wifUAhNzBfcHJvZF9tbGJicmVjX29ic2VydmVfMjAyNjAzMjU/QC03MF9wcm9kX21sYmJyZWNfYnV5X2ZpbHRlcl9zdHJhdGVneV8yMDI2MDMyNj9AMTcwX3Byb2RfbWxiYnJlY19taW5pYnV5X2ZpbHRlcl9zdHJhdGVneV8yMDI2MDMyNj9AFDYwX1NlYXNvbkhlcm9Qb29sXzI/QBNkaXNwYXRjaGVyXzg4Ml9vbGQ/QB44OF9lbnRlcl9iYXR0bGVfY29yeV8yP2NvbnRyb2xAGjg4Ml9haV9yZWNvbW1hbmRhdGlvbl9wcm8/QBc4OF9lbnRlcl9iYXR0bGVfY29yeV80P0ANMTZfbW9sYV9vbGQxP0AcMTZfcHNzX3ZlcnNpb24xX2hvdXlhbmd5YW5nP0ArMTZfYWlfcmVjb21tYW5kYXRpb25fb25seW0yX29sZHBsYXllcj90ZXN0MUASMTZfU2Vhc29uSGVyb1Bvb2w/QBwxNl9Mb3dSZXNPcmRlcl9uZXcwOTI4P3Rlc3QyQAwxNl9yZWRkb3RzMT9AFTE2X2VudGVyX2JhdHRsZV9jb3J5P0AVMTZfTG9naW5UaW1lT3B0aW1pemU/QBcxNl9Mb3dSZXNPcmRlcl9uZXcxMDIwP0AXMTZfTG93UmVzT3JkZXJfbmV3MTExMj9PFCBkZGUzN2ViNzQxNzg0YmEyYmVmYjY5NGY4YjE2NDhkNw8VtgEPFloPFwIPGAGAgA==",
  netConnect:
    "cADRoq6eAUFEQi80MnVFakcrMUI0YnFFRjhiQnovRzVKNnNTODE0YzNpR2wwSHdFRWxpTWZaOUc1Mno5ZGhqUTdLT0NUR3ZpaEFnPT0CgkhEDTIuMi4xNi4xMjM1LjEGAkcOMTU4LjE0MC4xNzAuODFICTIxMTgxMjMyMkkCSURKEGUwNzQ3NDZkN2E4MjU0NTVLDTIuMi4yMy4xMjM1LjFNB2FuZF91c2FOF1hpYW9taSAyMTA4MTExMVJHLUFSTTY0Tw9YYW5kX2NkOWU0NTllYTcwOGE5NDhkNWMyZjVhNmNhODgzOGNmYTgzNDU2YWViN2U4OTkyMjE0NmQ1NWFkLWU1ZDItNDA2Mi04MGZmLTkwMDExMGZiNGM0NU8RDTIuMi4xNi4xMjMyLjFPEgBPExBhODM0NTZhZWI3ZTg5OTIyfxRAB2FuZHJvaWRBAEIAQyQxNDZkNTVhZC1lNWQyLTQwNjItODBmZi05MDAxMTBmYjRjNDVEEGE4MzQ1NmFlYjdlODk5MjJFJDYwNTdkMTJmLTUzODQtMTJhMi0zZjdmLTFlNWZkMzEwNmFkNUYgNzk3YzUyMzNiOTE4ODU1MDZhODNmMDM1MDNmOGExOTlHAEgAgA8XtwFPGABPGSQyZWE5YWVmMi0zZGRlLTRlNWMtYTY5MS0wOTM3ZDVhY2RmY2JPGgMxODOAgA==",
  roleInit:
    "cABlQQdhbmRfdXNhAgJDF1hpYW9taSAyMTA4MTExMVJHLUFSTTY0RAJlbgWAiXoGnR1HAklESFhhbmRfY2Q5ZTQ1OWVhNzA4YTk0OGQ1YzJmNWE2Y2E4ODM4Y2ZhODM0NTZhZWI3ZTg5OTIyMTQ2ZDU1YWQtZTVkMi00MDYyLTgwZmYtOTAwMTEwZmI0YzQ1SQgxODcyLDg2NEoQYTgzNDU2YWViN2U4OTkyMksATABNJDE0NmQ1NWFkLWU1ZDItNDA2Mi04MGZmLTkwMDExMGZiNGM0NU8PIEFuZHJvaWQgT1MgMTM7VFEzQS4yNTAxMDYuMDAzLlMzTxARMjAxOS0yLjAxLjAwNTYuMDhPERRQVC4gRWthIE1hcyBSZXB1Ymxpa08SAE8TAA8UBA8VAg8WAU8XAE8YBDIwMTl/GUARWGlhb21pIDIxMDgxMTExUkdBEkhhcmR3YXJlCTogTVQ2NzY5WkIITWFsaS1HNTIDnR0EAYBPGlpwNWFRWTdGYzY2VngzNmxEZTlJaG1HTmxsMDdKcmpRWSszRzc0d3lwYkQvQmYzN2RiN2J5ZkR4TGI2Rzl4SW80M0VCeHliRjVRK051Z1pjbUx4SzVkcWJpNTdPGw0yLjIuMTYuMTIzNS4xTxwNMi4yLjIzLjEyMzUuMU8dEGE4MzQ1NmFlYjdlODk5MjJPHiBjZDllNDU5ZWE3MDhhOTQ4ZDVjMmY1YTZjYTg4MzhjZk8fIDc5N2M1MjMzYjkxODg1NTA2YTgzZjAzNTAzZjhhMTk5DyABfyFAB2FuZHJvaWRBAEIAQyQxNDZkNTVhZC1lNWQyLTQwNjItODBmZi05MDAxMTBmYjRjNDVEEGE4MzQ1NmFlYjdlODk5MjJFJDYwNTdkMTJmLTUzODQtMTJhMi0zZjdmLTFlNWZkMzEwNmFkNUYgNzk3YzUyMzNiOTE4ODU1MDZhODNmMDM1MDNmOGExOTlHAEgAgE8iEmNvbS5tb2JpbGUubGVnZW5kc38kgA8lAU8mIDEyNWZjMDZiOGU1YmJhZDE2YzA3ZWQ0NzAzMTczNDVkDyfKstDXBg8otwFPKgBPKyQyZWE5YWVmMi0zZGRlLTRlNWMtYTY5MS0wOTM3ZDVhY2RmY2JPLAMxODNfMQJAE1N5c3RlbV9TdXJwcmlzZUNhcmRAGFN5c3RlbV9NYWluSW50ZXJmYWNlMjAyNA8yAg8z0QVPNCBhYTZhN2UwNzA5MmM3Y2VjMmUwOTcxMjljMjQwNTliY082AA86Ak87AE88AE8+AA8/AYCA",
  battleData: "cADRoq6eAQGCSEwAgIA=",
  history: "cACCSAHRoq6eAYCA"
};

const SDP_INT = 0;
const SDP_NEG = 1;
const SDP_FLOAT = 2;
const SDP_DOUBLE = 3;
const SDP_STRING = 4;
const SDP_LIST = 5;
const SDP_MAP = 6;
const SDP_STRUCT = 7;
const SDP_END = 8;

const readVar = (buffer, position) => {
  let value = 0n;
  let shift = 0n;
  let index = position;
  for (;;) {
    if (index >= buffer.length) throw new MlbbError("truncated varint");
    const byte = buffer[index++];
    value |= BigInt(byte & 0x7f) << shift;
    if (!(byte & 0x80)) break;
    shift += 7n;
    if (shift > 70n) throw new MlbbError("varint too long");
  }
  return { value, next: index };
};

const writeVar = (value) => {
  let rest = BigInt(value);
  const bytes = [];
  do {
    let byte = Number(rest & 0x7fn);
    rest >>= 7n;
    if (rest !== 0n) byte |= 0x80;
    bytes.push(byte);
  } while (rest !== 0n);
  return Buffer.from(bytes);
};

const readSdpHead = (buffer, position) => {
  const byte = buffer[position++];
  const type = byte >> 4;
  let tag = byte & 0x0f;
  if (tag === 15) {
    const extended = readVar(buffer, position);
    tag = Number(extended.value);
    position = extended.next;
  }
  return { type, tag, next: position };
};

const decodeSdpNode = (buffer, position) => {
  const head = readSdpHead(buffer, position);
  const index = head.next;
  if (head.type === SDP_INT) {
    const value = readVar(buffer, index);
    return [{ tag: head.tag, type: SDP_INT, v: value.value }, value.next];
  }
  if (head.type === SDP_NEG) {
    const value = readVar(buffer, index);
    return [{ tag: head.tag, type: SDP_NEG, v: -value.value }, value.next];
  }
  if (head.type === SDP_FLOAT) {
    return [
      { tag: head.tag, type: SDP_FLOAT, v: buffer.readFloatLE(index) },
      index + 4
    ];
  }
  if (head.type === SDP_DOUBLE) {
    return [
      { tag: head.tag, type: SDP_DOUBLE, v: buffer.readDoubleLE(index) },
      index + 8
    ];
  }
  if (head.type === SDP_STRING) {
    const length = readVar(buffer, index);
    const size = Number(length.value);
    return [
      {
        tag: head.tag,
        type: SDP_STRING,
        raw: Buffer.from(buffer.subarray(length.next, length.next + size))
      },
      length.next + size
    ];
  }
  if (head.type === SDP_LIST) {
    const count = readVar(buffer, index);
    const items = [];
    let cursor = count.next;
    for (let i = 0n; i < count.value; i += 1n) {
      const [node, next] = decodeSdpNode(buffer, cursor);
      items.push(node);
      cursor = next;
    }
    return [{ tag: head.tag, type: SDP_LIST, items }, cursor];
  }
  if (head.type === SDP_MAP) {
    const count = readVar(buffer, index);
    const entries = [];
    let cursor = count.next;
    for (let i = 0n; i < count.value; i += 1n) {
      const [key, keyNext] = decodeSdpNode(buffer, cursor);
      const [value, valueNext] = decodeSdpNode(buffer, keyNext);
      entries.push([key, value]);
      cursor = valueNext;
    }
    return [{ tag: head.tag, type: SDP_MAP, entries }, cursor];
  }
  if (head.type === SDP_STRUCT) {
    const fields = [];
    let cursor = index;
    for (;;) {
      if (cursor >= buffer.length) throw new MlbbError("unclosed struct");
      if (buffer[cursor] >> 4 === SDP_END) {
        const closing = readSdpHead(buffer, cursor);
        cursor = closing.next;
        break;
      }
      const [node, next] = decodeSdpNode(buffer, cursor);
      fields.push(node);
      cursor = next;
    }
    return [{ tag: head.tag, type: SDP_STRUCT, fields }, cursor];
  }
  if (head.type === SDP_END) return [{ tag: head.tag, type: SDP_END }, index];
  throw new MlbbError(`unknown SDP type ${head.type}`);
};

const decodeSdp = (buffer) => {
  const nodes = [];
  let cursor = 0;
  while (cursor < buffer.length) {
    const [node, next] = decodeSdpNode(buffer, cursor);
    nodes.push(node);
    cursor = next;
  }
  return nodes;
};

const writeSdpHead = (tag, type) => {
  if (tag < 15) return Buffer.from([(type << 4) | tag]);
  return Buffer.concat([Buffer.from([(type << 4) | 15]), writeVar(tag)]);
};

const encodeSdpNode = (node) => {
  const head = writeSdpHead(node.tag, node.type);
  if (node.type === SDP_INT || node.type === SDP_NEG) {
    return Buffer.concat([
      head,
      writeVar(node.type === SDP_NEG ? -node.v : node.v)
    ]);
  }
  if (node.type === SDP_FLOAT) {
    const body = Buffer.alloc(4);
    body.writeFloatLE(node.v);
    return Buffer.concat([head, body]);
  }
  if (node.type === SDP_DOUBLE) {
    const body = Buffer.alloc(8);
    body.writeDoubleLE(node.v);
    return Buffer.concat([head, body]);
  }
  if (node.type === SDP_STRING) {
    return Buffer.concat([head, writeVar(node.raw.length), node.raw]);
  }
  if (node.type === SDP_LIST) {
    return Buffer.concat([
      head,
      writeVar(node.items.length),
      ...node.items.map(encodeSdpNode)
    ]);
  }
  if (node.type === SDP_MAP) {
    const pairs = node.entries.flatMap(([key, value]) => [
      encodeSdpNode(key),
      encodeSdpNode(value)
    ]);
    return Buffer.concat([head, writeVar(node.entries.length), ...pairs]);
  }
  if (node.type === SDP_STRUCT) {
    return Buffer.concat([
      head,
      ...node.fields.map(encodeSdpNode),
      writeSdpHead(0, SDP_END)
    ]);
  }
  if (node.type === SDP_END) return head;
  throw new MlbbError(`unknown SDP type ${node.type}`);
};

const encodeSdp = (nodes) => Buffer.concat(nodes.map(encodeSdpNode));

const sdpTag = (nodes, tag) =>
  Array.isArray(nodes) ? nodes.find((node) => node.tag === tag) || null : null;

const sdpInt = (nodes, tag, fallback = 0) => {
  const field = sdpTag(nodes, tag);
  if (!field || (field.type !== SDP_INT && field.type !== SDP_NEG)) return fallback;
  return Number(field.v);
};

const sdpBig = (nodes, tag, fallback = "0") => {
  const field = sdpTag(nodes, tag);
  if (!field || (field.type !== SDP_INT && field.type !== SDP_NEG)) return fallback;
  return String(field.v);
};

const sdpText = (nodes, tag) => {
  const field = sdpTag(nodes, tag);
  if (!field || field.type !== SDP_STRING) return null;
  return field.raw.toString("utf8");
};

const setSdp = (nodes, tag, value) => {
  const field = sdpTag(nodes, tag);
  if (!field) throw new MlbbError(`template field ${tag} is missing`);
  if (typeof value === "string") {
    field.type = SDP_STRING;
    field.raw = Buffer.from(value, "utf8");
    delete field.v;
  } else {
    const big = BigInt(value);
    field.type = big < 0n ? SDP_NEG : SDP_INT;
    field.v = big < 0n ? -big : big;
    delete field.raw;
  }
  delete field.items;
  delete field.entries;
  delete field.fields;
  return nodes;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const zstdCompress = (buf) => {
  if (typeof zlib.zstdCompressSync !== "function") {
    throw new MlbbError("Node 22+ dengan dukungan zstd diperlukan untuk protokol game MLBB");
  }
  return zlib.zstdCompressSync(buf);
};

const zstdDecompress = (buf) => {
  if (typeof zlib.zstdDecompressSync !== "function") {
    throw new MlbbError("Node 22+ dengan dukungan zstd diperlukan untuk protokol game MLBB");
  }
  return zlib.zstdDecompressSync(buf);
};

const authWrap = (inner) => {
  const payload = zstdCompress(inner);
  const head = Buffer.alloc(4);
  head.writeUInt16BE(0x1000, 0);
  head.writeUInt16BE(payload.length + 4, 2);
  return Buffer.concat([head, payload]);
};

const innerFrame = (opcode, seq, body) => {
  const head = Buffer.alloc(6);
  head.writeUInt32BE(opcode >>> 0, 0);
  head[4] = seq & 0xff;
  head[5] = 0x45;
  return Buffer.concat([head, writeVar(body.length - 1), body]);
};

const parseInner = (raw) => {
  const opcode = raw.readUInt32BE(0);
  for (let index = 4; index < Math.min(raw.length - 1, 24); index += 1) {
    if (raw[index] !== 0x45 && raw[index] !== 0x46) continue;
    const declared = readVar(raw, index + 1);
    const end = declared.next + Number(declared.value) + 1;
    if (end <= raw.length) {
      return {
        opcode,
        body: raw.subarray(declared.next, end),
        consumed: end
      };
    }
  }
  throw new MlbbError("cannot parse game auth frame");
};

const readZoneFrame = (buffer) => {
  if (buffer.length < 9) return null;
  const length = buffer.readUInt32BE(0);
  if (length < 9 || length > buffer.length) return null;
  const opcode = buffer.readUInt32BE(4);
  let position = 8;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      position = readVar(buffer, position).next;
    } catch {
      return null;
    }
    if (
      position < length &&
      (buffer[position] === 0x45 || buffer[position] === 0x46)
    ) {
      const declared = readVar(buffer, position + 1);
      if (declared.next + Number(declared.value) + 1 === length) {
        return {
          length,
          opcode,
          body: buffer.subarray(declared.next, length)
        };
      }
    }
  }
  return { length, opcode, body: buffer.subarray(9, length) };
};

const pushInnerFrames = (raw, push) => {
  let rest = raw;
  while (rest.length >= 7) {
    let frame = null;
    try {
      frame = parseInner(rest);
    } catch {
      frame = null;
    }
    if (!frame) {
      const zf = readZoneFrame(rest);
      if (!zf) return;
      push({ opcode: zf.opcode, body: zf.body });
      rest = rest.subarray(zf.length);
      continue;
    }
    push({ opcode: frame.opcode, body: frame.body });
    rest = rest.subarray(frame.consumed);
  }
};

const zoneFrame = (opcode, seq, msgId, body, flag = 0) => {
  const head = Buffer.from([seq & 0xff]);
  const middle = flag
    ? Buffer.concat([Buffer.from([flag & 0xff]), writeVar(msgId)])
    : writeVar(msgId);
  const payload = Buffer.concat([
    head,
    middle,
    Buffer.from([0x45]),
    writeVar(body.length - 1),
    body
  ]);
  const outer = Buffer.alloc(8);
  outer.writeUInt32BE(payload.length + 8, 0);
  outer.writeUInt32BE(opcode >>> 0, 4);
  return Buffer.concat([outer, payload]);
};

class SocketLink {
  constructor(host, port, label, timeout = 12000) {
    this.host = host;
    this.port = port;
    this.label = label;
    this.timeout = timeout;
    this.buffer = Buffer.alloc(0);
    this.frames = [];
    this.waiters = [];
  }

  open() {
    return new Promise((resolve, reject) => {
      this.socket = net.connect({ host: this.host, port: this.port });
      this.socket.setNoDelay(true);
      this.socket.once("connect", resolve);
      this.socket.once("error", reject);
      this.socket.on("data", (chunk) => this.receive(chunk));
      this.socket.on("close", () => {
        while (this.waiters.length) {
          this.waiters
            .shift()
            .reject(new MlbbError(`${this.label} connection closed`));
        }
      });
    });
  }

  receive(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    for (;;) {
      if (this.buffer.length >= 4 && this.buffer.readUInt16BE(0) === 0x1000) {
        const total = this.buffer.readUInt16BE(2);
        if (total < 4 || this.buffer.length < total) return;
        const raw = zstdDecompress(this.buffer.subarray(4, total));
        this.buffer = this.buffer.subarray(total);
        pushInnerFrames(raw, (frame) => this.push(frame));
        continue;
      }
      const plain = readZoneFrame(this.buffer);
      if (!plain) return;
      this.buffer = this.buffer.subarray(plain.length);
      this.push(plain);
    }
  }

  push(frame) {
    const waiter = this.waiters.shift();
    if (waiter) waiter.resolve(frame);
    else this.frames.push(frame);
  }

  read(timeout = this.timeout) {
    if (this.frames.length) return Promise.resolve(this.frames.shift());
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.waiters.findIndex((entry) => entry.resolve === resolve);
        if (index >= 0) this.waiters.splice(index, 1);
        reject(
          new MlbbError(`${this.label} server did not respond`, { status: 408 })
        );
      }, timeout);
      this.waiters.push({
        resolve: (frame) => {
          clearTimeout(timer);
          resolve(frame);
        },
        reject
      });
    });
  }

  async expect(opcode, timeout = this.timeout) {
    const deadline = Date.now() + timeout;
    for (;;) {
      const left = deadline - Date.now();
      if (left <= 0) {
        throw new MlbbError(
          `${this.label} server did not answer opcode 0x${opcode.toString(16)}`,
          { status: 408 }
        );
      }
      const frame = await this.read(left);
      if (frame.opcode === opcode) return frame;
    }
  }

  writeRaw(buffer) {
    this.socket.write(buffer);
  }

  close() {
    if (this.socket) this.socket.destroy();
  }
}

const parseServerAddress = (value) => {
  const text = String(value || "").trim();
  const parts = text.split(":");
  const port = Number(parts[1]);
  return {
    host: parts[0] || text,
    port: Number.isSafeInteger(port) && port > 0 ? port : 30103
  };
};

const fieldsOf = (node) =>
  (node && node.type === SDP_STRUCT && node.fields) || [];

const sdpPlain = (node) => {
  if (!node) return null;
  if (node.type === SDP_INT || node.type === SDP_NEG) return String(node.v);
  if (node.type === SDP_FLOAT || node.type === SDP_DOUBLE) return Number(node.v);
  if (node.type === SDP_STRING) return node.raw.toString("utf8");
  if (node.type === SDP_LIST) return (node.items || []).map(sdpPlain);
  if (node.type === SDP_MAP) {
    return (node.entries || []).map(([key, value]) => [
      sdpPlain(key),
      sdpPlain(value)
    ]);
  }
  if (node.type === SDP_STRUCT) {
    const out = {};
    for (const field of node.fields || []) out[field.tag] = sdpPlain(field);
    return out;
  }
  return null;
};

const sdpTagMap = (nodes) => {
  const out = {};
  for (const node of nodes || []) out[node.tag] = sdpPlain(node);
  return out;
};

const sdpTextList = (node) =>
  ((node && node.items) || []).map((item) =>
    item.type === SDP_STRING ? item.raw.toString("utf8") : String(sdpPlain(item))
  );

const isoFromSeconds = (seconds) => {
  const value = Number(seconds);
  return Number.isFinite(value) && value > 0
    ? new Date(value * 1000).toISOString()
    : null;
};

const COLLECTION_QUALITY = {
  1: "common",
  2: "exceptional",
  3: "deluxe",
  4: "exquisite",
  5: "grand",
  6: "legend"
};

const decodeCollection = (node) => {
  if (!node || node.type !== SDP_STRUCT) return null;
  const fields = node.fields || [];
  const qualities = {};
  for (const [key, value] of (sdpTag(fields, 4) || {}).entries || []) {
    const name = COLLECTION_QUALITY[sdpInt([key], 0)];
    if (name) qualities[name] = sdpInt([value], 0);
  }
  return {
    level: sdpInt(fields, 0),
    points: sdpInt(fields, 1),
    nextLevelPoints: sdpInt(fields, 10),
    qualities,
    maxedQualities: sdpInt(fields, 8),
    season: sdpInt(fields, 9)
  };
};

const decodeAffinity = (node) =>
  ((node && node.items) || []).map((item) => {
    const fields = fieldsOf(item);
    return {
      roleId: sdpBig(fields, 0),
      zoneId: sdpInt(fields, 1),
      name: sdpText(fields, 2),
      level: sdpInt(fields, 3),
      relation: sdpInt(fields, 6) === 1 ? "partner" : "sibling",
      value: sdpInt(fields, 7)
    };
  });

const decodeVisitors = (node) =>
  ((node && node.items) || []).map((item) => {
    const fields = fieldsOf(item);
    return {
      roleId: sdpBig(fields, 0),
      zoneId: sdpInt(fields, 1),
      facePath: sdpText(fields, 2),
      level: sdpInt(fields, 3),
      faceId: sdpInt(fields, 4)
    };
  });

const decodePlayerBase = (fields) => {
  const rankLevel = sdpInt(fields, 6);
  return {
    roleId: sdpInt(fields, 0),
    zoneId: sdpInt(fields, 1),
    name: sdpText(fields, 2),
    level: sdpInt(fields, 3),
    faceId: sdpInt(fields, 4),
    nationality: sdpInt(fields, 5),
    rankLevel,
    rank: rankOf(rankLevel),
    rankPoints: rankLevel,
    highestRankPoints: sdpInt(fields, 148),
    lastLogin: sdpInt(fields, 21),
    lastLoginAt: isoFromSeconds(sdpInt(fields, 21)),
    facePath: sdpText(fields, 14),
    signature: sdpText(fields, 19),
    creditScore: sdpInt(fields, 20),
    gender: sdpInt(fields, 13),
    status: sdpInt(fields, 15),
    certified: sdpInt(fields, 16) === 1,
    nameDisplay: {
      title: sdpText(fields, 17),
      tag: sdpText(fields, 18)
    },
    achievementScore: sdpInt(fields, 8),
    totalMatches: sdpInt(fields, 22),
    battleLikes: sdpInt(fields, 24),
    following: sdpInt(fields, 25),
    followers: sdpInt(fields, 149),
    likes: sdpInt(fields, 77),
    watcherNum: sdpInt(fields, 75),
    heroCount: sdpInt(fields, 9),
    skinCount: sdpInt(fields, 10),
    pvpRank: sdpInt(fields, 11),
    clientVersion: sdpText(fields, 12),
    teamId: sdpBig(fields, 34),
    title: sdpPlain(sdpTag(fields, 40)),
    mcl: {
      weekly: sdpPlain(sdpTag(fields, 28)),
      season: sdpPlain(sdpTag(fields, 29))
    },
    location: sdpTextList(sdpTag(fields, 74)),
    countryCode: sdpText(fields, 136),
    skins: ((sdpTag(fields, 92) || {}).items || []).map((item) =>
      sdpInt(fieldsOf(item), 0)
    ),
    collection: decodeCollection(sdpTag(fields, 118)),
    emblem: sdpPlain(sdpTag(fields, 134)),
    visitors: decodeVisitors(sdpTag(fields, 27)),
    affinity: decodeAffinity(sdpTag(fields, 82)),
    tags: sdpTagMap(fields)
  };
};

const decodeHeroDatas = (nodes) =>
  (nodes || []).map((item) => {
    const fields = fieldsOf(item);
    return {
      heroId: sdpInt(fields, 0),
      matches: sdpInt(fields, 1),
      wins: sdpInt(fields, 2),
      skinId: sdpInt(fields, 3),
      skinSource: sdpInt(fields, 4)
    };
  });

const decodeRecordDetail = (fields) => ({
  camp: sdpInt(fields, 1),
  position: sdpInt(fields, 2),
  heroId: sdpInt(fields, 3),
  equipment: ((sdpTag(fields, 4) || {}).items || []).map((item) =>
    sdpInt(fieldsOf(item), 0)
  ),
  kills: sdpInt(fields, 5),
  deaths: sdpInt(fields, 6),
  assists: sdpInt(fields, 7),
  money: sdpInt(fields, 8),
  maxKillNoDeath: sdpInt(fields, 9),
  monsters: sdpInt(fields, 11),
  heroDamage: sdpInt(fields, 12),
  towerDamage: sdpInt(fields, 13)
});

const decodeBattleRecord = (nodes) =>
  (nodes || []).map((item) => {
    const fields = fieldsOf(item);
    return {
      battleId: sdpBig(fields, 0),
      duration: sdpInt(fields, 1),
      time: sdpInt(fields, 2),
      winCamp: sdpInt(fields, 3),
      pvpType: sdpInt(fields, 4),
      valid: sdpInt(fields, 6) === 1,
      detail: decodeRecordDetail(fieldsOf(sdpTag(fields, 7)))
    };
  });

const decodeStatsByType = (field) => {
  const out = {};
  for (const [key, value] of field.entries || []) {
    const type = String(sdpInt([key], 0));
    out[type] = {
      matches: sdpInt(value.fields || [], 0),
      wins: sdpInt(value.fields || [], 1),
      mvp: sdpInt(value.fields || [], 2),
      avg: {
        kda: sdpInt(value.fields || [], 8) / 100,
        join: sdpInt(value.fields || [], 9) / 100,
        money: sdpInt(value.fields || [], 10),
        damage: sdpInt(value.fields || [], 11),
        taken: sdpInt(value.fields || [], 12),
        tower: sdpInt(value.fields || [], 13)
      },
      heroes: decodeHeroDatas((sdpTag(value.fields || [], 66) || {}).items)
    };
  }
  return out;
};

const decodeGameStats = (body, roleId, zoneId) => {
  const nodes = decodeSdp(body);
  const root = sdpTag(nodes, 0) || { fields: [] };
  const fields = root.fields || [];
  const base = sdpTag(fields, 19);
  const baseFields = base && base.fields ? base.fields : [];
  const total = sdpInt(fields, 0);
  const wins = sdpInt(fields, 1);
  return {
    roleId: sdpInt(fields, 17) || roleId,
    zoneId: sdpInt(fields, 18) || zoneId,
    name: sdpText(baseFields, 2),
    totalMatches: total,
    wins,
    losses: Math.max(0, total - wins),
    winRate: total > 0 ? Number(((wins / total) * 100).toFixed(2)) : 0,
    weekMatches: sdpInt(fields, 2),
    weekScore: sdpInt(fields, 3),
    reputation: sdpInt(fields, 4),
    mvp: sdpInt(fields, 5),
    loseMvp: sdpInt(fields, 23),
    kills: {
      double: sdpInt(fields, 6),
      triple: sdpInt(fields, 7),
      quadra: sdpInt(fields, 8),
      penta: sdpInt(fields, 9),
      overFive: sdpInt(fields, 10)
    },
    avg: {
      kda: sdpInt(fields, 11) / 100,
      join: sdpInt(fields, 12) / 100,
      money: sdpInt(fields, 13),
      damage: sdpInt(fields, 14),
      taken: sdpInt(fields, 15),
      tower: sdpInt(fields, 16)
    },
    seasonMaxRankId: sdpInt(fields, 24),
    displayAchieveId: sdpInt(fields, 20),
    beSupport: sdpInt(fields, 25),
    profile: decodePlayerBase(baseFields),
    heroes: decodeHeroDatas((sdpTag(fields, 30) || {}).items),
    matches: decodeBattleRecord((sdpTag(fields, 31) || {}).items),
    byType: decodeStatsByType(sdpTag(fields, 32) || { entries: [] })
  };
};

class GameSession {
  constructor(link, auth, options = {}) {
    this.link = link;
    this.auth = auth;
    this.timeout = options.timeout || 12000;
    this.msgId = 0;
    this.seq = 0;
  }

  async request(opcode, expect, body, flag = 0, retries = 1) {
    let error = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        this.msgId += 1;
        this.seq = (this.seq % 250) + 1;
        const frame = zoneFrame(
          opcode,
          flag ? 1 : this.seq,
          this.msgId,
          body,
          flag
        );
        this.link.writeRaw(frame);
        return await this.link.expect(expect, this.timeout);
      } catch (cause) {
        error = cause;
        if (attempt < retries) await sleep(700);
      }
    }
    throw error;
  }

  async profile(roleId, zoneId) {
    const nodes = decodeSdp(Buffer.from(GAME_TEMPLATES.battleData, "base64"));
    setSdp(nodes[0].fields, 0, roleId);
    setSdp(nodes[0].fields, 1, zoneId);
    const frame = await this.request(
      GAME_OP_PROFILE,
      GAME_OP_PROFILE_SC,
      encodeSdp(nodes)
    );
    const fields = decodeSdp(frame.body);
    const base = sdpTag(fields, 0) || { fields: [] };
    return {
      roleId,
      zoneId,
      ...decodePlayerBase(base.fields || [])
    };
  }

  async stats(roleId, zoneId) {
    const nodes = decodeSdp(Buffer.from(GAME_TEMPLATES.battleData, "base64"));
    setSdp(nodes[0].fields, 0, roleId);
    setSdp(nodes[0].fields, 1, zoneId);
    const frame = await this.request(
      GAME_OP_STATS,
      GAME_OP_STATS_SC,
      encodeSdp(nodes),
      1,
      2
    );
    return decodeGameStats(frame.body, roleId, zoneId);
  }

  async history(roleId, zoneId) {
    const nodes = decodeSdp(Buffer.from(GAME_TEMPLATES.history, "base64"));
    setSdp(nodes[0].fields, 0, zoneId);
    setSdp(nodes[0].fields, 1, roleId);
    const frame = await this.request(
      GAME_OP_HISTORY,
      GAME_OP_HISTORY_SC,
      encodeSdp(nodes),
      1,
      1
    );
    const fields = decodeSdp(frame.body);
    const root = sdpTag(fields, 0) || { fields: [] };
    const list = sdpTag(root.fields || [], 2);
    if (!list || list.type !== SDP_LIST) return [];
    return (list.items || []).map((item) => sdpBig(fieldsOf(item), 0));
  }

  close() {
    this.link.close();
  }
}

const gameAuth = async (options = {}) => {
  const timeout = options.timeout || 12000;
  const link = new SocketLink(
    options.authHost || GAME_AUTH_HOST,
    options.authPort || GAME_AUTH_PORT,
    "auth",
    timeout
  );
  await link.open();
  try {
    link.writeRaw(authWrap(Buffer.from(GAME_TEMPLATES.loginInner, "base64")));
    const authFrame = await link.expect(GAME_OP_AUTH_SC, timeout);
    const authRoot = sdpTag(decodeSdp(authFrame.body), 0) || { fields: [] };
    const authNodes = authRoot.fields || [];
    const account = sdpInt(authNodes, 0);
    const sessionKey = sdpText(authNodes, 1);
    const ip = sdpText(authNodes, 7);
    const zoneField = sdpTag(authNodes, 2);
    const zoneId =
      zoneField && zoneField.fields ? sdpInt(zoneField.fields, 0) : options.zoneId;
    if (!account || !sessionKey) {
      throw new MlbbError("game auth did not return an account");
    }
    const upgrade = decodeSdp(Buffer.from(GAME_TEMPLATES.checkUpgrade, "base64"));
    setSdp(upgrade[0].fields, 1, sessionKey);
    setSdp(upgrade[0].fields, 10, ip);
    link.writeRaw(
      authWrap(innerFrame(GAME_OP_UPGRADE, 1, encodeSdp(upgrade)))
    );
    const upgradeFrame = await link.expect(GAME_OP_UPGRADE_SC, timeout);
    const upgradeNodes =
      (sdpTag(decodeSdp(upgradeFrame.body), 0) || { fields: [] }).fields || [];
    const server = sdpText(upgradeNodes, 1);
    if (!server) {
      throw new MlbbError("game auth did not return a zone address");
    }
    const address = parseServerAddress(server);
    return {
      account,
      sessionKey,
      ip,
      zoneId,
      host: address.host,
      port: address.port
    };
  } finally {
    link.close();
  }
};

const guestLogin = async (options = {}) => {
  zstdCompress(Buffer.from("ok"));
  const auth = await gameAuth(options);
  const link = new SocketLink(
    auth.host,
    auth.port,
    "game",
    options.timeout || 12000
  );
  await link.open();
  const session = new GameSession(link, auth, options);
  try {
    const connect = decodeSdp(Buffer.from(GAME_TEMPLATES.netConnect, "base64"));
    setSdp(connect[0].fields, 0, auth.account);
    setSdp(connect[0].fields, 1, auth.sessionKey);
    setSdp(connect[0].fields, 2, auth.zoneId);
    setSdp(connect[0].fields, 7, auth.ip);
    await session.request(
      GAME_OP_CONNECT,
      GAME_OP_CONNECT_SC,
      encodeSdp(connect)
    );
    await sleep(options.roleDelay ?? 350);
    await session.request(
      GAME_OP_ROLE,
      GAME_OP_ROLE_SC,
      Buffer.from(GAME_TEMPLATES.roleInit, "base64"),
      0,
      2
    );
    return session;
  } catch (error) {
    link.close();
    throw error;
  }
};

const stalkMlbb = async (roleId, zoneId, options = {}) => {
  const ids = parseTarget(roleId, zoneId);
  const result = {
    roleId: ids.roleId,
    zoneId: ids.zoneId,
    profile: null,
    stats: null,
    history: null,
    errors: {}
  };
  const capture = async (key, task) => {
    try {
      result[key] = await task();
    } catch (error) {
      result.errors[key] = error.message;
    }
  };
  let game = null;
  try {
    game = await guestLogin(options);
    await capture("profile", () => game.profile(ids.roleId, ids.zoneId));
    await capture("stats", () => game.stats(ids.roleId, ids.zoneId));
    await capture("history", () => game.history(ids.roleId, ids.zoneId));
  } catch (error) {
    for (const key of ["profile", "stats", "history"]) {
      if (!result.errors[key]) result.errors[key] = error.message;
    }
  } finally {
    if (game) game.close();
  }
  return result;
};

module.exports = function (app) {
  app.get("/api/mlbb/stalk", async (req, res) => {
    const {
      userid,
      userId,
      roleid,
      roleId,
      id,
      uid,
      zoneid,
      zoneId,
      serverid,
      serverId,
      target,
      q
    } = req.query;

    const rawId =
      userid ?? userId ?? roleid ?? roleId ?? id ?? uid ?? target ?? q ?? "";
    const rawZone = zoneid ?? zoneId ?? serverid ?? serverId;

    if (!String(rawId).trim()) {
      return res.status(400).json({
        status: false,
        creator: "Vanzz Ryuichi",
        error: "Parameter 'userid' dan 'zoneid' wajib diisi"
      });
    }

    try {
      const data = await stalkMlbb(rawId, rawZone);
      const hasAnyData = Boolean(data.profile || data.stats || data.history);
      if (!hasAnyData && Object.keys(data.errors).length > 0) {
        return res.status(500).json({
          status: false,
          creator: "Vanzz Ryuichi",
          error:
            data.errors.profile ||
            data.errors.stats ||
            data.errors.history ||
            "Gagal mengambil data MLBB"
        });
      }

      return res.json({
        status: true,
        creator: "Vanzz Ryuichi",
        result: data
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        status: false,
        creator: "Vanzz Ryuichi",
        error: err.message
      });
    }
  });
};
