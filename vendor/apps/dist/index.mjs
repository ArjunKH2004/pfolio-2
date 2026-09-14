import crypto$1 from 'node:crypto';
import path from 'node:path';

// src/errors.ts
var MalformedBundleError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "MalformedBundleError";
  }
};
var DisallowedBundleError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "DisallowedBundleError";
  }
};
var MissingMigrationError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "MissingMigrationError";
  }
};
var MigrationRewrittenError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "MigrationRewrittenError";
  }
};
var DeployFailedError = class extends Error {
  constructor(step, options) {
    super(`Deploy failed at step: ${step}`);
    this.step = step;
    this.name = "DeployFailedError";
    this.cause = options?.cause;
  }
};
var DestroyFailedError = class extends Error {
  constructor(step, options) {
    super(`Destroy failed at step: ${step}`);
    this.step = step;
    this.name = "DestroyFailedError";
    this.cause = options?.cause;
  }
};

// src/probe.ts
var PROBE_LABEL = "mfg-agent:apps-edge:probe:v1";
var PROBE_HEADER = "X-Mfg-Probe";
var PROBE_APP_HEADER = "X-Mfg-Probe-App";
var enc = new TextEncoder();
async function deriveProbeSubkey(secret) {
  const keyData = new Uint8Array(secret);
  const hkdfKey = await crypto.subtle.importKey("raw", keyData, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32),
      info: enc.encode(PROBE_LABEL)
    },
    hkdfKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}
function buildMessage(appHost2, slot, appId) {
  return enc.encode(`${appHost2}:${slot}:${appId}`);
}
function b64encode(buf) {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s);
}
function b64decode(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
async function signProbe(secret, appHost2, slot, appId) {
  const key = await deriveProbeSubkey(secret);
  return b64encode(await crypto.subtle.sign("HMAC", key, buildMessage(appHost2, slot, appId)));
}
async function verifyProbeSignature(secret, appHost2, slot, appId, signature) {
  try {
    const key = await deriveProbeSubkey(secret);
    return crypto.subtle.verify(
      "HMAC",
      key,
      b64decode(signature),
      buildMessage(appHost2, slot, appId)
    );
  } catch {
    return false;
  }
}

// src/sharing.ts
var SharingLevel = {
  Private: "Private",
  Workspace: "Workspace",
  Organization: "Organization",
  Public: "Public"
};
var APP_RELATIONS = {
  PUBLIC: "public",
  ORG: "org",
  WORKSPACE_EDITOR: "workspace_editor",
  WORKSPACE_VIEWER: "workspace_viewer",
  REVOKING: "revoking"
};
function deriveSharingLevel(relations) {
  const set = new Set(relations);
  if (set.has(APP_RELATIONS.PUBLIC)) return SharingLevel.Public;
  if (set.has(APP_RELATIONS.ORG)) return SharingLevel.Organization;
  if (set.has(APP_RELATIONS.WORKSPACE_EDITOR) || set.has(APP_RELATIONS.WORKSPACE_VIEWER))
    return SharingLevel.Workspace;
  return SharingLevel.Private;
}
var SHARING_RANK = {
  [SharingLevel.Private]: 0,
  [SharingLevel.Workspace]: 1,
  [SharingLevel.Organization]: 2,
  [SharingLevel.Public]: 3
};
function isNarrowing(from, to) {
  return SHARING_RANK[to] < SHARING_RANK[from];
}
function sharingLevelTuples(level, orgId, workspaceIds) {
  switch (level) {
    case SharingLevel.Public:
      return [
        {
          relation: APP_RELATIONS.PUBLIC,
          subject: { objectType: "public_user", objectId: "*" }
        },
        {
          relation: APP_RELATIONS.PUBLIC,
          subject: { objectType: "membership", objectId: "*" }
        }
      ];
    case SharingLevel.Organization:
      return [{ relation: APP_RELATIONS.ORG, subject: { objectType: "org", objectId: orgId } }];
    case SharingLevel.Workspace:
      return workspaceIds.map((workspaceId) => ({
        relation: APP_RELATIONS.WORKSPACE_VIEWER,
        subject: { objectType: "workspace", objectId: workspaceId }
      }));
    case SharingLevel.Private:
      return [];
  }
}
function isAppSharingRelation(relation) {
  return relation === APP_RELATIONS.PUBLIC || relation === APP_RELATIONS.ORG || relation === APP_RELATIONS.WORKSPACE_VIEWER || relation === APP_RELATIONS.WORKSPACE_EDITOR;
}

// src/layout.ts
var MANIFEST_PATH = ".mfg/app.json";
function isManifestPath(path) {
  return path === MANIFEST_PATH;
}
var WORKER_ENTRY = "dist/server/index.js";
var ASSET_ROOT = "dist/client/";
var MIGRATIONS_DIR = ".mfg/migrations/";
var SOURCE_ROOT = "source/";
var MIGRATION_META_DIR = ".mfg/migrations/meta/";
var SOURCE_META_JOURNAL = `${SOURCE_ROOT}${MIGRATION_META_DIR}_journal.json`;
var BINDING_PATH = ".mfg/binding.json";

// src/identity.ts
var VIEWER_HEADER_PREFIX = "x-mfg-viewer-";
var VIEWER_ID_HEADER = "x-mfg-viewer-id";
var VIEWER_ORG_HEADER = "x-mfg-viewer-org";
var VIEWER_WORKSPACE_HEADER = "x-mfg-viewer-workspace";

// src/manifest.ts
function parseManifest(json) {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new MalformedBundleError("manifest must be a JSON object");
  }
  const obj = json;
  if (typeof obj["schemaVersion"] !== "string") {
    throw new MalformedBundleError("manifest.schemaVersion must be a string");
  }
  if (obj["schemaVersion"] !== "1") {
    throw new MalformedBundleError(
      `unsupported manifest schemaVersion: "${obj["schemaVersion"]}"; only "1" is supported`
    );
  }
  if (typeof obj["schemaFingerprint"] !== "string") {
    throw new MalformedBundleError("manifest.schemaFingerprint must be a string");
  }
  if (obj["schemaFingerprint"] === "") {
    throw new MalformedBundleError("manifest.schemaFingerprint must not be empty");
  }
  if (!Array.isArray(obj["migrations"])) {
    throw new MalformedBundleError("manifest.migrations must be an array");
  }
  const migrations = [];
  const seenOrdinals = /* @__PURE__ */ new Set();
  for (let i = 0; i < obj["migrations"].length; i++) {
    const m = obj["migrations"][i];
    if (typeof m !== "object" || m === null) {
      throw new MalformedBundleError(`manifest.migrations[${i}] must be an object`);
    }
    const ordinal = m["ordinal"];
    if (typeof ordinal !== "number" || !Number.isInteger(ordinal) || ordinal < 0) {
      throw new MalformedBundleError(
        `manifest.migrations[${i}].ordinal must be a non-negative integer`
      );
    }
    if (seenOrdinals.has(ordinal)) {
      throw new MalformedBundleError(`manifest.migrations has duplicate ordinal: ${ordinal}`);
    }
    seenOrdinals.add(ordinal);
    if (typeof m["hash"] !== "string") {
      throw new MalformedBundleError(`manifest.migrations[${i}].hash must be a string`);
    }
    if (m["hash"] === "") {
      throw new MalformedBundleError(`manifest.migrations[${i}].hash must not be empty`);
    }
    migrations.push({ ordinal, hash: m["hash"] });
  }
  let database;
  if ("database" in obj && obj["database"] !== void 0 && obj["database"] !== null) {
    const db = obj["database"];
    if (typeof db !== "object" || Array.isArray(db)) {
      throw new MalformedBundleError("manifest.database must be an object");
    }
    if (typeof db["schema"] !== "string") {
      throw new MalformedBundleError("manifest.database.schema must be a string");
    }
    database = { schema: db["schema"] };
  }
  let bucket;
  if (obj["bucket"] !== void 0) {
    if (typeof obj["bucket"] !== "boolean") {
      throw new MalformedBundleError("manifest.bucket must be a boolean");
    }
    bucket = obj["bucket"];
  }
  let runtime;
  if (obj["runtime"] !== void 0) {
    const rt = obj["runtime"];
    if (typeof rt !== "object" || rt === null || Array.isArray(rt)) {
      throw new MalformedBundleError("manifest.runtime must be an object");
    }
    const rtObj = rt;
    if (typeof rtObj["compatibilityDate"] !== "string" || rtObj["compatibilityDate"] === "") {
      throw new MalformedBundleError(
        "manifest.runtime.compatibilityDate must be a non-empty string"
      );
    }
    const flags = rtObj["compatibilityFlags"];
    if (!Array.isArray(flags) || flags.some((f) => typeof f !== "string")) {
      throw new MalformedBundleError(
        "manifest.runtime.compatibilityFlags must be an array of strings"
      );
    }
    runtime = {
      compatibilityDate: rtObj["compatibilityDate"],
      compatibilityFlags: flags
    };
  }
  return {
    schemaVersion: obj["schemaVersion"],
    schemaFingerprint: obj["schemaFingerprint"],
    migrations,
    ...database !== void 0 ? { database } : {},
    ...bucket !== void 0 ? { bucket } : {},
    ...runtime !== void 0 ? { runtime } : {}
  };
}
function computeSchemaFingerprint(modules) {
  const concatenated = [...modules].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0).map((m) => m.source.replace(/\r\n?/g, "\n")).join("");
  return crypto$1.createHash("sha256").update(concatenated, "utf8").digest("hex");
}
function hashMigration(sql) {
  return crypto$1.createHash("sha256").update(sql, "utf8").digest("hex");
}
function isPathEscape(entryPath) {
  if (!entryPath) return true;
  if (entryPath.includes("\\")) return true;
  if (path.posix.isAbsolute(entryPath)) return true;
  const normalized = path.posix.normalize(entryPath);
  return normalized === ".." || normalized.startsWith("../");
}
function contentAsString(content) {
  return typeof content === "string" ? content : new TextDecoder().decode(content);
}
function validateBundle(entries, context) {
  for (const entry of entries) {
    if (isPathEscape(entry.path)) {
      throw new MalformedBundleError(`path escapes bundle root: ${entry.path}`);
    }
  }
  const decoded = entries.map((e) => ({ path: e.path, text: contentAsString(e.content) }));
  for (const literal of context.forbiddenLiterals) {
    if (!literal) continue;
    for (const { path, text } of decoded) {
      if (path.startsWith(SOURCE_ROOT)) continue;
      if (text.includes(literal)) {
        throw new DisallowedBundleError(`forbidden literal found in: ${path}`);
      }
    }
  }
  if (!entries.some((e) => e.path === WORKER_ENTRY)) {
    throw new MalformedBundleError(`missing required worker entrypoint: ${WORKER_ENTRY}`);
  }
  const manifestCount = entries.filter((e) => isManifestPath(e.path)).length;
  if (manifestCount > 1) {
    throw new MalformedBundleError(`duplicate manifest entry: ${MANIFEST_PATH}`);
  }
  const manifestDecoded = decoded.find((e) => isManifestPath(e.path));
  if (!manifestDecoded) {
    throw new MalformedBundleError(`missing bundle manifest: ${MANIFEST_PATH}`);
  }
  let rawJson;
  try {
    rawJson = JSON.parse(manifestDecoded.text);
  } catch {
    throw new MalformedBundleError(`bundle manifest is not valid JSON: ${manifestDecoded.path}`);
  }
  const manifest = parseManifest(rawJson);
  if (!entries.some((e) => e.path.startsWith(SOURCE_ROOT))) {
    throw new MalformedBundleError(
      `bundle carries no source entries under ${SOURCE_ROOT}; the App could not be reopened later`
    );
  }
  if (manifest.database?.schema && manifest.migrations.length > 0) {
    if (!entries.some((e) => e.path === SOURCE_META_JOURNAL)) {
      throw new MalformedBundleError(
        `an App that declares a database with migrations must carry ${SOURCE_META_JOURNAL}; without drizzle's snapshots the next migration cannot be generated. Do not delete ${MIGRATION_META_DIR}.`
      );
    }
  }
  const { priorAppVersion } = context;
  if (priorAppVersion === null) {
    if (manifest.database?.schema && manifest.migrations.length === 0) {
      throw new MissingMigrationError(
        "app declares a database schema but provides no initial migration; add a migration for the initial schema"
      );
    }
  } else {
    const priorHashes = new Map(priorAppVersion.migrations.map((m) => [m.ordinal, m.hash]));
    for (const m of manifest.migrations) {
      const priorHash = priorHashes.get(m.ordinal);
      if (priorHash !== void 0 && priorHash !== m.hash) {
        throw new MigrationRewrittenError(
          `migration ${m.ordinal} was already saved with different content; migrations are immutable once saved \u2014 add a new migration for the change instead of editing this one`
        );
      }
    }
    if (manifest.schemaFingerprint !== priorAppVersion.schemaFingerprint) {
      const priorOrdinals = new Set(priorAppVersion.migrations.map((m) => m.ordinal));
      const hasNewMigration = manifest.migrations.some((m) => !priorOrdinals.has(m.ordinal));
      if (!hasNewMigration) {
        throw new MissingMigrationError(
          "schema fingerprint changed but no new migration is present; add a migration for the schema change"
        );
      }
    }
  }
  return { manifest };
}

// src/archive.ts
var MAGIC = new Uint8Array([77, 70, 71, 80]);
var FORMAT_VERSION = 1;
var HEADER_SIZE = 5;
var enc2 = new TextEncoder();
var dec = new TextDecoder("utf-8", { fatal: true });
function writeBundleArchive(entries) {
  const sorted = [...entries].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const pathBytes = sorted.map((e) => enc2.encode(e.path));
  const contentBytes = sorted.map(
    (e) => typeof e.content === "string" ? enc2.encode(e.content) : e.content
  );
  let size = HEADER_SIZE + 4;
  for (let i = 0; i < sorted.length; i++) {
    size += 4 + pathBytes[i].length + 4 + contentBytes[i].length;
  }
  const buf = new Uint8Array(size);
  const view = new DataView(buf.buffer);
  let off = 0;
  buf.set(MAGIC, off);
  off += 4;
  buf[off++] = FORMAT_VERSION;
  view.setUint32(off, sorted.length, false);
  off += 4;
  for (let i = 0; i < sorted.length; i++) {
    const pb = pathBytes[i];
    const cb = contentBytes[i];
    view.setUint32(off, pb.length, false);
    off += 4;
    buf.set(pb, off);
    off += pb.length;
    view.setUint32(off, cb.length, false);
    off += 4;
    buf.set(cb, off);
    off += cb.length;
  }
  return buf;
}
function readBundleArchive(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let off = 0;
  function need(n) {
    if (off + n > bytes.length) {
      throw new MalformedBundleError("archive is truncated");
    }
  }
  need(HEADER_SIZE + 4);
  for (let i = 0; i < 4; i++) {
    if (bytes[off + i] !== MAGIC[i]) {
      throw new MalformedBundleError("archive has invalid magic bytes");
    }
  }
  off += 4;
  const version = bytes[off++];
  if (version !== FORMAT_VERSION) {
    throw new MalformedBundleError(
      `archive version ${version} is not supported; expected ${FORMAT_VERSION}`
    );
  }
  const count = view.getUint32(off, false);
  off += 4;
  const entries = [];
  for (let i = 0; i < count; i++) {
    need(4);
    const pathLen = view.getUint32(off, false);
    off += 4;
    if (pathLen === 0) {
      throw new MalformedBundleError("archive entry has an empty path");
    }
    need(pathLen);
    let path;
    try {
      path = dec.decode(bytes.subarray(off, off + pathLen));
    } catch {
      throw new MalformedBundleError("archive entry path is not valid UTF-8");
    }
    off += pathLen;
    need(4);
    const contentLen = view.getUint32(off, false);
    off += 4;
    need(contentLen);
    const content = new Uint8Array(bytes.subarray(off, off + contentLen));
    off += contentLen;
    entries.push({ path, content });
  }
  if (off !== bytes.length) {
    throw new MalformedBundleError("archive has trailing bytes after the last entry");
  }
  return entries;
}

// src/hostname.ts
var RESERVED_HOST_LABELS = /* @__PURE__ */ new Set([
  "www",
  "api",
  "app",
  "admin",
  "internal",
  "dispatch",
  "static",
  "assets",
  "health",
  "status"
]);
var MAX_HOST_LABEL_LENGTH = 63;
var MAX_ORG_NAME_SLUG_LENGTH = 24;
var HOST_SUFFIX_LENGTH = 4;
var HOST_LABEL_SEPARATOR = "--";
var MAX_ORG_HOST_LABEL_LENGTH = MAX_ORG_NAME_SLUG_LENGTH + 1 + HOST_SUFFIX_LENGTH;
var MAX_APP_SLUG_LENGTH = MAX_HOST_LABEL_LENGTH - HOST_LABEL_SEPARATOR.length - MAX_ORG_HOST_LABEL_LENGTH;
var MAX_BASE_FOR_SUFFIX = MAX_APP_SLUG_LENGTH - 1 - HOST_SUFFIX_LENGTH;
var InvalidHostLabelError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidHostLabelError";
  }
};
function isValidHostLabel(label) {
  return label.length >= 1 && label.length <= MAX_HOST_LABEL_LENGTH && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(label) && !RESERVED_HOST_LABELS.has(label);
}
function slugifyHostLabel(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function randomHostSuffix() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < HOST_SUFFIX_LENGTH; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
function deriveAppSlug(name, isTaken, randomSuffix) {
  const base = slugifyHostLabel(name).slice(0, MAX_BASE_FOR_SUFFIX).replace(/-+$/, "");
  if (!base) {
    throw new InvalidHostLabelError(`Cannot derive a valid slug from name: "${name}"`);
  }
  const unavailable = (s) => RESERVED_HOST_LABELS.has(s) || isTaken(s);
  if (!unavailable(base)) return base;
  for (let n = 2; n <= 9; n++) {
    const candidate2 = `${base}-${n}`;
    if (!unavailable(candidate2)) return candidate2;
  }
  const suffix = randomSuffix();
  const candidate = `${base}-${suffix}`;
  if (!unavailable(candidate)) return candidate;
  throw new InvalidHostLabelError(
    `All slug variants for "${name}" are taken (base "${base}" through suffix "${suffix}")`
  );
}
function deriveOrgHostLabel(orgName, suffix) {
  const nameSlug = slugifyHostLabel(orgName).slice(0, MAX_ORG_NAME_SLUG_LENGTH).replace(/-+$/, "");
  if (!nameSlug) {
    throw new InvalidHostLabelError(`Cannot derive an org host label from name: "${orgName}"`);
  }
  return `${nameSlug}-${suffix}`;
}
function appHost(appSlug, orgHostLabel, servingDomain) {
  const label = `${appSlug}${HOST_LABEL_SEPARATOR}${orgHostLabel}`;
  if (label.length > MAX_HOST_LABEL_LENGTH) {
    throw new InvalidHostLabelError(
      `Composed host label "${label}" is ${label.length} chars, over the ${MAX_HOST_LABEL_LENGTH}-char DNS limit`
    );
  }
  return `${label}.${servingDomain}`;
}

// src/fake-call-controller.ts
var FakeCallController = class {
  constructor() {
    this.rules = [];
    this.calls = [];
  }
  /** Fail the next call to `method` with `error`, then return to normal. */
  failNext(method, error) {
    this.rules.push({ kind: "error", method, error, once: true });
  }
  /** Fail every call to `method` with `error` until reset(). */
  failAll(method, error) {
    this.rules.push({ kind: "error", method, error, once: false });
  }
  /**
   * Return `value` for the next call to `method` instead of the fake's default.
   * Distinct from failNext: the call does not throw — it returns the canned value.
   */
  setResult(method, value) {
    this.rules.push({ kind: "result", method, value, once: true });
  }
  /** Clear all queued failure rules and recorded calls. */
  reset() {
    this.rules = [];
    this.calls = [];
  }
  /** Returns every recorded call to `method` in order. */
  callsTo(method) {
    return this.calls.filter((c) => c.method === method);
  }
  /**
   * Route a fake method call through the failure-injection and recording gate.
   * Records the call first, then checks if a rule matches; if so, either throws
   * (error rule) or returns the canned value (result rule), consuming once-rules
   * exactly once. Otherwise delegates to `run`.
   */
  async gate(method, args, run) {
    this.calls.push({ method, args });
    const i = this.rules.findIndex((r) => r.method === method);
    if (i >= 0) {
      const r = this.rules[i];
      if (r.once) this.rules.splice(i, 1);
      if (r.kind === "error") throw r.error;
      return r.value;
    }
    return run();
  }
};

// src/slots.ts
var INITIAL_SLOT = "a";
function stagingSlot(live) {
  return live === "a" ? "b" : "a";
}
function slotScriptName(appId, slot) {
  return `app-${appId}-${slot}`;
}

// src/provider-contract.ts
var RESOURCE_NAME = /^[a-z0-9][a-z0-9_-]{0,62}$/;
var R2_BUCKET_NAME = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
var ASSET_HASH = /^[0-9a-f]{32}$/;
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var BINDING_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
var COMPAT_DATE = /^\d{4}-\d{2}-\d{2}$/;
var SLOTS = /* @__PURE__ */ new Set(["a", "b"]);
var ProviderContractError = class extends Error {
  constructor(operation, detail) {
    super(`${operation}: ${detail}`);
    this.name = "ProviderContractError";
  }
};
function assertSlot(operation, slot) {
  if (!SLOTS.has(slot)) {
    throw new ProviderContractError(operation, `slot must be 'a' or 'b', got "${slot}"`);
  }
}
function assertScriptSlot(operation, appId, slot) {
  assertSlot(operation, slot);
  const scriptName = slotScriptName(appId, slot);
  if (!RESOURCE_NAME.test(scriptName)) {
    throw new ProviderContractError(
      operation,
      `appId "${appId}" derives the invalid script name "${scriptName}"`
    );
  }
}
function assertOpenUploadSessionContract(params) {
  assertScriptSlot("openUploadSession", params.appId, params.slot);
}
function assertUploadAssetsContract(params) {
  for (const [path, asset] of Object.entries(params.assets)) {
    if (!path.startsWith("/")) {
      throw new ProviderContractError(
        "uploadAssets",
        `asset key "${path}" must be a publish path rooted with '/'`
      );
    }
    if (!ASSET_HASH.test(asset.hash)) {
      throw new ProviderContractError(
        "uploadAssets",
        `asset "${path}" hash must be 32 lowercase hex chars, got ${asset.hash.length}`
      );
    }
  }
}
function assertUploadScriptContract(params) {
  assertSlot("uploadScript", params.slot);
  if (params.script.length === 0) {
    throw new ProviderContractError("uploadScript", "script body is empty");
  }
  if (params.disableDirectSubdomain !== true) {
    throw new ProviderContractError("uploadScript", "disableDirectSubdomain must be true (AD-11)");
  }
  for (const binding of params.bindings) {
    if (!BINDING_NAME.test(binding.name)) {
      throw new ProviderContractError(
        "uploadScript",
        `binding name "${binding.name}" is not a valid identifier`
      );
    }
    switch (binding.type) {
      case "d1":
        if (!UUID.test(binding.id)) {
          throw new ProviderContractError(
            "uploadScript",
            `binding "${binding.name}" id must be a provider UUID, got "${binding.id}"`
          );
        }
        break;
      case "r2_bucket":
        if (!R2_BUCKET_NAME.test(binding.bucketName)) {
          throw new ProviderContractError(
            "uploadScript",
            `binding "${binding.name}" bucket name "${binding.bucketName}" breaks R2's rule \u2014 3\u201363 lowercase alphanumerics and hyphens, no leading or trailing hyphen`
          );
        }
        break;
    }
  }
  if (params.runtime) {
    if (!COMPAT_DATE.test(params.runtime.compatibilityDate)) {
      throw new ProviderContractError(
        "uploadScript",
        `compatibilityDate must be YYYY-MM-DD, got "${params.runtime.compatibilityDate}"`
      );
    }
    for (const flag of params.runtime.compatibilityFlags) {
      if (!flag) throw new ProviderContractError("uploadScript", "compatibility flag is empty");
    }
  }
}
function assertProvisionBucketContract(params) {
  const name = `app-${params.appId}`;
  if (!R2_BUCKET_NAME.test(name)) {
    throw new ProviderContractError(
      "provisionBucket",
      `appId "${params.appId}" derives the invalid bucket name "${name}" \u2014 R2 bucket names are 3\u201363 lowercase alphanumerics and hyphens, no leading or trailing hyphen`
    );
  }
}
function assertProvisionDatabaseContract(params) {
  const name = `app-${params.appId}`;
  if (!RESOURCE_NAME.test(name)) {
    throw new ProviderContractError(
      "provisionDatabase",
      `appId "${params.appId}" derives the invalid database name "${name}"`
    );
  }
  if (!params.organizationId) {
    throw new ProviderContractError("provisionDatabase", "organizationId is required");
  }
}
function assertApplyMigrationContract(params) {
  if (!UUID.test(params.databaseId)) {
    throw new ProviderContractError(
      "applyMigration",
      `databaseId must be a provider UUID, got "${params.databaseId}"`
    );
  }
  if (!params.sql.trim()) {
    throw new ProviderContractError("applyMigration", `migration ${params.ordinal} has empty SQL`);
  }
  if (!Number.isInteger(params.ordinal) || params.ordinal < 0) {
    throw new ProviderContractError("applyMigration", `ordinal must be a non-negative integer`);
  }
}
function assertReadMigrationLedgerContract(params) {
  if (!UUID.test(params.databaseId)) {
    throw new ProviderContractError(
      "readMigrationLedger",
      `databaseId must be a provider UUID, got "${params.databaseId}"`
    );
  }
}
function assertProbeHealthContract(params) {
  assertSlot("probeHealth", params.slot);
  if (!params.appHost || /[\s/:]/.test(params.appHost)) {
    throw new ProviderContractError(
      "probeHealth",
      `appHost must be a bare hostname, got "${params.appHost}"`
    );
  }
  if (!params.probeSignature) {
    throw new ProviderContractError("probeHealth", "probeSignature is required");
  }
  if (!params.appId) {
    throw new ProviderContractError("probeHealth", "appId is required");
  }
}
function assertDeleteAppContract(params) {
  for (const slot of params.slots) assertScriptSlot("deleteApp", params.appId, slot);
  if (params.databaseId !== void 0 && !UUID.test(params.databaseId)) {
    throw new ProviderContractError(
      "deleteApp",
      `databaseId must be a provider UUID, got "${params.databaseId}"`
    );
  }
}

// src/provider-api.port.ts
function fakeDatabaseUuid(n) {
  const tail = n.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${tail}`;
}
var InMemoryProviderApi = class {
  constructor(controller) {
    this.controller = controller;
    this.sessionCounter = 0;
    this.dbCounter = 0;
    /**
     * databaseId -> ordinal -> entry. Modelled rather than stubbed: apply-once is the
     * property Story 5.11 adds, and a fake that accepted any applyMigration could not tell
     * a correct deploy from one that re-runs every migration (DW-60).
     */
    this.ledgers = /* @__PURE__ */ new Map();
    /**
     * Created bucket names. Modelled rather than stubbed for the same reason as the
     * ledger: the idempotent create (a second provision of the same name succeeds and
     * creates nothing) is the property the deploy pipeline relies on, and in-memory
     * state is the one thing a fake can hold faithfully.
     */
    this.buckets = /* @__PURE__ */ new Set();
  }
  openUploadSession(params) {
    assertOpenUploadSessionContract(params);
    return this.controller.gate("openUploadSession", [params], () => ({
      sessionId: `session-${++this.sessionCounter}`
    }));
  }
  uploadAssets(params) {
    assertUploadAssetsContract(params);
    return this.controller.gate("uploadAssets", [params], () => void 0);
  }
  uploadScript(params) {
    assertUploadScriptContract(params);
    return this.controller.gate("uploadScript", [params], () => void 0);
  }
  provisionDatabase(params) {
    assertProvisionDatabaseContract(params);
    return this.controller.gate("provisionDatabase", [params], () => ({
      databaseId: fakeDatabaseUuid(++this.dbCounter)
    }));
  }
  // async for the same reason as readMigrationLedger below: the contract assert
  // throws synchronously on a malformed appId.
  async provisionBucket(params) {
    assertProvisionBucketContract(params);
    return this.controller.gate("provisionBucket", [params], () => {
      this.buckets.add(`app-${params.appId}`);
      return void 0;
    });
  }
  applyMigration(params) {
    assertApplyMigrationContract(params);
    return this.controller.gate("applyMigration", [params], () => {
      const ledger = this.ledgers.get(params.databaseId) ?? /* @__PURE__ */ new Map();
      if (ledger.has(params.ordinal)) {
        throw new Error(
          `migration ledger already holds ordinal ${params.ordinal} for database ${params.databaseId}`
        );
      }
      ledger.set(params.ordinal, {
        ordinal: params.ordinal,
        hash: params.hash,
        status: "applied"
      });
      this.ledgers.set(params.databaseId, ledger);
      return void 0;
    });
  }
  // async: the assert below throws synchronously on a bad databaseId, and only an
  // `async` method turns that into a rejected promise instead of a thrown call
  // expression (the other fake methods get away without it because their contract
  // checks reject only shapes the deploy pipeline never passes them).
  async readMigrationLedger(params) {
    assertReadMigrationLedgerContract(params);
    return this.controller.gate(
      "readMigrationLedger",
      [params],
      () => [...this.ledgers.get(params.databaseId)?.values() ?? []].sort(
        (a, b) => a.ordinal - b.ordinal
      )
    );
  }
  probeHealth(params) {
    assertProbeHealthContract(params);
    return this.controller.gate("probeHealth", [params], () => ({ ok: true }));
  }
  deleteApp(params) {
    assertDeleteAppContract(params);
    return this.controller.gate("deleteApp", [params], () => void 0);
  }
  getScriptBindings(params) {
    return this.controller.gate("getScriptBindings", [params], () => []);
  }
};
function createInMemoryProviderApi() {
  const controller = new FakeCallController();
  return { provider: new InMemoryProviderApi(controller), controller };
}

// src/object-store.port.ts
var APP_OBJECT_STORAGE_PREFIX = "app-archives/";
var appStorageObjectKey = (logicalKey) => `${APP_OBJECT_STORAGE_PREFIX}${logicalKey}`;
var appThumbnailKey = (appId, versionId) => `apps/${appId}/thumbnails/${versionId}.png`;
var ArchiveImmutabilityError = class extends Error {
  constructor(key) {
    super(`Archive key already exists and cannot be overwritten: ${key}`);
    this.name = "ArchiveImmutabilityError";
  }
};
var ArchiveNotFoundError = class extends Error {
  constructor(key) {
    super(`Archive key not found: ${key}`);
    this.name = "ArchiveNotFoundError";
  }
};
var InMemoryObjectStore = class {
  constructor(controller) {
    this.controller = controller;
    this.store = /* @__PURE__ */ new Map();
  }
  putImmutable(key, data) {
    return this.controller.gate("putImmutable", [key, data], () => {
      if (this.store.has(key)) throw new ArchiveImmutabilityError(key);
      this.store.set(key, data.slice());
    });
  }
  get(key) {
    return this.controller.gate("get", [key], () => {
      const bytes = this.store.get(key);
      if (bytes === void 0) throw new ArchiveNotFoundError(key);
      return bytes.slice();
    });
  }
  exists(key) {
    return this.controller.gate("exists", [key], () => this.store.has(key));
  }
  delete(key) {
    return this.controller.gate("delete", [key], () => {
      this.store.delete(key);
    });
  }
};
function createInMemoryObjectStore() {
  const controller = new FakeCallController();
  return { store: new InMemoryObjectStore(controller), controller };
}

// src/authorization.port.ts
function tupleKey(resourceType, resourceId, relation, subjectType, subjectId) {
  return `${resourceType}:${resourceId}#${relation}@${subjectType}:${subjectId}`;
}
function keyFromRelationship(r) {
  return tupleKey(
    r.resource.objectType,
    r.resource.objectId,
    r.relation,
    r.subject.objectType,
    r.subject.objectId
  );
}
var InMemoryAuthorization = class {
  constructor(controller) {
    this.controller = controller;
    // ponytail: direct-tuple matching only; SpiceDB can derive permissions
    // through computed userset / tupleset graph traversal — the gRPC adapter
    // handles that when built. Upgrade path: replace this Set with a real client.
    this.tuples = /* @__PURE__ */ new Set();
  }
  writeRelationships(relationships) {
    return this.controller.gate("writeRelationships", [relationships], () => {
      for (const r of relationships) this.tuples.add(keyFromRelationship(r));
    });
  }
  deleteRelationships(relationships) {
    return this.controller.gate("deleteRelationships", [relationships], () => {
      for (const r of relationships) this.tuples.delete(keyFromRelationship(r));
    });
  }
  writeRelationshipUpdates(updates, fence) {
    return this.controller.gate("writeRelationshipUpdates", [updates], () => {
      if (fence && !this.tuples.has(keyFromRelationship(sharingFenceRelationship(fence)))) {
        throw new Error("App sharing fence rejected the stale relationship update");
      }
      for (const update of updates) {
        const key = keyFromRelationship(update.relationship);
        if (update.operation === "touch") this.tuples.add(key);
        else this.tuples.delete(key);
      }
    });
  }
  installSharingFence(fence) {
    return this.controller.gate("installSharingFence", [fence], () => {
      const prefix = `${fence.resource.objectType}:${fence.resource.objectId}#sharing_fence@`;
      const current = [...this.tuples].filter((key) => key.startsWith(prefix));
      const target = keyFromRelationship(sharingFenceRelationship(fence));
      if (current.includes(target)) return;
      const previous = keyFromRelationship(
        sharingFenceRelationship({ ...fence, generation: fence.generation - 1 })
      );
      if (fence.generation === 1 && current.length > 0 || fence.generation > 1 && !current.includes(previous)) {
        throw new Error("App sharing fence rejected a stale rotation");
      }
      for (const key of this.tuples) {
        if (key.startsWith(prefix)) this.tuples.delete(key);
      }
      this.tuples.add(target);
    });
  }
  checkPermission(check) {
    return this.controller.gate("checkPermission", [check], () => {
      const key = tupleKey(
        check.resource.objectType,
        check.resource.objectId,
        check.permission,
        check.subject.objectType,
        check.subject.objectId
      );
      return this.tuples.has(key);
    });
  }
  lookupResources(params) {
    return this.controller.gate("lookupResources", [params], () => {
      const prefix = `${params.resourceType}:`;
      const suffix = `#${params.permission}@${params.subject.objectType}:${params.subject.objectId}`;
      const ids = [];
      for (const key of this.tuples) {
        if (key.startsWith(prefix) && key.endsWith(suffix)) {
          const resourceId = key.slice(prefix.length, key.length - suffix.length);
          ids.push(resourceId);
        }
      }
      return ids;
    });
  }
  deleteAllForResource(params) {
    return this.controller.gate("deleteAllForResource", [params], () => {
      const prefix = `${params.objectType}:${params.objectId}#`;
      for (const key of this.tuples) {
        if (key.startsWith(prefix)) this.tuples.delete(key);
      }
    });
  }
  listResourceRelations(resource) {
    return this.controller.gate("listResourceRelations", [resource], () => {
      const prefix = `${resource.objectType}:${resource.objectId}#`;
      const relations = /* @__PURE__ */ new Set();
      for (const key of this.tuples) {
        if (key.startsWith(prefix)) {
          const afterHash = key.slice(prefix.length);
          const atIdx = afterHash.indexOf("@");
          if (atIdx !== -1) relations.add(afterHash.slice(0, atIdx));
        }
      }
      return [...relations];
    });
  }
  listResourceRelationships(resource) {
    return this.controller.gate("listResourceRelationships", [resource], () => {
      const prefix = `${resource.objectType}:${resource.objectId}#`;
      return [...this.tuples].flatMap((key) => {
        if (!key.startsWith(prefix)) return [];
        const [relation, subjectKey] = key.slice(prefix.length).split("@", 2);
        const separator = subjectKey?.indexOf(":") ?? -1;
        if (!relation || separator < 0) return [];
        return [
          {
            resource,
            relation,
            subject: {
              objectType: subjectKey.slice(0, separator),
              objectId: subjectKey.slice(separator + 1)
            }
          }
        ];
      });
    });
  }
};
function sharingFenceRelationship(fence) {
  return {
    resource: fence.resource,
    relation: "sharing_fence",
    subject: { objectType: "app_change", objectId: String(fence.generation) }
  };
}
function createInMemoryAuthorization() {
  const controller = new FakeCallController();
  return { authz: new InMemoryAuthorization(controller), controller };
}

// src/registration.ts
var SlugCollisionError = class extends Error {
  constructor(orgId, slug) {
    super(`Slug "${slug}" is already taken in org "${orgId}"`);
    this.name = "SlugCollisionError";
  }
};
var InMemoryAppRegistrationStore = class {
  constructor() {
    this.apps = /* @__PURE__ */ new Map();
    /** Map from `${orgId}:${slug}` → appId */
    this.slugIndex = /* @__PURE__ */ new Map();
    this.orgLabels = /* @__PURE__ */ new Map();
    // ponytail: separate map — tombstone state is orthogonal to AppRecord identity
    this.tombstoneData = /* @__PURE__ */ new Map();
  }
  async listSlugs(orgId) {
    const slugs = [];
    for (const [key] of this.slugIndex) {
      const [kOrg, ...rest] = key.split(":");
      if (kOrg === orgId) slugs.push(rest.join(":"));
    }
    return slugs;
  }
  async isSlugTaken(orgId, slug) {
    return this.slugIndex.has(`${orgId}:${slug}`);
  }
  async insertApp(input) {
    const existing = this.apps.get(input.appId);
    if (existing) return existing;
    const key = `${input.orgId}:${input.appSlug}`;
    if (this.slugIndex.has(key)) throw new SlugCollisionError(input.orgId, input.appSlug);
    const record = { ...input, createdAt: /* @__PURE__ */ new Date() };
    this.apps.set(input.appId, record);
    this.slugIndex.set(key, input.appId);
    return record;
  }
  async deleteApp(appId) {
    const record = this.apps.get(appId);
    if (!record) return;
    this.slugIndex.delete(`${record.orgId}:${record.appSlug}`);
    this.apps.delete(appId);
    this.tombstoneData.delete(appId);
  }
  async getOrgHostLabel(orgId) {
    return this.orgLabels.get(orgId) ?? null;
  }
  async allocateOrgHostLabel(orgId, label) {
    if (this.orgLabels.has(orgId)) return false;
    this.orgLabels.set(orgId, label);
    return true;
  }
  async releaseOrgHostLabel(orgId, label) {
    if (this.orgLabels.get(orgId) === label) this.orgLabels.delete(orgId);
  }
  async findApp(appId) {
    return this.apps.get(appId) ?? null;
  }
  async setAppDatabaseId(appId, databaseId) {
    const record = this.apps.get(appId);
    if (record && !record.databaseId) record.databaseId = databaseId;
  }
  async tombstoneApp(appId, appHost2) {
    if (!this.tombstoneData.has(appId)) {
      this.tombstoneData.set(appId, { appHost: appHost2 });
    }
    const record = this.apps.get(appId);
    if (record && !record.deletingSince) record.deletingSince = /* @__PURE__ */ new Date();
  }
  async listAppsForCreator(orgId, creatorMembershipId, limit) {
    if (limit <= 0) return [];
    return [...this.apps.values()].filter(
      (r) => r.orgId === orgId && r.creatorMembershipId === creatorMembershipId && !this.tombstoneData.has(r.appId)
    ).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.appId < b.appId ? 1 : a.appId > b.appId ? -1 : 0)
    ).slice(0, limit);
  }
  async listTombstones() {
    const result = [];
    for (const [appId, { appHost: appHost2 }] of this.tombstoneData) {
      const record = this.apps.get(appId);
      if (!record) continue;
      const orgHostLabel = this.orgLabels.get(record.orgId) ?? "";
      result.push({
        appId: record.appId,
        orgId: record.orgId,
        appSlug: record.appSlug,
        orgHostLabel,
        appHost: appHost2,
        ...record.databaseId ? { databaseId: record.databaseId } : {}
      });
    }
    return result;
  }
};

// src/app-version.ts
var InMemoryAppVersionStore = class {
  constructor() {
    // ponytail: Map keyed by versionId; latest scan is O(n) — acceptable for tests only
    this.records = /* @__PURE__ */ new Map();
  }
  async getLatestAppVersion(appId) {
    let latest = null;
    for (const r of this.records.values()) {
      if (r.appId !== appId) continue;
      if (!latest || r.createdAt > latest.createdAt) latest = r;
    }
    return latest;
  }
  async getAppVersion(versionId) {
    return this.records.get(versionId) ?? null;
  }
  async insertAppVersion(record) {
    const existing = this.records.get(record.versionId);
    if (existing) return existing;
    const stored = { ...record, migrations: [...record.migrations] };
    this.records.set(record.versionId, stored);
    return stored;
  }
  async listAppVersions(appId) {
    const result = [];
    for (const r of this.records.values()) {
      if (r.appId === appId) result.push(r);
    }
    return result;
  }
  async deleteAppVersions(appId) {
    for (const [id, r] of this.records) {
      if (r.appId === appId) this.records.delete(id);
    }
  }
};

// src/app-events.ts
var APP_VERSION_SAVE_REJECTED = "APP_VERSION_SAVE_REJECTED";
var APP_DEPLOY_HEALTH_CHECK_FAILED = "APP_DEPLOY_HEALTH_CHECK_FAILED";
var APP_DEPLOYED = "APP_DEPLOYED";
var APP_DESTROYED = "APP_DESTROYED";
var APP_ACCESS_REFUSED = "APP_ACCESS_REFUSED";
var InMemoryAppEventSink = class {
  constructor() {
    this.emitted = [];
  }
  async emitAppEvent(evt) {
    this.emitted.push({ ...evt, data: { ...evt.data } });
  }
};
async function saveAppVersion(input, deps) {
  const {
    versionId,
    appId,
    taskId,
    creatorMembershipId,
    entries,
    forbiddenLiterals,
    thumbnailBytes
  } = input;
  const { objectStore, versionStore, events } = deps;
  const prior = await versionStore.getLatestAppVersion(appId);
  const priorAppVersion = prior ? { schemaFingerprint: prior.schemaFingerprint, migrations: prior.migrations } : null;
  let manifest;
  try {
    ({ manifest } = validateBundle(entries, { priorAppVersion, forbiddenLiterals }));
  } catch (err) {
    try {
      await events.emitAppEvent({
        type: APP_VERSION_SAVE_REJECTED,
        appId,
        taskId,
        data: { reason: err instanceof Error ? err.message : String(err) }
      });
    } catch {
    }
    throw err;
  }
  const bytes = writeBundleArchive(entries);
  const archiveSha256 = crypto$1.createHash("sha256").update(bytes).digest("hex");
  const archiveKey = `apps/${appId}/versions/${versionId}`;
  if (!await objectStore.exists(archiveKey)) {
    await objectStore.putImmutable(archiveKey, bytes);
  }
  let thumbnailKey;
  if (thumbnailBytes !== void 0) {
    thumbnailKey = appThumbnailKey(appId, versionId);
    if (!await objectStore.exists(thumbnailKey)) {
      await objectStore.putImmutable(thumbnailKey, thumbnailBytes);
    }
  }
  const record = {
    versionId,
    appId,
    taskId,
    creatorMembershipId,
    archiveKey,
    archiveSha256,
    ...thumbnailKey ? { thumbnailKey } : {},
    schemaFingerprint: manifest.schemaFingerprint,
    migrations: manifest.migrations,
    createdAt: /* @__PURE__ */ new Date()
  };
  return versionStore.insertAppVersion(record);
}

// src/registry.ts
async function writeAppRegistryRow(appHost2, mutate, store) {
  for (; ; ) {
    const current = await store.read(appHost2);
    const expectedRevision = current?.revision ?? null;
    const next = {
      ...mutate(current),
      app_host: appHost2,
      // writer owns the routing key — read-key always equals write-key
      revision: current === null ? 1 : current.revision + 1
    };
    const ok = await store.compareAndSwap(next, expectedRevision);
    if (ok) return next;
  }
}
var InMemoryAppRegistry = class {
  constructor() {
    this.rows = /* @__PURE__ */ new Map();
  }
  async read(appHost2) {
    return this.rows.get(appHost2) ?? null;
  }
  async compareAndSwap(nextRow, expectedRevision) {
    const stored = this.rows.get(nextRow.app_host);
    const storedRevision = stored?.revision ?? null;
    if (storedRevision !== expectedRevision) return false;
    this.rows.set(nextRow.app_host, { ...nextRow });
    return true;
  }
  async delete(appHost2) {
    this.rows.delete(appHost2);
  }
};
function createInMemoryRegistry() {
  return new InMemoryAppRegistry();
}
var ASSET_HASH_HEX_LENGTH = 32;
var enc3 = new TextEncoder();
function publishPath(archivePath) {
  const relative = archivePath.startsWith(ASSET_ROOT) ? archivePath.slice(ASSET_ROOT.length) : archivePath;
  return relative.startsWith("/") ? relative : `/${relative}`;
}
function buildAssetManifest(appId, assets) {
  const sorted = [...assets].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const entries = [];
  const out = {};
  for (const asset of sorted) {
    const bytes = typeof asset.content === "string" ? enc3.encode(asset.content) : asset.content;
    const hash = crypto$1.createHash("sha256").update(appId + "\0").update(bytes).digest("hex").slice(0, ASSET_HASH_HEX_LENGTH);
    const path = publishPath(asset.path);
    entries.push({ path, hash, bytes });
    out[path] = { hash, bytes };
  }
  return { entries, assets: out };
}

// src/deploy.ts
var enc4 = new TextEncoder();
var dec2 = new TextDecoder();
async function deployAppVersion(deps, input) {
  const version = await deps.versionStore.getAppVersion(input.versionId);
  if (!version || version.appId !== input.appId) throw new DeployFailedError("load-version");
  const current = await deps.registry.read(input.appHost);
  if (current?.deployed_version_id === input.versionId) {
    return { status: "noop", liveSlot: current.live_slot };
  }
  const slot = current ? stagingSlot(current.live_slot) : INITIAL_SLOT;
  let script;
  let assetUploads;
  let declaresDb = false;
  let declaresBucket = false;
  let runtime;
  let migrations = [];
  try {
    const archiveBytes = await deps.objectStore.get(version.archiveKey);
    const entries = readBundleArchive(archiveBytes);
    const worker = entries.find((e) => e.path === WORKER_ENTRY);
    if (!worker) throw new Error(`archive missing ${WORKER_ENTRY}`);
    script = typeof worker.content === "string" ? enc4.encode(worker.content) : worker.content;
    const assets = entries.filter((e) => e.path.startsWith(ASSET_ROOT));
    assetUploads = buildAssetManifest(input.appId, assets).assets;
    const manifestEntry = entries.find((e) => isManifestPath(e.path));
    if (manifestEntry) {
      const raw = typeof manifestEntry.content === "string" ? manifestEntry.content : dec2.decode(manifestEntry.content);
      const manifest = parseManifest(JSON.parse(raw));
      declaresDb = Boolean(manifest.database?.schema);
      declaresBucket = manifest.bucket === true;
      runtime = manifest.runtime;
      const migDec = new TextDecoder("utf-8", { fatal: true });
      const sqlByHash = /* @__PURE__ */ new Map();
      for (const e of entries.filter((e2) => e2.path.startsWith(MIGRATIONS_DIR))) {
        const content = typeof e.content === "string" ? e.content : migDec.decode(e.content);
        sqlByHash.set(hashMigration(content), content);
      }
      if (manifest.migrations.length && !manifest.database?.schema)
        throw new Error("migrations declared without a database");
      migrations = [...manifest.migrations].sort((a, b) => a.ordinal - b.ordinal).map((m) => {
        const sql = sqlByHash.get(m.hash);
        if (sql === void 0)
          throw new Error(`migration ${m.ordinal} has no file matching its hash`);
        return { ordinal: m.ordinal, sql, hash: m.hash };
      });
    }
  } catch (err) {
    throw new DeployFailedError("load-archive", { cause: err });
  }
  let databaseId;
  if (declaresDb) {
    let app;
    try {
      app = await deps.appStore.findApp(input.appId);
    } catch (err) {
      throw new DeployFailedError("load-app", { cause: err });
    }
    if (!app) throw new DeployFailedError("load-app");
    if (app.databaseId) {
      databaseId = app.databaseId;
    } else {
      let provisionedId;
      try {
        ({ databaseId: provisionedId } = await deps.provider.provisionDatabase({
          appId: input.appId,
          organizationId: app.orgId
        }));
      } catch (err) {
        throw new DeployFailedError("provision-database", { cause: err });
      }
      try {
        await deps.appStore.setAppDatabaseId(input.appId, provisionedId);
      } catch (err) {
        throw new DeployFailedError("persist-database-id", { cause: err });
      }
      databaseId = provisionedId;
    }
  }
  if (declaresBucket) {
    try {
      await deps.provider.provisionBucket({ appId: input.appId });
    } catch (err) {
      throw new DeployFailedError("provision-bucket", { cause: err });
    }
  }
  let outstanding = migrations;
  if (declaresDb && migrations.length > 0) {
    let ledger;
    try {
      ledger = await deps.provider.readMigrationLedger({ databaseId });
    } catch (err) {
      throw new DeployFailedError("read-migration-ledger", { cause: err });
    }
    const byOrdinal = new Map(ledger.map((e) => [e.ordinal, e]));
    outstanding = [];
    for (const m of migrations) {
      const recorded = byOrdinal.get(m.ordinal);
      if (!recorded) {
        outstanding.push(m);
        continue;
      }
      if (recorded.status === "applying") {
        throw new DeployFailedError("migration-interrupted", {
          cause: new Error(
            `migration ${m.ordinal} was interrupted while being applied; its outcome is unknown. Inspect the App Database, then either complete it and set the ledger row to 'applied', or delete the row if nothing landed.`
          )
        });
      }
      if (recorded.hash !== m.hash) {
        throw new DeployFailedError("migration-hash-mismatch", {
          cause: new Error(
            `migration ${m.ordinal} was applied with hash ${recorded.hash} but this bundle declares ${m.hash}; a migration is immutable once applied \u2014 add a new one`
          )
        });
      }
    }
  }
  let sessionId;
  try {
    const result = await deps.provider.openUploadSession({ appId: input.appId, slot });
    sessionId = result.sessionId;
  } catch (err) {
    throw new DeployFailedError("open-session", { cause: err });
  }
  try {
    await deps.provider.uploadAssets({ sessionId, assets: assetUploads });
  } catch (err) {
    throw new DeployFailedError("upload-assets", { cause: err });
  }
  const bindings = [
    ...declaresDb ? [{ type: "d1", name: "DB", id: databaseId }] : [],
    ...declaresBucket ? [{ type: "r2_bucket", name: "BUCKET", bucketName: `app-${input.appId}` }] : []
  ];
  try {
    await deps.provider.uploadScript({
      sessionId,
      slot,
      script,
      disableDirectSubdomain: true,
      // AD-11: asserted by ports.source.test.ts and deploy.test.ts
      bindings,
      ...runtime !== void 0 ? { runtime } : {}
    });
  } catch (err) {
    throw new DeployFailedError("upload-script", { cause: err });
  }
  for (const m of outstanding) {
    try {
      await deps.provider.applyMigration({ databaseId, ...m });
    } catch (err) {
      throw new DeployFailedError("apply-migrations", { cause: err });
    }
  }
  let healthy = false;
  let cause;
  try {
    const probeSignature = await signProbe(deps.probeSecret, input.appHost, slot, input.appId);
    const probe = await deps.provider.probeHealth({
      slot,
      probeSignature,
      appHost: input.appHost,
      appId: input.appId
    });
    healthy = probe.ok;
    if (!probe.ok && probe.detail) cause = new Error(probe.detail);
  } catch (err) {
    cause = err;
  }
  if (!healthy) {
    try {
      await deps.events.emitAppEvent({
        type: APP_DEPLOY_HEALTH_CHECK_FAILED,
        appId: input.appId,
        taskId: version.taskId,
        data: { versionId: input.versionId, slot }
      });
    } catch {
    }
    throw new DeployFailedError("health-check", cause ? { cause } : void 0);
  }
  try {
    await writeAppRegistryRow(
      input.appHost,
      (c) => ({
        app_host: input.appHost,
        app_id: input.appId,
        live_slot: slot,
        is_public: c?.is_public ?? false,
        revocation_generation: c?.revocation_generation ?? 0,
        deployed_version_id: input.versionId
      }),
      deps.registry
    );
  } catch (err) {
    throw new DeployFailedError("write-registry", { cause: err });
  }
  try {
    await deps.events.emitAppEvent({
      type: APP_DEPLOYED,
      appId: input.appId,
      taskId: version.taskId,
      data: { versionId: input.versionId, liveSlot: slot, reachable: true }
    });
  } catch {
  }
  return { status: "deployed", liveSlot: slot };
}

// src/asset-content-type.ts
var CONTENT_TYPE_BY_EXTENSION = {
  html: "text/html",
  htm: "text/html",
  js: "text/javascript",
  mjs: "text/javascript",
  css: "text/css",
  json: "application/json",
  map: "application/json",
  webmanifest: "application/manifest+json",
  xml: "application/xml",
  txt: "text/plain",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  wasm: "application/wasm",
  mp4: "video/mp4",
  webm: "video/webm",
  pdf: "application/pdf"
};
function assetContentType(publishPath2) {
  const lastDot = publishPath2.lastIndexOf(".");
  const lastSlash = publishPath2.lastIndexOf("/");
  if (lastDot === -1 || lastDot < lastSlash) return "application/octet-stream";
  const ext = publishPath2.slice(lastDot + 1).toLowerCase();
  return CONTENT_TYPE_BY_EXTENSION[ext] ?? "application/octet-stream";
}

// src/destroy.ts
async function cleanupAndFinalize(deps, tombstone) {
  try {
    await deps.provider.deleteApp({
      appId: tombstone.appId,
      slots: ["a", "b"],
      ...tombstone.databaseId ? { databaseId: tombstone.databaseId } : {}
    });
  } catch (err) {
    throw new DestroyFailedError("delete-provider", { cause: err });
  }
  let versions;
  try {
    versions = await deps.versionStore.listAppVersions(tombstone.appId);
  } catch (err) {
    throw new DestroyFailedError("list-versions", { cause: err });
  }
  for (const version of versions) {
    try {
      await deps.objectStore.delete(version.archiveKey);
    } catch (err) {
      throw new DestroyFailedError("delete-archive", { cause: err });
    }
    if (version.thumbnailKey) {
      try {
        await deps.objectStore.delete(version.thumbnailKey);
      } catch (err) {
        throw new DestroyFailedError("delete-thumbnail", { cause: err });
      }
    }
  }
  try {
    await deps.versionStore.deleteAppVersions(tombstone.appId);
  } catch (err) {
    throw new DestroyFailedError("delete-version-records", { cause: err });
  }
  try {
    await deps.registry.delete(tombstone.appHost);
  } catch (err) {
    throw new DestroyFailedError("delete-registry", { cause: err });
  }
  try {
    await deps.authz.deleteAllForResource({ objectType: "app", objectId: tombstone.appId });
  } catch (err) {
    throw new DestroyFailedError("delete-authz", { cause: err });
  }
  try {
    await deps.appStore.deleteApp(tombstone.appId);
  } catch (err) {
    throw new DestroyFailedError("finalize", { cause: err });
  }
}
async function destroyApp(deps, input) {
  const record = await deps.appStore.findApp(input.appId);
  if (!record) return { status: "already-deleted" };
  const orgHostLabel = await deps.appStore.getOrgHostLabel(record.orgId) ?? "";
  const tombstone = {
    appId: record.appId,
    orgId: record.orgId,
    appSlug: record.appSlug,
    orgHostLabel,
    appHost: input.appHost,
    ...record.databaseId ? { databaseId: record.databaseId } : {}
  };
  await deps.appStore.tombstoneApp(input.appId, input.appHost);
  await cleanupAndFinalize(deps, tombstone);
  try {
    await deps.events.emitAppEvent({
      type: APP_DESTROYED,
      appId: input.appId,
      taskId: input.taskId,
      data: { appId: input.appId }
    });
  } catch {
  }
  return { status: "destroyed" };
}
async function reconcileAppTombstones(deps) {
  const tombstones = await deps.appStore.listTombstones();
  for (const tombstone of tombstones) {
    try {
      await cleanupAndFinalize(deps, tombstone);
    } catch {
    }
  }
}

// src/change-sharing.ts
var AppSharingChangeReplayBusyError = class extends Error {
  constructor() {
    super("App sharing change is already being replayed");
    this.name = "AppSharingChangeReplayBusyError";
  }
};
async function changeAppSharing(deps, input) {
  const target = { ...input, workspaceIds: [...input.workspaceIds].sort() };
  const canManage = await deps.authz.checkPermission({
    resource: { objectType: "app", objectId: target.appId },
    permission: "manage",
    subject: { objectType: "membership", objectId: target.membershipId }
  });
  if (!canManage) return { status: "refused", reason: "not-manager" };
  const pending = await deps.changes.getPending(target.appId);
  if (pending) {
    if (!sameTarget(pending, target)) {
      return { status: "refused", reason: "change-in-progress" };
    }
    let resumed2;
    try {
      resumed2 = await resumeAppSharingChange(deps, pending);
    } catch (error) {
      if (error instanceof AppSharingChangeReplayBusyError) {
        return { status: "refused", reason: "change-in-progress" };
      }
      throw error;
    }
    return resultFromRow(target.level, resumed2.row, resumed2.intent.narrowed);
  }
  if (target.level === SharingLevel.Organization) {
    const canManageOrganization = await deps.authz.checkPermission({
      resource: { objectType: "org", objectId: target.orgId },
      permission: "manage",
      subject: { objectType: "membership", objectId: target.membershipId }
    });
    if (!canManageOrganization) {
      return { status: "refused", reason: "organization-admin-required" };
    }
  }
  const current = await deps.registry.read(target.appHost);
  if (!current) return { status: "refused", reason: "not-deployed" };
  if (current.app_id !== target.appId) return { status: "refused", reason: "app-mismatch" };
  const requested = {
    ...target,
    changeId: crypto.randomUUID(),
    prepared: false
  };
  const intended = await deps.changes.begin(requested);
  if (!sameTarget(intended, requested)) {
    return { status: "refused", reason: "change-in-progress" };
  }
  let resumed;
  try {
    resumed = await resumeAppSharingChange(deps, intended);
  } catch (error) {
    if (error instanceof AppSharingChangeReplayBusyError) {
      return { status: "refused", reason: "change-in-progress" };
    }
    throw error;
  }
  return resultFromRow(target.level, resumed.row, resumed.intent.narrowed);
}
async function resumeAppSharingChange(deps, intent) {
  const ownerId = crypto.randomUUID();
  if (!await acquireReplay(deps.changes, intent, ownerId)) {
    throw new AppSharingChangeReplayBusyError();
  }
  let completed = false;
  try {
    const prepared = intent.prepared ? intent : await prepareAppSharingChange(deps, intent, ownerId);
    await renewReplay(deps.changes, prepared, ownerId);
    await reserveRegistryFence(deps.registry, prepared);
    await renewReplay(deps.changes, prepared, ownerId);
    await deps.authz.installSharingFence(sharingFence(prepared));
    let row;
    if (!prepared.narrowed) {
      await renewReplay(deps.changes, prepared, ownerId);
      await applyTargetRelations(deps.authz, prepared, sharingFence(prepared));
      await renewReplay(deps.changes, prepared, ownerId);
      row = await writeTargetRegistryRow(deps.registry, prepared);
    } else {
      const resource = { objectType: "app", objectId: prepared.appId };
      await renewReplay(deps.changes, prepared, ownerId);
      await deps.authz.writeRelationshipUpdates(
        [
          {
            operation: "touch",
            relationship: {
              resource,
              relation: APP_RELATIONS.REVOKING,
              subject: { objectType: "membership", objectId: "*" }
            }
          }
        ],
        sharingFence(prepared)
      );
      await renewReplay(deps.changes, prepared, ownerId);
      row = await writeTargetRegistryRow(deps.registry, prepared);
      await renewReplay(deps.changes, prepared, ownerId);
      await applyTargetRelations(deps.authz, prepared, sharingFence(prepared));
    }
    await renewReplay(deps.changes, prepared, ownerId);
    completed = await deps.changes.complete(prepared.appId, prepared.changeId, ownerId);
    if (!completed) throw new AppSharingChangeReplayBusyError();
    return { row, intent: prepared };
  } finally {
    if (!completed) {
      try {
        await deps.changes.releaseReplay(intent.appId, intent.changeId, ownerId);
      } catch {
      }
    }
  }
}
async function prepareAppSharingChange(deps, claim, ownerId) {
  await renewReplay(deps.changes, claim, ownerId);
  const current = await deps.registry.read(claim.appHost);
  if (!current) throw new Error("app registry row deleted during sharing change preparation");
  if (current.app_id !== claim.appId) throw new Error("app registry row changed app identity");
  await renewReplay(deps.changes, claim, ownerId);
  const relationships = await deps.authz.listResourceRelationships({
    objectType: "app",
    objectId: claim.appId
  });
  const from = current.is_public ? SharingLevel.Public : deriveSharingLevel(relationships.map(({ relation }) => relation));
  const narrowed = isNarrowing(from, claim.level) || removesExistingWorkspaceTarget(from, claim, relationships);
  const candidate = {
    ...claim,
    prepared: true,
    targetGeneration: current.revocation_generation + 1,
    narrowed
  };
  await renewReplay(deps.changes, claim, ownerId);
  const prepared = await deps.changes.prepare(candidate, ownerId);
  if (prepared.changeId !== claim.changeId || !prepared.prepared) {
    throw new Error("App sharing change claim was replaced during preparation");
  }
  return prepared;
}
function removesExistingWorkspaceTarget(from, target, relationships) {
  if (from !== SharingLevel.Workspace || target.level !== SharingLevel.Workspace) return false;
  const targetIds = new Set(target.workspaceIds);
  return relationships.some(
    ({ relation, subject }) => (relation === APP_RELATIONS.WORKSPACE_VIEWER || relation === APP_RELATIONS.WORKSPACE_EDITOR) && subject.objectType === "workspace" && !targetIds.has(subject.objectId)
  );
}
async function acquireReplay(store, intent, ownerId) {
  const now = /* @__PURE__ */ new Date();
  return store.acquireReplay(
    intent.appId,
    intent.changeId,
    ownerId,
    now,
    new Date(now.getTime() + REPLAY_LEASE_MS)
  );
}
async function renewReplay(store, intent, ownerId) {
  const now = /* @__PURE__ */ new Date();
  const renewed = await store.renewReplay(
    intent.appId,
    intent.changeId,
    ownerId,
    now,
    new Date(now.getTime() + REPLAY_LEASE_MS)
  );
  if (!renewed) throw new AppSharingChangeReplayBusyError();
}
var APP_SHARING_REPLAY_LEASE_MS = 6e4;
var REPLAY_LEASE_MS = APP_SHARING_REPLAY_LEASE_MS;
async function writeTargetRegistryRow(registry, intent) {
  return writeAppRegistryRow(
    intent.appHost,
    (current) => {
      if (!current) throw new Error("app registry row deleted during sharing change");
      if (current.app_id !== intent.appId) throw new Error("app registry row changed app identity");
      if (current.revocation_generation !== intent.targetGeneration) {
        throw new Error("App sharing generation fence rejected a stale registry write");
      }
      return {
        ...current,
        is_public: intent.level === SharingLevel.Public,
        revocation_generation: intent.targetGeneration
      };
    },
    registry
  );
}
async function reserveRegistryFence(registry, intent) {
  return writeAppRegistryRow(
    intent.appHost,
    (current) => {
      if (!current) throw new Error("app registry row deleted during sharing fence reservation");
      if (current.app_id !== intent.appId) throw new Error("app registry row changed app identity");
      if (current.revocation_generation > intent.targetGeneration) {
        throw new Error("App sharing generation fence rejected a stale reservation");
      }
      if (current.revocation_generation < intent.targetGeneration - 1) {
        throw new Error("App sharing generation fence is not contiguous");
      }
      return { ...current, revocation_generation: intent.targetGeneration };
    },
    registry
  );
}
function sharingFence(intent) {
  return {
    resource: { objectType: "app", objectId: intent.appId },
    generation: intent.targetGeneration
  };
}
async function applyTargetRelations(authz, input, fence) {
  const resource = { objectType: "app", objectId: input.appId };
  const targetTuples = sharingLevelTuples(input.level, input.orgId, input.workspaceIds);
  const targetKeys = new Set(
    targetTuples.map(
      ({ relation, subject }) => `${relation}\0${subject.objectType}\0${subject.objectId}`
    )
  );
  const existing = await authz.listResourceRelationships(resource);
  const revoking = {
    resource,
    relation: APP_RELATIONS.REVOKING,
    subject: { objectType: "membership", objectId: "*" }
  };
  const updates = [
    ...targetTuples.map((tuple) => ({
      operation: "touch",
      relationship: { resource, relation: tuple.relation, subject: tuple.subject }
    })),
    ...existing.filter(({ relation, subject }) => {
      const key = `${relation}\0${subject.objectType}\0${subject.objectId}`;
      return isAppSharingRelation(relation) && !targetKeys.has(key);
    }).map((relationship) => ({
      operation: "delete",
      relationship
    })),
    { operation: "delete", relationship: revoking }
  ];
  await authz.writeRelationshipUpdates(updates, fence);
}
function sameTarget(pending, input) {
  return pending.appId === input.appId && pending.appHost === input.appHost && pending.level === input.level && pending.orgId === input.orgId && pending.workspaceIds.length === input.workspaceIds.length && pending.workspaceIds.every((workspaceId, index) => workspaceId === input.workspaceIds[index]);
}
function resultFromRow(level, row, narrowed) {
  return {
    status: "ok",
    level,
    isPublic: row.is_public,
    revocationGeneration: row.revocation_generation,
    narrowed
  };
}

// src/migration-statements.ts
var MIGRATION_LEDGER_TABLE = "_mfg_migrations";
var MIGRATION_LEDGER_DDL = `CREATE TABLE IF NOT EXISTS ${MIGRATION_LEDGER_TABLE} (
  ordinal INTEGER PRIMARY KEY,
  hash TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  applied_at INTEGER
)`;
var STATEMENT_BREAKPOINT = "--> statement-breakpoint";
function splitMigrationStatements(sql) {
  return sql.split(STATEMENT_BREAKPOINT).map((part) => part.trim()).filter((part) => part.length > 0);
}

// src/cloudflare-provider.ts
var ProviderDeleteIncompleteError = class extends Error {
  constructor(remaining) {
    super(`delete reported success but these resources still exist: ${remaining.join(", ")}`);
    this.remaining = remaining;
    this.name = "ProviderDeleteIncompleteError";
  }
};
var CloudflareApiError = class extends Error {
  constructor(message, status, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.name = "CloudflareApiError";
  }
};
var _sessionCounter = 0;
function isNotFound(err) {
  if (!(err instanceof CloudflareApiError)) return false;
  if (err.status === 404) return true;
  const msg = err.message.toLowerCase();
  if (msg.includes("not found")) return true;
  return err.errors.some(
    (e) => e?.message?.toLowerCase().includes("not found")
  );
}
var R2_BUCKET_ALREADY_EXISTS = /* @__PURE__ */ new Set([10004, 10073]);
var R2_NOT_ENABLED = 10042;
function isR2Disabled(err) {
  if (!(err instanceof CloudflareApiError)) return false;
  return err.errors.some((e) => e?.code === R2_NOT_ENABLED);
}
function isAlreadyExists(err) {
  if (!(err instanceof CloudflareApiError)) return false;
  return err.errors.some(
    (e) => typeof e?.code === "number" && R2_BUCKET_ALREADY_EXISTS.has(e.code)
  );
}
var CloudflareProviderApi = class {
  constructor(config) {
    this.config = config;
    this.sessions = /* @__PURE__ */ new Map();
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }
  // -------------------------------------------------------------------------
  // HTTP core (ported from cloudflare-client.ts reference)
  // -------------------------------------------------------------------------
  async request(path, init = {}, bearerOverride) {
    const headers = {
      ...init.headers,
      Authorization: `Bearer ${bearerOverride ?? this.config.apiToken}`
    };
    if (typeof init.body === "string") {
      headers["Content-Type"] = "application/json";
    }
    const res = await this.fetchImpl(`${this.config.apiBase}${path}`, { ...init, headers });
    let body;
    try {
      body = await res.json();
    } catch {
      throw new CloudflareApiError(
        `Cloudflare API ${path} returned a non-JSON response`,
        res.status,
        []
      );
    }
    if (!res.ok || !body.success) {
      const detail = body.errors?.map((e) => `${e.code}: ${e.message}`).join("; ") || res.statusText;
      throw new CloudflareApiError(
        `Cloudflare API ${path} failed: ${detail}`,
        res.status,
        body.errors ?? []
      );
    }
    return body.result;
  }
  // -------------------------------------------------------------------------
  // Three-call asset flow (AD-9)
  // -------------------------------------------------------------------------
  openUploadSession(params) {
    assertOpenUploadSessionContract(params);
    const sessionId = `cf-${++_sessionCounter}-${Date.now()}`;
    this.sessions.set(sessionId, {
      slot: params.slot,
      scriptName: slotScriptName(params.appId, params.slot)
    });
    return Promise.resolve({ sessionId });
  }
  async uploadAssets(params) {
    const session = this.sessions.get(params.sessionId);
    if (!session) throw new Error(`Unknown sessionId: ${params.sessionId}`);
    assertUploadAssetsContract(params);
    const byContentHash = {};
    const manifest = {};
    for (const [path, { hash, bytes }] of Object.entries(params.assets)) {
      manifest[path] = { hash, size: bytes.length };
      byContentHash[hash] = { bytes, contentType: assetContentType(path) };
    }
    const scriptBase = `/accounts/${this.config.accountId}/workers/dispatch/namespaces/${this.config.dispatchNamespace}/scripts/${session.scriptName}`;
    const sessionRes = await this.request(
      `${scriptBase}/assets-upload-session`,
      { method: "POST", body: JSON.stringify({ manifest }) }
    );
    let completionToken = sessionRes.jwt;
    for (const bucket of sessionRes.buckets) {
      const form = new FormData();
      for (const hash of bucket) {
        const asset = byContentHash[hash];
        if (!asset) throw new Error(`Bucket requested hash ${hash} not in uploaded assets`);
        form.set(
          hash,
          new File([Buffer.from(asset.bytes).toString("base64")], hash, {
            type: asset.contentType
          })
        );
      }
      const uploadResult = await this.request(
        `/accounts/${this.config.accountId}/workers/assets/upload?base64=true`,
        { method: "POST", body: form },
        sessionRes.jwt
      );
      if (uploadResult?.jwt) completionToken = uploadResult.jwt;
    }
    session.completionToken = completionToken;
  }
  async uploadScript(params) {
    assertUploadScriptContract(params);
    const session = this.sessions.get(params.sessionId);
    if (!session) throw new Error(`Unknown sessionId: ${params.sessionId}`);
    if (params.slot !== session.slot) {
      throw new Error(
        `uploadScript slot '${params.slot}' does not match session slot '${session.slot}'`
      );
    }
    if (!session.completionToken) {
      throw new Error("uploadScript called before uploadAssets completed (no completion token)");
    }
    const cfDeclaredBindings = params.bindings.map(
      (b) => b.type === "d1" ? { type: "d1", name: b.name, database_id: b.id } : { type: "r2_bucket", name: b.name, bucket_name: b.bucketName }
    );
    const metadata = {
      main_module: "worker.mjs",
      compatibility_date: params.runtime?.compatibilityDate ?? this.config.compatibilityDate,
      ...params.runtime?.compatibilityFlags?.length ? { compatibility_flags: params.runtime.compatibilityFlags } : {},
      assets: {
        jwt: session.completionToken,
        config: { not_found_handling: "single-page-application" }
      },
      bindings: [{ type: "assets", name: "ASSETS" }, ...cfDeclaredBindings],
      keep_bindings: []
    };
    const form = new FormData();
    form.set("metadata", JSON.stringify(metadata));
    form.set(
      "worker.mjs",
      new File([new Uint8Array(params.script)], "worker.mjs", {
        type: "application/javascript+module"
      })
    );
    try {
      await this.request(
        `/accounts/${this.config.accountId}/workers/dispatch/namespaces/${this.config.dispatchNamespace}/scripts/${session.scriptName}`,
        { method: "PUT", body: form }
      );
    } finally {
      this.sessions.delete(params.sessionId);
    }
  }
  // -------------------------------------------------------------------------
  // D1 operations (AD-10, AD-15)
  // -------------------------------------------------------------------------
  async provisionDatabase(params) {
    assertProvisionDatabaseContract(params);
    const result = await this.request(
      `/accounts/${this.config.accountId}/d1/database`,
      { method: "POST", body: JSON.stringify({ name: `app-${params.appId}` }) }
    );
    if (!result?.uuid) {
      throw new CloudflareApiError(
        "provisionDatabase: provider response missing database uuid",
        0,
        []
      );
    }
    return { databaseId: result.uuid };
  }
  // -------------------------------------------------------------------------
  // R2 operations (AD-18, ADR-0027)
  // -------------------------------------------------------------------------
  /** Idempotently create the App's bucket. */
  async provisionBucket(params) {
    assertProvisionBucketContract(params);
    try {
      await this.request(`/accounts/${this.config.accountId}/r2/buckets`, {
        method: "POST",
        body: JSON.stringify({ name: `app-${params.appId}` })
      });
    } catch (err) {
      if (!isAlreadyExists(err)) throw err;
    }
  }
  /**
   * One D1 REST query. Every ledger and migration statement goes through here.
   *
   * The return type drops the per-statement `success`/`meta`/`errors` deliberately; it is
   * not a check waiting to be restored. A `/query` failure is reported at the *envelope*,
   * with an empty `result` — observed against the real API, not inferred from docs:
   *
   *   SELECT * FROM a_table_that_does_not_exist;
   *   → {"result":[],"success":false,"errors":[{"code":7500,"message":"no such table: ..."}]}
   *
   *   SELECT 1 AS ok;
   *   → {"result":[{"results":[{"ok":1}],"success":true,"meta":{…}}],"success":true,"errors":[]}
   *
   * `request()` already throws on the first shape, so the nested `success` is reachable only
   * once the envelope succeeded — where it is always `true`. Callers send exactly one
   * statement per call (see splitMigrationStatements), so there is no multi-statement case
   * in which the envelope and a nested flag could disagree.
   */
  async d1Query(databaseId, sql, params = []) {
    return this.request(
      `/accounts/${this.config.accountId}/d1/database/${databaseId}/query`,
      { method: "POST", body: JSON.stringify({ sql, params }) }
    );
  }
  async readMigrationLedger(params) {
    assertReadMigrationLedgerContract(params);
    await this.d1Query(params.databaseId, MIGRATION_LEDGER_DDL);
    const result = await this.d1Query(
      params.databaseId,
      `SELECT ordinal, hash, status FROM ${MIGRATION_LEDGER_TABLE} ORDER BY ordinal`
    );
    const rows = result[0]?.results ?? [];
    return rows.map((row) => ({
      ordinal: Number(row.ordinal),
      hash: String(row.hash),
      // Any status that is not exactly 'applied' is treated as unfinished. Defaulting the
      // other way would let a row we cannot interpret read as a completed migration.
      status: row.status === "applied" ? "applied" : "applying"
    }));
  }
  async applyMigration(params) {
    assertApplyMigrationContract(params);
    const { databaseId, ordinal, hash, sql } = params;
    const now = Math.floor(Date.now() / 1e3);
    await this.d1Query(
      databaseId,
      `INSERT INTO ${MIGRATION_LEDGER_TABLE} (ordinal, hash, status, started_at) VALUES (?, ?, ?, ?)`,
      [ordinal, hash, "applying", now]
    );
    for (const statement of splitMigrationStatements(sql)) {
      await this.d1Query(databaseId, statement);
    }
    await this.d1Query(
      databaseId,
      `UPDATE ${MIGRATION_LEDGER_TABLE} SET status = ?, applied_at = ? WHERE ordinal = ?`,
      ["applied", Math.floor(Date.now() / 1e3), ordinal]
    );
  }
  // -------------------------------------------------------------------------
  // Delete (AD-18) — idempotent: 404 / not-found swallowed
  // -------------------------------------------------------------------------
  async deleteApp(params) {
    assertDeleteAppContract(params);
    for (const slot of params.slots) {
      const scriptName = slotScriptName(params.appId, slot);
      try {
        await this.request(
          `/accounts/${this.config.accountId}/workers/dispatch/namespaces/${this.config.dispatchNamespace}/scripts/${scriptName}?force=true`,
          { method: "DELETE" }
        );
      } catch (err) {
        if (!isNotFound(err)) throw err;
      }
    }
    if (params.databaseId) {
      try {
        await this.request(`/accounts/${this.config.accountId}/d1/database/${params.databaseId}`, {
          method: "DELETE"
        });
      } catch (err) {
        if (!isNotFound(err)) throw err;
      }
    }
    const bucketName = `app-${params.appId}`;
    let bucketMissing = false;
    let lifecycleSet = false;
    try {
      await this.request(`/accounts/${this.config.accountId}/r2/buckets/${bucketName}/lifecycle`, {
        method: "PUT",
        // maxAge is SECONDS (wrangler computes days * 86400 — a bare 1 would expire
        // objects after one second). conditions: {} is the all-objects form, and PUT
        // replaces the entire rules collection; these buckets are per-App and nothing
        // else manages their rules, so a single-element array is deliberate.
        body: JSON.stringify({
          rules: [
            {
              id: "mfg-destroy-expire",
              enabled: true,
              conditions: {},
              deleteObjectsTransition: { condition: { type: "Age", maxAge: 86400 } }
            }
          ]
        })
      });
      lifecycleSet = true;
    } catch (err) {
      if (isNotFound(err) || isR2Disabled(err)) bucketMissing = true;
    }
    let bucketRemains = false;
    if (!bucketMissing) {
      try {
        await this.request(`/accounts/${this.config.accountId}/r2/buckets/${bucketName}`, {
          method: "DELETE"
        });
      } catch (err) {
        if (!isNotFound(err) && !isR2Disabled(err)) bucketRemains = true;
      }
    }
    const remaining = [];
    const scripts = await this.listNamespaceScripts();
    for (const slot of params.slots) {
      const scriptName = slotScriptName(params.appId, slot);
      if (scripts.includes(scriptName)) remaining.push(`script ${scriptName}`);
    }
    if (params.databaseId && await this.databaseExists(params.databaseId)) {
      remaining.push(`database ${params.databaseId}`);
    }
    if (bucketRemains && !lifecycleSet) remaining.push(`bucket ${bucketName}`);
    if (remaining.length) throw new ProviderDeleteIncompleteError(remaining);
  }
  /** Whether a D1 database is still listed on the account. */
  async databaseExists(databaseId) {
    const databases = await this.request(
      `/accounts/${this.config.accountId}/d1/database`
    );
    return (databases ?? []).some((d) => d.uuid === databaseId);
  }
  /**
   * Script names present in the dispatch namespace — the only absence proof the
   * provider offers. `/scripts/{name}` and `/scripts/{name}/bindings` both answer
   * 200 for a script that was successfully deleted, so a delete can only be
   * confirmed by the name dropping out of this listing.
   */
  async listNamespaceScripts() {
    const result = await this.request(
      `/accounts/${this.config.accountId}/workers/dispatch/namespaces/${this.config.dispatchNamespace}/scripts`
    );
    return (result ?? []).flatMap((s) => {
      const name = s.id ?? s.script_name;
      return name ? [name] : [];
    });
  }
  // -------------------------------------------------------------------------
  // Health probe (AD-15) — GETs the deployed edge, not the CF API base
  // -------------------------------------------------------------------------
  /**
   * Health-check the staging slot by sending a GET to the deployed edge
   * (`https://{appHost}/`) with the signed probe + App headers.
   * This goes through the real Cloudflare edge (not `this.request`), so
   * `fetchImpl` must resolve the external hostname, which it does in prod
   * (global fetch) and in tests (injected mock).
   */
  async probeHealth(params) {
    assertProbeHealthContract(params);
    const res = await this.fetchImpl(`https://${params.appHost}/`, {
      headers: {
        [PROBE_HEADER]: params.probeSignature,
        [PROBE_APP_HEADER]: params.appId
      },
      redirect: "manual",
      signal: AbortSignal.timeout(1e4)
    });
    if (res.ok) return { ok: true };
    let excerpt = "";
    try {
      excerpt = (await res.text()).slice(0, 300);
    } catch {
    }
    return {
      ok: false,
      detail: `probe GET https://${params.appHost}/ \u2192 ${res.status}${excerpt ? `: ${excerpt}` : " (no body)"}`
    };
  }
  // -------------------------------------------------------------------------
  // Bindings read-back — confirms the upload set the expected bindings
  // -------------------------------------------------------------------------
  /**
   * Reads back the bindings currently attached to the given App slot.
   * Used by the smoke ladder to assert `ASSETS` (+ `DB`/`BUCKET` when declared) are
   * present. Reverse-maps every type uploadScript emits — a one-way mapping would
   * pass offline and fail live, because the ladder reads bindings back from here.
   */
  async getScriptBindings(params) {
    const scriptName = slotScriptName(params.appId, params.slot);
    const result = await this.request(
      `/accounts/${this.config.accountId}/workers/dispatch/namespaces/${this.config.dispatchNamespace}/scripts/${scriptName}/bindings`
    );
    return (result ?? []).map((b) => ({
      type: b.type,
      name: b.name,
      ...b.database_id !== void 0 ? { id: b.database_id } : {},
      ...b.bucket_name !== void 0 ? { bucketName: b.bucket_name } : {}
    }));
  }
};

// src/base64url.ts
function base64urlEncode(buf) {
  let s = "";
  for (const b of buf) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function base64urlDecode(s) {
  const std = s.replace(/-/g, "+").replace(/_/g, "/");
  const rem = std.length % 4;
  const padded = rem === 0 ? std : std + "=".repeat(4 - rem);
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// src/handoff-token.ts
var HANDOFF_LABEL = "mfg-agent:apps-edge:handoff:v1";
var HANDOFF_TTL_SECONDS = 300;
var HANDOFF_QUERY_PARAM = "__mfg_handoff";
var HANDOFF_SKEW_SECONDS = 10;
var enc5 = new TextEncoder();
var dec3 = new TextDecoder();
var InMemoryBurnStore = class {
  constructor() {
    this.burned = /* @__PURE__ */ new Set();
  }
  async tryBurn(jti) {
    if (this.burned.has(jti)) return false;
    this.burned.add(jti);
    return true;
  }
};
async function deriveHandoffSubkey(secret) {
  const keyData = new Uint8Array(secret);
  const hkdfKey = await crypto.subtle.importKey("raw", keyData, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32),
      info: enc5.encode(HANDOFF_LABEL)
    },
    hkdfKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}
async function mintHandoffToken(secret, claims, now = Date.now() / 1e3) {
  const iat = Math.floor(now);
  const jtiBytes = crypto.getRandomValues(new Uint8Array(16));
  const payload = {
    app: claims.app,
    user: claims.user,
    host: claims.host,
    org: claims.org,
    workspace: claims.workspace,
    generation: claims.generation,
    iat,
    exp: iat + HANDOFF_TTL_SECONDS,
    jti: base64urlEncode(jtiBytes)
  };
  const key = await deriveHandoffSubkey(secret);
  const payloadB64 = base64urlEncode(
    enc5.encode(JSON.stringify(payload))
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc5.encode(payloadB64)
  );
  return `${payloadB64}.${base64urlEncode(new Uint8Array(sig))}`;
}
function peekHandoffUser(token) {
  try {
    const dot = token.indexOf(".");
    if (dot === -1) return null;
    const payloadB64 = token.slice(0, dot);
    if (!payloadB64) return null;
    const payload = JSON.parse(dec3.decode(base64urlDecode(payloadB64)));
    return typeof payload["user"] === "string" ? payload["user"] : null;
  } catch {
    return null;
  }
}
var HANDOFF_STORE_UNAVAILABLE = "store-unavailable";
async function verifyHandoffToken(secret, token, expected, burnStore, now = Date.now() / 1e3) {
  try {
    const dot = token.indexOf(".");
    if (dot === -1) return { ok: false, reason: "malformed" };
    const payloadB64 = token.slice(0, dot);
    const sigB64 = token.slice(dot + 1);
    if (!payloadB64 || !sigB64) return { ok: false, reason: "malformed" };
    const key = await deriveHandoffSubkey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlDecode(sigB64),
      enc5.encode(payloadB64)
    );
    if (!valid) return { ok: false, reason: "signature" };
    const payload = JSON.parse(dec3.decode(base64urlDecode(payloadB64)));
    if (typeof payload.exp !== "number" || typeof payload.iat !== "number" || typeof payload.jti !== "string" || !payload.jti || typeof payload.org !== "string" || !payload.org || typeof payload.workspace !== "string" || !payload.workspace || !Number.isInteger(payload.generation) || payload.generation < 0)
      return { ok: false, reason: "malformed" };
    if (now > payload.exp + HANDOFF_SKEW_SECONDS) return { ok: false, reason: "expired" };
    if (now < payload.iat - HANDOFF_SKEW_SECONDS) return { ok: false, reason: "future" };
    if (payload.app !== expected.app) return { ok: false, reason: "app-mismatch" };
    if (payload.user !== expected.user) return { ok: false, reason: "user-mismatch" };
    if (payload.host !== expected.host) return { ok: false, reason: "host-mismatch" };
    if (payload.generation !== expected.generation) {
      return { ok: false, reason: "generation-mismatch" };
    }
    let burned;
    try {
      burned = await burnStore.tryBurn(payload.jti);
    } catch {
      return { ok: false, reason: HANDOFF_STORE_UNAVAILABLE };
    }
    if (!burned) return { ok: false, reason: "replayed" };
    return {
      ok: true,
      claims: {
        app: payload.app,
        user: payload.user,
        host: payload.host,
        org: payload.org,
        workspace: payload.workspace,
        generation: payload.generation
      }
    };
  } catch {
    return { ok: false, reason: "parse-error" };
  }
}

// src/session-cookie.ts
var SESSION_LABEL = "mfg-agent:apps-edge:session:v1";
var SESSION_COOKIE_NAME = "__Host-mfg-session";
var SESSION_SOFT_TTL_SECONDS = 1800;
var SESSION_HARD_TTL_SECONDS = 28800;
var SESSION_SKEW_SECONDS = 60;
var enc6 = new TextEncoder();
var dec4 = new TextDecoder();
async function deriveSessionSubkey(secret) {
  const keyData = new Uint8Array(secret);
  const hkdfKey = await crypto.subtle.importKey("raw", keyData, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32),
      info: enc6.encode(SESSION_LABEL)
    },
    hkdfKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}
async function mintSessionCookie(secret, opts, now = Date.now() / 1e3) {
  const payload = {
    appHost: opts.appHost,
    user: opts.user,
    org: opts.org,
    workspace: opts.workspace,
    generation: opts.generation,
    iat: Math.floor(now)
  };
  const key = await deriveSessionSubkey(secret);
  const payloadB64 = base64urlEncode(
    enc6.encode(JSON.stringify(payload))
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc6.encode(payloadB64)
  );
  return `${payloadB64}.${base64urlEncode(new Uint8Array(sig))}`;
}
async function verifySessionCookie(secret, value, opts, now = Date.now() / 1e3) {
  try {
    const dot = value.indexOf(".");
    if (dot === -1) return { ok: false, reason: "malformed" };
    const payloadB64 = value.slice(0, dot);
    const sigB64 = value.slice(dot + 1);
    if (!payloadB64 || !sigB64) return { ok: false, reason: "malformed" };
    const key = await deriveSessionSubkey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlDecode(sigB64),
      enc6.encode(payloadB64)
    );
    if (!valid) return { ok: false, reason: "signature" };
    const payload = JSON.parse(dec4.decode(base64urlDecode(payloadB64)));
    if (typeof payload.appHost !== "string" || typeof payload.user !== "string" || typeof payload.org !== "string" || !payload.org || typeof payload.workspace !== "string" || !payload.workspace || typeof payload.iat !== "number" || typeof payload.generation !== "number")
      return { ok: false, reason: "malformed" };
    if (payload.appHost !== opts.appHost) return { ok: false, reason: "app-mismatch" };
    const age = now - payload.iat;
    if (age < -SESSION_SKEW_SECONDS) return { ok: false, reason: "future" };
    if (age > SESSION_HARD_TTL_SECONDS) return { ok: false, reason: "hard-expired" };
    return {
      ok: true,
      user: payload.user,
      org: payload.org,
      workspace: payload.workspace,
      generation: payload.generation,
      softExpired: age > SESSION_SOFT_TTL_SECONDS
    };
  } catch {
    return { ok: false, reason: "parse-error" };
  }
}
function buildSessionSetCookie(value, maxAgeSeconds) {
  if (/[;\r\n]/.test(value)) throw new Error("invalid cookie value");
  return `${SESSION_COOKIE_NAME}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}


























































































































//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
export { APP_ACCESS_REFUSED, APP_DEPLOYED, APP_DEPLOY_HEALTH_CHECK_FAILED, APP_DESTROYED, APP_OBJECT_STORAGE_PREFIX, APP_RELATIONS, APP_SHARING_REPLAY_LEASE_MS, APP_VERSION_SAVE_REJECTED, ASSET_HASH_HEX_LENGTH, ASSET_ROOT, AppSharingChangeReplayBusyError, ArchiveImmutabilityError, ArchiveNotFoundError, BINDING_PATH, CloudflareApiError, CloudflareProviderApi, DeployFailedError, DestroyFailedError, DisallowedBundleError, FakeCallController, HANDOFF_LABEL, HANDOFF_QUERY_PARAM, HANDOFF_SKEW_SECONDS, HANDOFF_STORE_UNAVAILABLE, HANDOFF_TTL_SECONDS, HOST_LABEL_SEPARATOR, HOST_SUFFIX_LENGTH, INITIAL_SLOT, InMemoryAppEventSink, InMemoryAppRegistrationStore, InMemoryAppRegistry, InMemoryAppVersionStore, InMemoryBurnStore, InvalidHostLabelError, MANIFEST_PATH, MAX_APP_SLUG_LENGTH, MAX_HOST_LABEL_LENGTH, MAX_ORG_NAME_SLUG_LENGTH, MIGRATIONS_DIR, MIGRATION_LEDGER_DDL, MIGRATION_LEDGER_TABLE, MIGRATION_META_DIR, MalformedBundleError, MigrationRewrittenError, MissingMigrationError, PROBE_APP_HEADER, PROBE_HEADER, PROBE_LABEL, ProviderContractError, ProviderDeleteIncompleteError, RESERVED_HOST_LABELS, SESSION_COOKIE_NAME, SESSION_HARD_TTL_SECONDS, SESSION_LABEL, SESSION_SKEW_SECONDS, SESSION_SOFT_TTL_SECONDS, SOURCE_META_JOURNAL, SOURCE_ROOT, SharingLevel, SlugCollisionError, VIEWER_HEADER_PREFIX, VIEWER_ID_HEADER, VIEWER_ORG_HEADER, VIEWER_WORKSPACE_HEADER, WORKER_ENTRY, appHost, appStorageObjectKey, appThumbnailKey, assertApplyMigrationContract, assertDeleteAppContract, assertOpenUploadSessionContract, assertProbeHealthContract, assertProvisionBucketContract, assertProvisionDatabaseContract, assertReadMigrationLedgerContract, assertUploadAssetsContract, assertUploadScriptContract, assetContentType, base64urlDecode, base64urlEncode, buildAssetManifest, buildSessionSetCookie, changeAppSharing, computeSchemaFingerprint, createInMemoryAuthorization, createInMemoryObjectStore, createInMemoryProviderApi, createInMemoryRegistry, deployAppVersion, deriveAppSlug, deriveOrgHostLabel, deriveProbeSubkey, deriveSharingLevel, destroyApp, hashMigration, isAppSharingRelation, isManifestPath, isNarrowing, isValidHostLabel, mintHandoffToken, mintSessionCookie, parseManifest, peekHandoffUser, publishPath, randomHostSuffix, readBundleArchive, reconcileAppTombstones, resumeAppSharingChange, saveAppVersion, sharingLevelTuples, signProbe, slotScriptName, slugifyHostLabel, splitMigrationStatements, stagingSlot, validateBundle, verifyHandoffToken, verifyProbeSignature, verifySessionCookie, writeAppRegistryRow, writeBundleArchive };
