/**
 * Typed domain errors for bundle validation.
 *
 * Callers distinguish error kinds by instanceof: MalformedBundleError for
 * structural/parse problems, DisallowedBundleError for forbidden content,
 * MissingMigrationError for schema-fingerprint/migration-presence failures,
 * MigrationRewrittenError for a saved migration's content changing at the same ordinal.
 */
/** The bundle is structurally invalid: missing entrypoint, path escape, or unparseable manifest. */
declare class MalformedBundleError extends Error {
    constructor(message: string);
}
/** The bundle contains a forbidden literal (provider/db/bucket id, platform secret). */
declare class DisallowedBundleError extends Error {
    constructor(message: string);
}
/**
 * The bundle's schema fingerprint changed (or a database is declared on a
 * new app) without a corresponding new migration.
 */
declare class MissingMigrationError extends Error {
    constructor(message: string);
}
/**
 * An ordinal already saved on a prior App Version carries different content now.
 *
 * A migration's identity is its ordinal plus its content hash (AD-14), and the ledger
 * inside the App Database records what actually ran. Rewriting an ordinal after it has
 * run makes the two disagree permanently. Raised at save time so the agent hears it while
 * it can still add a new migration instead; the deploy-side ledger check is authoritative
 * but fires long after the agent's turn.
 */
declare class MigrationRewrittenError extends Error {
    constructor(message: string);
}
/**
 * A deploy step failed. `step` names the failed operation so callers can
 * retrieve the reason without parsing the message string (AC4).
 */
declare class DeployFailedError extends Error {
    readonly step: string;
    readonly cause?: unknown;
    constructor(step: string, options?: {
        cause?: unknown;
    });
}
/** A destroy step failed. `step` names the failed operation. */
declare class DestroyFailedError extends Error {
    readonly step: string;
    readonly cause?: unknown;
    constructor(step: string, options?: {
        cause?: unknown;
    });
}

declare const PROBE_LABEL = "mfg-agent:apps-edge:probe:v1";
/** HTTP header carrying the HMAC probe signature. */
declare const PROBE_HEADER = "X-Mfg-Probe";
/** HTTP header carrying the App identifier for probe routing. */
declare const PROBE_APP_HEADER = "X-Mfg-Probe-App";
/**
 * HKDF-SHA256 subkey under PROBE_LABEL.
 * The raw secret is never used to sign directly — only the derived subkey is.
 */
declare function deriveProbeSubkey(secret: Uint8Array): Promise<CryptoKey>;
/** Mint a probe signature bound to appHost, slot, and appId. */
declare function signProbe(secret: Uint8Array, appHost: string, slot: string, appId: string): Promise<string>;
/**
 * Verify a probe signature bound to appHost, slot, and appId.
 * Returns false on any failure — never throws.
 * A signature minted for a different host, slot, or appId will not verify.
 */
declare function verifyProbeSignature(secret: Uint8Array, appHost: string, slot: string, appId: string, signature: string): Promise<boolean>;

declare const SharingLevel: {
    readonly Private: "Private";
    readonly Workspace: "Workspace";
    readonly Organization: "Organization";
    readonly Public: "Public";
};
type SharingLevel = (typeof SharingLevel)[keyof typeof SharingLevel];
declare const APP_RELATIONS: {
    readonly PUBLIC: "public";
    readonly ORG: "org";
    readonly WORKSPACE_EDITOR: "workspace_editor";
    readonly WORKSPACE_VIEWER: "workspace_viewer";
    readonly REVOKING: "revoking";
};
declare function deriveSharingLevel(relations: Iterable<string>): SharingLevel;
/** Returns true iff changing from → to narrows the permitted set. */
declare function isNarrowing(from: SharingLevel, to: SharingLevel): boolean;
/** Maps a target sharing level to its complete set of SpiceDB grants. */
declare function sharingLevelTuples(level: SharingLevel, orgId: string, workspaceIds: string[]): {
    relation: string;
    subject: {
        objectType: string;
        objectId: string;
    };
}[];
/** True for relations owned by the replacement-style sharing transition. */
declare function isAppSharingRelation(relation: string): boolean;

/** Normative bundle-layout paths (AD-14). Import from this module only; never hard-code these elsewhere. */
/** Path to the bundle manifest within the bundle root. */
declare const MANIFEST_PATH = ".mfg/app.json";
/** Matches the canonical manifest path. */
declare function isManifestPath(path: string): boolean;
/** Required worker entrypoint path within the bundle. */
declare const WORKER_ENTRY = "dist/server/index.js";
/** Static asset root path prefix within the bundle. */
declare const ASSET_ROOT = "dist/client/";
/** Directory containing App Migrations within the bundle. */
declare const MIGRATIONS_DIR = ".mfg/migrations/";
/** Source-tree prefix within the bundle. Deploy ignores this prefix entirely. */
declare const SOURCE_ROOT = "source/";
/** Directory holding drizzle's own migration snapshots, within MIGRATIONS_DIR. */
declare const MIGRATION_META_DIR = ".mfg/migrations/meta/";
/**
 * The drizzle journal, as it appears in the bundle under SOURCE_ROOT.
 * `validateBundle` requires this entry when an App declares a database with
 * migrations: without the snapshots, a restored project cannot generate its
 * next migration.
 */
declare const SOURCE_META_JOURNAL = "source/.mfg/migrations/meta/_journal.json";
/**
 * Project-local marker binding a sandbox directory to an App. NOT a bundle path —
 * it is deliberately excluded from source capture, because a marker inside the
 * archive would be restored into every future copy of the App.
 *
 * Distinct from MANIFEST_PATH so unrelated schemas remain clear in stack traces.
 */
declare const BINDING_PATH = ".mfg/binding.json";

/**
 * Viewer Identity header vocabulary (AD-16).
 *
 * The dispatch Worker strips ALL headers whose lowercased name starts with
 * VIEWER_HEADER_PREFIX before injecting its own, on every request without
 * exception. The forwarded set is exactly three fields: user, Organization,
 * Workspace. Import these constants in every producer and consumer; never
 * define header names in two places.
 */
/** Lowercased prefix used to strip and inject Viewer Identity headers. */
declare const VIEWER_HEADER_PREFIX = "x-mfg-viewer-";
/** Viewer's platform user id. */
declare const VIEWER_ID_HEADER = "x-mfg-viewer-id";
/** Viewer's Organization id. */
declare const VIEWER_ORG_HEADER = "x-mfg-viewer-org";
/** Viewer's Workspace id (the App's own workspace). */
declare const VIEWER_WORKSPACE_HEADER = "x-mfg-viewer-workspace";

/** Ordered migration entry recorded in the manifest. Identity = ordinal + hash (AD-14). */
interface AppMigration {
    ordinal: number;
    hash: string;
}
/**
 * Logical App Database declaration. Contains only the schema entrypoint path(s) used to
 * compute the schemaFingerprint — no provider identifier, connection string, or
 * credential (AD-13a, AD-18). The fingerprint, not this field, is the audit artifact;
 * shipping the schema source as well would duplicate in every archive what the hash
 * already reduces.
 */
interface AppDatabaseDeclaration {
    /** Comma-separated project-relative schema entrypoint path(s). Non-empty = database declared. */
    schema: string;
}
/**
 * Runtime settings the App was *built* against, carried from the build's generated
 * wrangler config so the platform uploads the script under the same runtime the
 * bundler assumed. Omitting the flags deployed a Worker whose bundle imports node
 * builtins without `nodejs_compat`, which fails at compile with
 * `No such module "crypto"` — the App declared it, packaging read the file, and
 * the deploy invented its own settings instead.
 *
 * Optional: bundles built before this field existed fall back to the adapter's
 * injected compatibility date and no flags.
 */
interface AppRuntimeDeclaration {
    compatibilityDate: string;
    compatibilityFlags: string[];
}
/**
 * The bundle manifest (`MANIFEST_PATH`). No discriminator field (AD-19).
 *
 * Fields:
 * - schemaVersion  — manifest format version; currently "1".
 * - schemaFingerprint — SHA-256 of the concatenated, newline-normalized Drizzle
 *   schema module sources (see computeSchemaFingerprint).
 * - migrations — ordered list of App Migrations present in this bundle.
 * - database — present only when the App declares an App Database.
 * - bucket — true only when the App declares object storage. Presence-only: the
 *   bucket is `app-{appId}`, derived by the control plane, so unlike `database`
 *   there is nothing further to declare (AD-18, AD-13a).
 * - runtime — compatibility settings the App was built against.
 */
interface Manifest {
    schemaVersion: string;
    schemaFingerprint: string;
    migrations: AppMigration[];
    database?: AppDatabaseDeclaration;
    bucket?: boolean;
    runtime?: AppRuntimeDeclaration;
}
/**
 * Parse and validate an unknown value as a Manifest.
 * Throws MalformedBundleError if the shape is invalid.
 */
declare function parseManifest(json: unknown): Manifest;

interface SchemaModule {
    path: string;
    source: string;
}
/**
 * Compute a deterministic SHA-256 fingerprint over a set of schema modules.
 *
 * Algorithm (AD-14):
 * 1. Sort modules by path (lexicographic, ascending).
 * 2. Normalize each source: replace `\r\n` and lone `\r` with `\n`.
 * 3. Concatenate the normalized sources in sorted order.
 * 4. SHA-256 the UTF-8 bytes; return lowercase hex.
 *
 * Order- and line-ending-insensitive: two calls with the same logical module
 * set but different orderings or line endings (CRLF, CR, LF) produce identical output.
 */
declare function computeSchemaFingerprint(modules: SchemaModule[]): string;
/**
 * Hash a single migration's SQL content.
 * Migration identity is ordinal + this hash (AD-14).
 */
declare function hashMigration(sql: string): string;

interface BundleEntry {
    path: string;
    content: string | Uint8Array;
}
interface PriorAppVersion {
    schemaFingerprint: string;
    migrations: AppMigration[];
}
interface ValidationContext {
    /** Prior saved App Version, if one exists. Null for a brand-new App. */
    priorAppVersion: PriorAppVersion | null;
    /**
     * Platform-owned values that must not appear byte-exactly in any bundle file:
     * provider account ids, database ids, bucket names, secret values.
     * The check is a byte-exact substring scan — no entropy heuristic (AD-13, AD-13a).
     */
    forbiddenLiterals: string[];
}
interface ValidationResult {
    manifest: Manifest;
}
/**
 * Validate an App Bundle. Pure: no filesystem, archive, or network access.
 *
 * Throws:
 * - MalformedBundleError  — structural problem (missing entrypoint, path escape, bad manifest).
 * - DisallowedBundleError — forbidden literal found in a bundle file.
 * - MigrationRewrittenError — a previously saved migration's ordinal now carries a different hash.
 * - MissingMigrationError — schema fingerprint changed (or initial database declared) without a new migration.
 * - MalformedBundleError — bundle carries no entries under SOURCE_ROOT.
 * - MalformedBundleError — an App declares a database with migrations but SOURCE_META_JOURNAL is absent.
 *
 * Returns ValidationResult (with the parsed Manifest) on success.
 */
declare function validateBundle(entries: BundleEntry[], context: ValidationContext): ValidationResult;

/**
 * Serialize bundle entries to a deterministic MFGPACK binary archive.
 *
 * Format: magic(4) | version(1) | entry_count(uint32 BE) |
 *         for each entry: path_len(uint32 BE) | path(UTF-8) | content_len(uint32 BE) | content(bytes)
 *
 * Entries are sorted by path before framing (determinism). Content is stored as raw bytes (binary-safe).
 */
declare function writeBundleArchive(entries: BundleEntry[]): Uint8Array;
/**
 * Deserialize a MFGPACK archive produced by writeBundleArchive.
 * Content is returned as Uint8Array (binary-safe; callers decode as needed).
 *
 * Throws MalformedBundleError on:
 * - bad or missing magic bytes
 * - unsupported version byte
 * - truncated data at any point in the stream
 */
declare function readBundleArchive(bytes: Uint8Array): BundleEntry[];

declare const RESERVED_HOST_LABELS: Set<string>;
declare const MAX_HOST_LABEL_LENGTH = 63;
declare const MAX_ORG_NAME_SLUG_LENGTH = 24;
declare const HOST_SUFFIX_LENGTH = 4;
/**
 * Separator joining the App Slug and the Organization Host Label into ONE DNS label.
 * `--` is unambiguous by construction: slugifyHostLabel collapses non-alphanumeric runs to a
 * single hyphen and isValidHostLabel rejects `--`, so neither side can ever contain it.
 */
declare const HOST_LABEL_SEPARATOR = "--";
/**
 * The composed host is `{slug}--{orgHostLabel}.{servingDomain}` — one DNS label, because
 * Cloudflare Universal SSL only covers a single wildcard level (`*.{servingDomain}`); a
 * nested `{slug}.{orgHostLabel}.{domain}` fails the TLS handshake before any Worker runs.
 * 63 - 2 - 29 = 32 chars available for the App Slug.
 */
declare const MAX_APP_SLUG_LENGTH: number;
declare class InvalidHostLabelError extends Error {
    constructor(message: string);
}
/**
 * Returns true only for a valid DNS label: lowercase [a-z0-9], single interior hyphens,
 * ≥1 char, ≤63 chars, and not in the reserved set.
 * Total function — never throws.
 */
declare function isValidHostLabel(label: string): boolean;
/**
 * Converts an arbitrary name to a candidate DNS label: lowercase, non-alphanumeric runs
 * collapsed to a single hyphen, leading/trailing hyphens stripped.
 */
declare function slugifyHostLabel(name: string): string;
/**
 * Generates a 4-character random suffix from [a-z0-9]. Inject a deterministic replacement
 * in tests via the `randomSuffix` parameter of deriveAppSlug/deriveOrgHostLabel.
 */
declare function randomHostSuffix(): string;
/**
 * Derives an App Slug that is free according to `isTaken`.
 * Order: base → base-2 … base-9 → base-{randomSuffix()}.
 * The base is truncated to MAX_BASE_FOR_SUFFIX so all variants fit ≤63 chars.
 * Throws InvalidHostLabelError if all bounded candidates are taken.
 */
declare function deriveAppSlug(name: string, isTaken: (slug: string) => boolean, randomSuffix: () => string): string;
/**
 * Derives the Organization Host Label: slugified name truncated to MAX_ORG_NAME_SLUG_LENGTH,
 * then "-{suffix}". Unique by construction — no collision loop.
 * Trailing hyphens from truncation are stripped to prevent "--".
 */
declare function deriveOrgHostLabel(orgName: string, suffix: string): string;
/**
 * Composes the full app host: {appSlug}--{orgHostLabel}.{servingDomain} — a single DNS
 * label so the serving domain's one-level wildcard certificate covers it.
 * Parameter order matches the output order left-to-right.
 * The serving domain is always a parameter — no domain literal in this module.
 * Throws when the composed label exceeds 63 chars, which derivation prevents but a
 * hand-written or legacy org label could not.
 */
declare function appHost(appSlug: string, orgHostLabel: string, servingDomain: string): string;

/**
 * Shared failure-injection and call-recording controller for in-memory port fakes.
 *
 * The single home of "fail any individual call" (AD-12). Every fake method
 * calls gate() so no fake can silently bypass the failure seam.
 */
declare class FakeCallController {
    private rules;
    private calls;
    /** Fail the next call to `method` with `error`, then return to normal. */
    failNext(method: string, error: Error): void;
    /** Fail every call to `method` with `error` until reset(). */
    failAll(method: string, error: Error): void;
    /**
     * Return `value` for the next call to `method` instead of the fake's default.
     * Distinct from failNext: the call does not throw — it returns the canned value.
     */
    setResult(method: string, value: unknown): void;
    /** Clear all queued failure rules and recorded calls. */
    reset(): void;
    /** Returns every recorded call to `method` in order. */
    callsTo(method: string): {
        method: string;
        args: unknown[];
    }[];
    /**
     * Route a fake method call through the failure-injection and recording gate.
     * Records the call first, then checks if a rule matches; if so, either throws
     * (error rule) or returns the canned value (result rule), consuming once-rules
     * exactly once. Otherwise delegates to `run`.
     */
    gate<T>(method: string, args: unknown[], run: () => T | Promise<T>): Promise<T>;
}

/**
 * Provider API port — the seam between the deploy/delete pipeline and the
 * Workers-for-Platforms provider. No base URL, endpoint, or credential lives
 * here; those are injected into the real adapter the consuming story builds.
 *
 * Operations seeded from AD-8 (script upload), AD-9 (asset staging — three
 * calls), AD-10 (D1 provision), AD-11 (direct-subdomain disable), AD-15
 * (health probe), AD-18 (delete). Payload shapes are coarse and are refined
 * by the story that first calls each operation.
 */

interface OpenUploadSessionParams {
    appId: string;
    slot: string;
}
interface OpenUploadSessionResult {
    sessionId: string;
}
interface UploadAssetsParams {
    sessionId: string;
    /**
     * Publish path → { hash, bytes }. The key is the path the asset is served at
     * (rooted with '/'), never the hash: the provider addresses assets by path.
     * The hash is the tenant-salted, 32-hex-char key from buildAssetManifest.
     */
    assets: Record<string, {
        hash: string;
        bytes: Uint8Array;
    }>;
}
/**
 * A single binding to attach to the uploaded script.
 * Only declared bindings appear here — ASSETS is always attached by the adapter.
 *
 * A two-member union, not a registry: a third type grows it by one arm and the
 * switches by one case, which is less code than the abstraction that would have
 * anticipated it.
 */
type AppScriptBinding = {
    type: 'd1';
    name: string;
    /** The D1 database UUID. */
    id: string;
} | {
    type: 'r2_bucket';
    name: string;
    /** The derived bucket name (`app-{appId}`) — R2 addresses buckets by name, not id. */
    bucketName: string;
};
/** AD-11: disableDirectSubdomain is an architecturally-fixed flag. */
interface UploadScriptParams {
    sessionId: string;
    slot: string;
    script: Uint8Array;
    disableDirectSubdomain: boolean;
    /** App's declared bindings (ASSETS is always added by the adapter). */
    bindings: AppScriptBinding[];
    /**
     * Compatibility settings the App was built against, from its bundle manifest.
     * Absent for bundles built before the manifest carried them — the adapter then
     * falls back to its injected date and no flags.
     */
    runtime?: {
        compatibilityDate: string;
        compatibilityFlags: string[];
    };
}
interface ProvisionDatabaseParams {
    appId: string;
    organizationId: string;
}
/**
 * The bucket name is derived (`app-{appId}`), so unlike provisionDatabase there is
 * no result to return and nothing to persist — the DW-24 crash window (provisioned
 * but not recorded) cannot arise.
 */
interface ProvisionBucketParams {
    appId: string;
}
interface ProvisionDatabaseResult {
    databaseId: string;
}
interface ApplyMigrationParams {
    databaseId: string;
    ordinal: number;
    sql: string;
    hash: string;
}
interface ReadMigrationLedgerParams {
    databaseId: string;
}
/**
 * One row of the platform-owned migration ledger inside an App Database (AD-14).
 *
 * `applying` means a deploy wrote the row and did not return to mark it applied — the
 * migration's outcome is unknown. It is never repaired automatically, because the
 * platform cannot know whether the SQL landed.
 */
interface MigrationLedgerEntry {
    ordinal: number;
    hash: string;
    status: 'applying' | 'applied';
}
interface ProbeHealthParams {
    slot: string;
    probeSignature: string;
    /** The deployed edge hostname — the probe GETs the app root over HTTPS. */
    appHost: string;
    /** The App identifier, sent under the Apps probe header. */
    appId: string;
}
interface ProbeHealthResult {
    ok: boolean;
    /**
     * Why the probe was unhealthy — status and a short body excerpt. Present only
     * when ok is false. Without it a health-check failure names no cause at all and
     * every diagnosis needs a re-run with instrumentation.
     */
    detail?: string;
}
interface DeleteAppParams {
    appId: string;
    slots: string[];
    databaseId?: string;
}
interface AppProviderApi {
    /** Step 1 of three-call asset flow — open an upload session (AD-9). */
    openUploadSession(params: OpenUploadSessionParams): Promise<OpenUploadSessionResult>;
    /** Step 2 of three-call asset flow — stage asset buckets in the session (AD-9). */
    uploadAssets(params: UploadAssetsParams): Promise<void>;
    /**
     * Step 3 of three-call asset flow — upload script with completion token
     * (AD-8 commit point). Must disable direct provider-subdomain access (AD-11).
     */
    uploadScript(params: UploadScriptParams): Promise<void>;
    /** Provision a per-App D1 database tagged with the organization (AD-10). */
    provisionDatabase(params: ProvisionDatabaseParams): Promise<ProvisionDatabaseResult>;
    /**
     * Idempotently create the App's derived bucket `app-{appId}` (AD-18). Swallows
     * only the provider's already-exists answer; every other failure propagates.
     */
    provisionBucket(params: ProvisionBucketParams): Promise<void>;
    /** Apply one migration via the provider HTTP data API (AD-15). */
    applyMigration(params: ApplyMigrationParams): Promise<void>;
    /**
     * Read the platform-owned migration ledger (AD-14). Creates the ledger table if it does
     * not exist, so it is safe against a database provisioned before the ledger existed.
     */
    readMigrationLedger(params: ReadMigrationLedgerParams): Promise<MigrationLedgerEntry[]>;
    /** Health-check the staging slot with a signed probe (AD-15). */
    probeHealth(params: ProbeHealthParams): Promise<ProbeHealthResult>;
    /** Remove App resources: script slots, database, assets (AD-18). */
    deleteApp(params: DeleteAppParams): Promise<void>;
    /**
     * Read back the bindings currently attached to a script slot.
     * Used by the smoke ladder to confirm the upload set the correct bindings.
     */
    getScriptBindings(params: {
        appId: string;
        slot: string;
    }): Promise<Array<{
        type: string;
        name: string;
        id?: string;
        bucketName?: string;
    }>>;
}
declare function createInMemoryProviderApi(): {
    provider: AppProviderApi;
    controller: FakeCallController;
};

/**
 * Provider payload contracts — Story DW-60.
 *
 * One definition of "a payload the provider will accept", enforced by both the real
 * adapter and the in-memory fake. The fake used to gate each call and return a canned
 * value without inspecting a field, so a payload the account rejects outright passed
 * every unit test. Four defects reached a real account that way: a 64-char asset hash,
 * a hash used as the asset path, a completion token read as a string, and an upload
 * that dropped the compatibility flags the App was built with.
 *
 * These assertions encode only what the provider itself enforces, derived from the
 * request each adapter method actually issues. An assertion tighter than the provider
 * is its own defect — it would reject payloads the account accepts.
 */

declare class ProviderContractError extends Error {
    constructor(operation: string, detail: string);
}
declare function assertOpenUploadSessionContract(params: OpenUploadSessionParams): void;
declare function assertUploadAssetsContract(params: UploadAssetsParams): void;
declare function assertUploadScriptContract(params: UploadScriptParams): void;
declare function assertProvisionBucketContract(params: ProvisionBucketParams): void;
declare function assertProvisionDatabaseContract(params: ProvisionDatabaseParams): void;
declare function assertApplyMigrationContract(params: ApplyMigrationParams): void;
declare function assertReadMigrationLedgerContract(params: ReadMigrationLedgerParams): void;
declare function assertProbeHealthContract(params: ProbeHealthParams): void;
declare function assertDeleteAppContract(params: DeleteAppParams): void;

/**
 * Object-store port — the seam for immutable App Bundle archive storage (AD-9).
 *
 * The real adapter a later story builds can wrap IStorageClient from
 * @mfg-agent/storage; this module imports nothing from it.
 */

/** Physical object-store namespace retained for backward compatibility. */
declare const APP_OBJECT_STORAGE_PREFIX = "app-archives/";
/** Map an App's logical object key to its deployed physical storage key. */
declare const appStorageObjectKey: (logicalKey: string) => string;
/** Logical object-store key for an immutable App Version thumbnail. */
declare const appThumbnailKey: (appId: string, versionId: string) => string;
/** Thrown when putImmutable is called on a key that already exists (AD-9). */
declare class ArchiveImmutabilityError extends Error {
    constructor(key: string);
}
/** Thrown when get is called for a key that has not been stored. */
declare class ArchiveNotFoundError extends Error {
    constructor(key: string);
}
interface AppObjectStore {
    /**
     * Write `data` at `key`. Rejects with ArchiveImmutabilityError if `key`
     * already exists — archives are immutable (AD-9).
     */
    putImmutable(key: string, data: Uint8Array): Promise<void>;
    /**
     * Read the bytes stored at `key`. Rejects with ArchiveNotFoundError if
     * `key` has never been written.
     */
    get(key: string): Promise<Uint8Array>;
    /** Returns true if `key` has been written, false otherwise. */
    exists(key: string): Promise<boolean>;
    /** Remove the object at `key`. No-op if absent. */
    delete(key: string): Promise<void>;
}
declare function createInMemoryObjectStore(): {
    store: AppObjectStore;
    controller: FakeCallController;
};

/**
 * App authorization port — the seam between the deploy pipeline and SpiceDB
 * (AD-4, AD-20). Types mirror src/api/src/authorization/authorization.types.ts;
 * this module does NOT import from api.
 *
 * The in-memory fake uses direct-tuple matching only — full permission-graph
 * resolution belongs to the real gRPC adapter the consuming story builds.
 */

interface AuthzSubject {
    objectType: string;
    objectId: string;
}
interface AuthzRelationship {
    resource: {
        objectType: string;
        objectId: string;
    };
    relation: string;
    subject: AuthzSubject;
}
interface AuthzRelationshipUpdate {
    operation: 'touch' | 'delete';
    relationship: AuthzRelationship;
}
interface AppSharingFence {
    resource: {
        objectType: 'app';
        objectId: string;
    };
    generation: number;
}
interface AuthzCheck {
    resource: {
        objectType: string;
        objectId: string;
    };
    permission: string;
    subject: AuthzSubject;
}
interface AppAuthorizationPort {
    /** Write one or more subject→resource relationship tuples. */
    writeRelationships(relationships: AuthzRelationship[]): Promise<void>;
    /** Remove one or more subject→resource relationship tuples. */
    deleteRelationships(relationships: AuthzRelationship[]): Promise<void>;
    /** Apply TOUCH and DELETE operations atomically in one authorization transaction. */
    writeRelationshipUpdates(updates: AuthzRelationshipUpdate[], fence?: AppSharingFence): Promise<void>;
    /** Atomically replace the prior generation's sharing fence with this generation. */
    installSharingFence(fence: AppSharingFence): Promise<void>;
    /** Return true if the subject holds `permission` on the resource. */
    checkPermission(check: AuthzCheck): Promise<boolean>;
    /**
     * Return the IDs of all resources of `resourceType` where the subject
     * holds `permission`.
     */
    lookupResources(params: {
        resourceType: string;
        permission: string;
        subject: AuthzSubject;
    }): Promise<string[]>;
    /**
     * Remove all authorization tuples for the given resource (any relation,
     * any subject). Used by destroy to bulk-remove all app authz records.
     */
    deleteAllForResource(params: {
        objectType: string;
        objectId: string;
    }): Promise<void>;
    /**
     * Return ALL distinct relation names present on the resource — including
     * non-sharing relations (manage, owner, editor, viewer, …). Callers must
     * filter; `deriveSharingLevel` already ignores non-sharing relations and is
     * the canonical consumer of this output.
     */
    listResourceRelations(resource: {
        objectType: string;
        objectId: string;
    }): Promise<string[]>;
    /** Return every relationship tuple currently stored for the resource. */
    listResourceRelationships(resource: {
        objectType: string;
        objectId: string;
    }): Promise<AuthzRelationship[]>;
}
declare function createInMemoryAuthorization(): {
    authz: AppAuthorizationPort;
    controller: FakeCallController;
};

/**
 * AppRegistrationStore — the Mongo-facing seam for App lifecycle.
 * Shared by api (AppsRepository) and worker (app activities) without importing either.
 */
interface AppRecord {
    appId: string;
    orgId: string;
    appSlug: string;
    appName: string;
    creatorMembershipId: string;
    workspaceId: string;
    /** Exact workspace sharing projection; absent on legacy records. */
    sharedWorkspaceIds?: string[];
    taskId: string;
    createdAt: Date;
    /** Set once when the bundle declares a database and the provider provisions it. */
    databaseId?: string;
    /**
     * Set when the App has been tombstoned and provider cleanup is running or pending.
     * `findApp` deliberately still returns these — destroy and deploy both need the record —
     * so any caller that acts on an App (publishing to it, restoring it) must check this
     * itself. `listAppsForCreator` already excludes them.
     */
    deletingSince?: Date;
}
interface CreateAppInput {
    appId: string;
    orgId: string;
    appSlug: string;
    appName: string;
    creatorMembershipId: string;
    workspaceId: string;
    taskId: string;
}
/**
 * Persisted marker for an App being destroyed. Holds the slug + org-host-label
 * reservation until all resources are confirmed gone and `deleteApp` finalizes.
 */
interface AppTombstone {
    appId: string;
    orgId: string;
    appSlug: string;
    orgHostLabel: string;
    appHost: string;
    databaseId?: string;
}
interface AppRegistrationStore {
    /** Returns the set of existing slugs for an org (used as the isTaken set). */
    listSlugs(orgId: string): Promise<string[]>;
    /** True if the slug is already taken in this org (best-effort pre-filter). */
    isSlugTaken(orgId: string, slug: string): Promise<boolean>;
    /**
     * Insert the app record. Throws SlugCollisionError on slug duplicate-key.
     * Idempotent: a retry with the same appId returns the existing record without throwing.
     */
    insertApp(record: CreateAppInput): Promise<AppRecord>;
    /** Delete the app record by appId. No-op if absent. */
    deleteApp(appId: string): Promise<void>;
    /** Return the current org host label, or null if not yet set. */
    getOrgHostLabel(orgId: string): Promise<string | null>;
    /**
     * Conditionally set the org host label only if none is currently set.
     * Returns true if THIS call set it; false if one was already set (race loser).
     */
    allocateOrgHostLabel(orgId: string, label: string): Promise<boolean>;
    /**
     * Release the org host label only if the stored value still equals `label`.
     * No-op if absent or if the stored value differs.
     */
    releaseOrgHostLabel(orgId: string, label: string): Promise<void>;
    /** Return the app record by appId, or null. */
    findApp(appId: string): Promise<AppRecord | null>;
    /**
     * Persist the provider-returned databaseId on the app record.
     * Set-if-unset: first write wins; a retry with the same id is a no-op.
     */
    setAppDatabaseId(appId: string, databaseId: string): Promise<void>;
    /**
     * Mark the app record as deleting (tombstone-first). Idempotent.
     * The record persists (keeping the slug reserved) until `deleteApp` finalizes.
     */
    tombstoneApp(appId: string, appHost: string): Promise<void>;
    /** Return all tombstoned apps (those marked deleting but not yet finalized). */
    listTombstones(): Promise<AppTombstone[]>;
}
/**
 * Creator-scoped App listing. Segregated from AppRegistrationStore because only the
 * worker's agent tools need it — the API's AppsRepository implements the lifecycle port
 * and has its own permission-scoped listing.
 */
interface AppCreatorLister {
    /**
     * Non-tombstoned Apps created by this membership in this org, newest first, capped at
     * `limit`. Ordered by createdAt descending, tie-broken by appId descending: there is no
     * `updated_at` on the App record, and this matches the API listing's `created_at: -1`.
     *
     * A non-positive `limit` returns no Apps. Implementations must not treat `0` as
     * "unlimited" — Mongo's own `.limit(0)` means exactly that, so it needs guarding.
     */
    listAppsForCreator(orgId: string, creatorMembershipId: string, limit: number): Promise<AppRecord[]>;
}
/** Thrown by insertApp when the slug is already taken (unique index violation). */
declare class SlugCollisionError extends Error {
    constructor(orgId: string, slug: string);
}
declare class InMemoryAppRegistrationStore implements AppRegistrationStore, AppCreatorLister {
    private apps;
    /** Map from `${orgId}:${slug}` → appId */
    private slugIndex;
    private orgLabels;
    private tombstoneData;
    listSlugs(orgId: string): Promise<string[]>;
    isSlugTaken(orgId: string, slug: string): Promise<boolean>;
    insertApp(input: CreateAppInput): Promise<AppRecord>;
    deleteApp(appId: string): Promise<void>;
    getOrgHostLabel(orgId: string): Promise<string | null>;
    allocateOrgHostLabel(orgId: string, label: string): Promise<boolean>;
    releaseOrgHostLabel(orgId: string, label: string): Promise<void>;
    findApp(appId: string): Promise<AppRecord | null>;
    setAppDatabaseId(appId: string, databaseId: string): Promise<void>;
    tombstoneApp(appId: string, appHost: string): Promise<void>;
    listAppsForCreator(orgId: string, creatorMembershipId: string, limit: number): Promise<AppRecord[]>;
    listTombstones(): Promise<AppTombstone[]>;
}

/** Domain record for a saved, immutable App Version snapshot. */
interface AppVersionRecord {
    versionId: string;
    appId: string;
    taskId: string;
    creatorMembershipId: string;
    archiveKey: string;
    archiveSha256: string;
    thumbnailKey?: string;
    schemaFingerprint: string;
    migrations: AppMigration[];
    createdAt: Date;
}
/** Input to saveAppVersion. versionId is minted by the caller so retries reuse the same id. */
interface SaveAppVersionInput {
    versionId: string;
    appId: string;
    taskId: string;
    creatorMembershipId: string;
    entries: BundleEntry[];
    forbiddenLiterals: string[];
    thumbnailBytes?: Uint8Array;
}
interface AppVersionStore {
    /**
     * Returns the most recently saved AppVersion for the app by createdAt, or null if none.
     * The latest version supplies the prior-schema context for validateBundle.
     */
    getLatestAppVersion(appId: string): Promise<AppVersionRecord | null>;
    /**
     * Returns a specific AppVersion by versionId, or null if not found.
     * Used by deploy (2.8) and rollback (2.14) to load a version by id.
     */
    getAppVersion(versionId: string): Promise<AppVersionRecord | null>;
    /**
     * Insert a AppVersion record. Idempotent on versionId: a retry with the same
     * versionId returns the ALREADY-STORED record unchanged (first write wins).
     * Returns the effective stored record so callers always reflect persisted state.
     */
    insertAppVersion(record: AppVersionRecord): Promise<AppVersionRecord>;
    /** Return all AppVersion records for an app. Empty if none. */
    listAppVersions(appId: string): Promise<AppVersionRecord[]>;
    /** Remove all AppVersion records for an app. No-op if none. */
    deleteAppVersions(appId: string): Promise<void>;
}
declare class InMemoryAppVersionStore implements AppVersionStore {
    private records;
    getLatestAppVersion(appId: string): Promise<AppVersionRecord | null>;
    getAppVersion(versionId: string): Promise<AppVersionRecord | null>;
    insertAppVersion(record: AppVersionRecord): Promise<AppVersionRecord>;
    listAppVersions(appId: string): Promise<AppVersionRecord[]>;
    deleteAppVersions(appId: string): Promise<void>;
}

declare const APP_VERSION_SAVE_REJECTED: "APP_VERSION_SAVE_REJECTED";
declare const APP_DEPLOY_HEALTH_CHECK_FAILED: "APP_DEPLOY_HEALTH_CHECK_FAILED";
declare const APP_DEPLOYED: "APP_DEPLOYED";
declare const APP_DESTROYED: "APP_DESTROYED";
declare const APP_ACCESS_REFUSED: "APP_ACCESS_REFUSED";
interface AppEvent {
    type: string;
    appId: string;
    /** Optional: absent on serving-plane events where no Task exists (NFR-7, e.g. APP_ACCESS_REFUSED). */
    taskId?: string;
    data: Record<string, unknown>;
}
interface AppEventSink {
    emitAppEvent(evt: AppEvent): Promise<void>;
}
/** In-memory fake — records emitted events for test assertions. */
declare class InMemoryAppEventSink implements AppEventSink {
    readonly emitted: AppEvent[];
    emitAppEvent(evt: AppEvent): Promise<void>;
}

interface SaveAppVersionDeps {
    objectStore: AppObjectStore;
    versionStore: AppVersionStore;
    events: AppEventSink;
}
/**
 * Save a validated App Version: validate → archive bytes → record provenance.
 *
 * versionId is supplied by the caller so Temporal retries reuse the same id.
 * Archive write is idempotent (skipped when key already exists).
 * insertAppVersion is idempotent on versionId.
 */
declare function saveAppVersion(input: SaveAppVersionInput, deps: SaveAppVersionDeps): Promise<AppVersionRecord>;

/**
 * App Registry seam — the D1-facing port for the routing store (Epic 2, Story 2.6).
 *
 * One writer (`writeAppRegistryRow`), one fixed row shape, CAS on `revision`.
 * The real D1 adapter binds at Story 2.7/2.8; this module is the domain seam
 * + in-memory fake, exercisable without credentials.
 */
type AppSlot = 'a' | 'b';
/**
 * Exactly seven fields — no more, no less. A registry.source.test.ts asserts this.
 */
interface AppRegistryRow {
    app_host: string;
    app_id: string;
    live_slot: AppSlot;
    is_public: boolean;
    revocation_generation: number;
    deployed_version_id: string;
    revision: number;
}
interface AppRegistryStore {
    read(appHost: string): Promise<AppRegistryRow | null>;
    /**
     * Apply `nextRow` only if the stored revision matches `expectedRevision`
     * (`null` means no row exists yet). Returns true on success, false on mismatch.
     */
    compareAndSwap(nextRow: AppRegistryRow, expectedRevision: number | null): Promise<boolean>;
    /** Remove the registry row for `appHost`. No-op if absent. */
    delete(appHost: string): Promise<void>;
}
/**
 * Read → mutate → set revision → compareAndSwap, retrying until committed.
 *
 * `mutate` receives the current row (or null) and returns all six fields
 * except `revision`. The writer owns `revision`: first write → 1, every
 * subsequent write → current.revision + 1.
 *
 * A losing CAS re-reads and retries — no write is ever lost.
 */
declare function writeAppRegistryRow(appHost: string, mutate: (current: AppRegistryRow | null) => Omit<AppRegistryRow, 'revision'>, store: AppRegistryStore): Promise<AppRegistryRow>;
declare class InMemoryAppRegistry implements AppRegistryStore {
    private rows;
    read(appHost: string): Promise<AppRegistryRow | null>;
    compareAndSwap(nextRow: AppRegistryRow, expectedRevision: number | null): Promise<boolean>;
    delete(appHost: string): Promise<void>;
}
declare function createInMemoryRegistry(): InMemoryAppRegistry;

/**
 * The slot used for the very first deploy of an App — before any registry
 * row exists. The probe signature and the edge's verification must agree on
 * this value so a first deploy (no row) still passes the health check.
 * Exported here (not from deploy.ts) so the edge can import it without
 * pulling in the deploy domain's heavy dependencies.
 */
declare const INITIAL_SLOT: AppSlot;
/**
 * Returns the staging slot opposite to the given live slot.
 * 'a' ↔ 'b'. Shared naming contract between the dispatch worker (2.7)
 * and the uploader (2.8).
 */
declare function stagingSlot(live: AppSlot): AppSlot;
/**
 * Derives the script name for a given app + slot combination.
 * Shared between dispatch worker (reads) and uploader (writes) so
 * they address the same script slot.
 */
declare function slotScriptName(appId: string, slot: AppSlot): string;

/**
 * Deploy domain orchestrator — Stories 2.8 / 2.9 / 2.10 / 2.11.
 *
 * Pure function over injected ports; no credentials, no HTTP, no Mongo.
 * Upload target is stagingSlot(live) (or INITIAL_SLOT on first deploy).
 *
 * Pipeline (ordering is a contract — AD-15):
 *   Step 1: openUploadSession  — open staging slot
 *   Step 2: uploadAssets       — stage assets by publish path, tenant-salted hashes
 *   Step 3: uploadScript       — commit point (worker-entry bytes only)
 *   Step 4: applyMigration × N — apply declared migrations in ordinal order
 *   Step 5: probeHealth        — health-check the staging slot with a signed probe
 *
 * The sole traffic-moving commit is the writeAppRegistryRow CAS flip at
 * the end — any earlier failure leaves the live slot untouched.
 */

interface DeployAppVersionDeps {
    provider: AppProviderApi;
    registry: AppRegistryStore;
    objectStore: AppObjectStore;
    versionStore: AppVersionStore;
    appStore: AppRegistrationStore;
    events: AppEventSink;
    probeSecret: Uint8Array;
}
interface DeployAppVersionInput {
    appId: string;
    appHost: string;
    versionId: string;
}
type DeployAppVersionResult = {
    status: 'deployed';
    liveSlot: AppSlot;
} | {
    status: 'noop';
    liveSlot: AppSlot;
};
declare function deployAppVersion(deps: DeployAppVersionDeps, input: DeployAppVersionInput): Promise<DeployAppVersionResult>;

/**
 * Publish-path → MIME type for uploaded App assets.
 *
 * The provider stores the content type declared on each uploaded part; parts sent
 * without one are served back with no `content-type` header at all. A browser will
 * not execute a module script or apply a stylesheet in that state, so the App
 * renders blank while every status code is 200 — a failure no status check catches.
 *
 * ponytail: a table, not a mime database. @mfg-agent/apps carries no runtime
 * dependencies because it is vendored into the sandbox and must `npm ci` standalone
 * (ADR-0025). Ceiling: extensions a built SPA emits. Add a row when an App ships a
 * type not listed; swap in `mime-types` only if that list stops being enumerable.
 */
/**
 * The type an asset should be served as, from its publish path's extension.
 * Falls back to `application/octet-stream` — a wrong-but-declared type is still
 * better than none, which is what makes a served asset unusable.
 */
declare function assetContentType(publishPath: string): string;

/**
 * Asset manifest builder — Story 2.9.
 *
 * Computes per-tenant salted hashes so two Apps with identical file bytes
 * never share a storage key (AD-9). Single builder; a *.source.test.ts
 * asserts the salt is present in the source.
 */

/**
 * Hex length the provider's asset manifest requires — SHA-256 truncated to its
 * first 16 bytes. A full 64-char digest is rejected outright:
 * "10304: Invalid manifest: file hash size of 64 is too large".
 * 128 bits keeps the birthday bound at 2^64 inside one App's key space.
 */
declare const ASSET_HASH_HEX_LENGTH = 32;
interface AssetManifestEntry {
    /** Path the asset is served at, rooted with '/' — 'dist/client/app.css' → '/app.css'. */
    path: string;
    hash: string;
    bytes: Uint8Array;
}
interface AssetManifest {
    entries: AssetManifestEntry[];
    /** publish path → { hash, bytes } — the shape uploadAssets takes. */
    assets: Record<string, {
        hash: string;
        bytes: Uint8Array;
    }>;
}
/** Strips the bundle's asset root and roots the result with '/'. */
declare function publishPath(archivePath: string): string;
/**
 * Build an asset manifest with tenant-salted, provider-length asset hashes.
 *
 * hash = sha256(appId ‖ '\0' ‖ file-bytes) truncated to ASSET_HASH_HEX_LENGTH.
 * The appId prefix is the per-tenant salt that prevents cross-App key
 * collisions (AD-9), and this salted hash is the one that reaches the provider,
 * so the isolation holds in the account rather than only in this module.
 *
 * Entries are keyed by the path the asset is served at, sorted for determinism.
 * The provider addresses assets by path; a hash used as a path publishes every
 * file at an address no request will ever ask for.
 */
declare function buildAssetManifest(appId: string, assets: BundleEntry[]): AssetManifest;

/**
 * Destroy domain orchestrator — Story 2.16.
 *
 * Pure function over injected ports; no credentials, no HTTP, no Mongo.
 * Tombstone-first / finalize-last: a crash at any middle step leaves a
 * tombstone (slug reserved), never a freed slug before resources are gone.
 * Every removal is no-op-if-absent so a re-drive or reconciliation re-run
 * is safe under retry.
 */

interface DestroyAppDeps {
    appStore: AppRegistrationStore;
    provider: AppProviderApi;
    registry: AppRegistryStore;
    objectStore: AppObjectStore;
    versionStore: AppVersionStore;
    authz: AppAuthorizationPort;
    events: AppEventSink;
}
interface DestroyAppInput {
    appId: string;
    appHost: string;
    taskId: string;
}
type DestroyAppResult = {
    status: 'destroyed';
} | {
    status: 'already-deleted';
};
declare function destroyApp(deps: DestroyAppDeps, input: DestroyAppInput): Promise<DestroyAppResult>;
/**
 * Re-drives cleanup+finalization for every tombstoned app.
 * Never touches an app that has no tombstone — acts only on tombstones.
 */
declare function reconcileAppTombstones(deps: DestroyAppDeps): Promise<void>;

/**
 * changeAppSharing domain orchestrator — Story 3.4.
 *
 * Pure function over injected ports; no credentials, no HTTP, no Temporal.
 *
 * Direction-dependent ordering — the narrow side goes first, always:
 * - Narrowing: a SpiceDB `revoking` wildcard denies fresh authorization, then the
 *   registry turns off the public gate and bumps the cookie generation. One atomic
 *   SpiceDB update installs the target, removes stale grants, and clears the deny.
 *   Any partial failure therefore stays fail-closed and is safe to retry.
 * - Widening: SpiceDB first, then the registry row. Granting before the coarse
 *   gate opens never exposes more than intended.
 *
 * Every transition first persists a Mongo write-ahead target claim. Only its
 * owner snapshots the current state and durably prepares the direction and fixed
 * target generation before any side effect. Inline retries and the API recovery
 * poller can prepare an interrupted claim and replay it without losing the target
 * or bumping the generation twice.
 */

interface ChangeAppSharingDeps {
    authz: AppAuthorizationPort;
    registry: AppRegistryStore;
    changes: AppSharingChangeStore;
}
interface ChangeAppSharingInput {
    appId: string;
    appHost: string;
    membershipId: string;
    level: SharingLevel;
    orgId: string;
    workspaceIds: string[];
}
/** Mongo-backed target claim before direction and generation are prepared. */
interface AppSharingChangeClaim extends ChangeAppSharingInput {
    changeId: string;
    prepared: false;
}
interface PreparedAppSharingChange extends ChangeAppSharingInput {
    changeId: string;
    prepared: true;
    targetGeneration: number;
    narrowed: boolean;
}
type AppSharingChangeIntent = AppSharingChangeClaim | PreparedAppSharingChange;
interface AppSharingChangeStore {
    getPending(appId: string): Promise<AppSharingChangeIntent | null>;
    begin(intent: AppSharingChangeClaim): Promise<AppSharingChangeIntent>;
    acquireReplay(appId: string, changeId: string, ownerId: string, now: Date, expiresAt: Date): Promise<boolean>;
    renewReplay(appId: string, changeId: string, ownerId: string, now: Date, expiresAt: Date): Promise<boolean>;
    prepare(intent: PreparedAppSharingChange, ownerId: string): Promise<AppSharingChangeIntent>;
    complete(appId: string, changeId: string, ownerId: string): Promise<boolean>;
    releaseReplay(appId: string, changeId: string, ownerId: string): Promise<void>;
}
declare class AppSharingChangeReplayBusyError extends Error {
    constructor();
}
type ChangeAppSharingResult = {
    status: 'ok';
    level: SharingLevel;
    isPublic: boolean;
    revocationGeneration: number;
    narrowed: boolean;
} | {
    status: 'refused';
    reason: 'not-manager' | 'organization-admin-required' | 'not-deployed' | 'app-mismatch' | 'change-in-progress';
};
declare function changeAppSharing(deps: ChangeAppSharingDeps, input: ChangeAppSharingInput): Promise<ChangeAppSharingResult>;
/** Replays an already-authorized durable intent; deliberately does not re-check manage. */
declare function resumeAppSharingChange(deps: ChangeAppSharingDeps, intent: AppSharingChangeIntent): Promise<{
    row: AppRegistryRow;
    intent: PreparedAppSharingChange;
}>;
declare const APP_SHARING_REPLAY_LEASE_MS = 60000;

/**
 * Real Cloudflare adapter for AppProviderApi — Story 2.17.
 *
 * Ports the HTTP scaffolding from the v1 cloudflare-client.ts reference:
 * request<T>, bearer auth, CfEnvelope, CloudflareApiError.
 *
 * apiBase and compatibilityDate are injected — no URL literal, no version
 * literal, no process.env read in this file (AD-12).
 */

interface CloudflareProviderConfig {
    accountId: string;
    apiToken: string;
    dispatchNamespace: string;
    /** Injected — e.g. 'https://api.cloudflare.com/client/v4'. No default here. */
    apiBase: string;
    /** Injected — e.g. '2026-07-01'. No default here. */
    compatibilityDate: string;
    /** Override for unit tests so no network is used. */
    fetchImpl?: typeof fetch;
}
/**
 * A delete call succeeded but the resource is still there.
 *
 * The provider answers 200 for a deleted script on every per-script endpoint —
 * `/scripts/{name}` returns a result body and `/scripts/{name}/bindings` returns an
 * empty array — so a 200 from DELETE is not evidence that anything was removed.
 * Destroy must fail loudly here: its caller keeps the tombstone and re-drives,
 * whereas reporting success would strand a live script with no record of it.
 */
declare class ProviderDeleteIncompleteError extends Error {
    readonly remaining: string[];
    constructor(remaining: string[]);
}
declare class CloudflareApiError extends Error {
    readonly status: number;
    readonly errors: unknown[];
    constructor(message: string, status: number, errors: unknown[]);
}
declare class CloudflareProviderApi implements AppProviderApi {
    private readonly config;
    private readonly fetchImpl;
    private readonly sessions;
    constructor(config: CloudflareProviderConfig);
    private request;
    openUploadSession(params: OpenUploadSessionParams): Promise<OpenUploadSessionResult>;
    uploadAssets(params: UploadAssetsParams): Promise<void>;
    uploadScript(params: UploadScriptParams): Promise<void>;
    provisionDatabase(params: ProvisionDatabaseParams): Promise<ProvisionDatabaseResult>;
    /** Idempotently create the App's bucket. */
    provisionBucket(params: ProvisionBucketParams): Promise<void>;
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
    private d1Query;
    readMigrationLedger(params: ReadMigrationLedgerParams): Promise<MigrationLedgerEntry[]>;
    applyMigration(params: ApplyMigrationParams): Promise<void>;
    deleteApp(params: DeleteAppParams): Promise<void>;
    /** Whether a D1 database is still listed on the account. */
    private databaseExists;
    /**
     * Script names present in the dispatch namespace — the only absence proof the
     * provider offers. `/scripts/{name}` and `/scripts/{name}/bindings` both answer
     * 200 for a script that was successfully deleted, so a delete can only be
     * confirmed by the name dropping out of this listing.
     */
    listNamespaceScripts(): Promise<string[]>;
    /**
     * Health-check the staging slot by sending a GET to the deployed edge
     * (`https://{appHost}/`) with the signed probe + App headers.
     * This goes through the real Cloudflare edge (not `this.request`), so
     * `fetchImpl` must resolve the external hostname, which it does in prod
     * (global fetch) and in tests (injected mock).
     */
    probeHealth(params: ProbeHealthParams): Promise<ProbeHealthResult>;
    /**
     * Reads back the bindings currently attached to the given App slot.
     * Used by the smoke ladder to assert `ASSETS` (+ `DB`/`BUCKET` when declared) are
     * present. Reverse-maps every type uploadScript emits — a one-way mapping would
     * pass offline and fail live, because the ladder reads bindings back from here.
     */
    getScriptBindings(params: {
        appId: string;
        slot: string;
    }): Promise<Array<{
        type: string;
        name: string;
        id?: string;
        bucketName?: string;
    }>>;
}

/** URL-safe base64 encode: replaces +→-, /→_, strips padding. */
declare function base64urlEncode(buf: Uint8Array): string;
/** URL-safe base64 decode: inverse of base64urlEncode. */
declare function base64urlDecode(s: string): Uint8Array<ArrayBuffer>;

declare const HANDOFF_LABEL = "mfg-agent:apps-edge:handoff:v1";
/** Maximum token lifetime in seconds. Tokens must be redeemed quickly. */
declare const HANDOFF_TTL_SECONDS = 300;
/** Shared query-param name carrying the handoff token. Used by control-plane (Story 3.2) and dispatch Worker (Story 3.3). */
declare const HANDOFF_QUERY_PARAM = "__mfg_handoff";
/** Symmetric clock-skew tolerance in seconds applied to iat and exp. */
declare const HANDOFF_SKEW_SECONDS = 10;
/** Atomic put-if-absent for single-use JTIs. */
interface BurnStore {
    /** Returns true on first call for this jti, false if already burned. */
    tryBurn(jti: string): Promise<boolean>;
}
/**
 * @internal — for tests/dev only; a `Set` is per-isolate and provides NO
 * cross-isolate replay protection. Production must inject a durable, atomic
 * (compare-and-swap / conditional-write) BurnStore.
 */
declare class InMemoryBurnStore implements BurnStore {
    private readonly burned;
    tryBurn(jti: string): Promise<boolean>;
}
/**
 * The anti-replay binding fields that verifyHandoffToken checks against the
 * caller-supplied `expected` object. The edge has a prior expectation for
 * these (app and generation from the registry row, user from peekHandoffUser,
 * host from the request hostname); Organization and Workspace have no prior
 * expectation and are carried as signed identity claims instead.
 */
interface HandoffBinding {
    app: string;
    user: string;
    host: string;
    generation: number;
}
/** Full set of claims minted by the control plane and carried in the token. */
interface HandoffClaims {
    app: string;
    user: string;
    host: string;
    org: string;
    workspace: string;
    generation: number;
}
/**
 * Mint a short-lived single-use handoff token bound to
 * {app, user, host, generation}.
 * Wire format: base64url(JSON payload) + '.' + base64url(HMAC-SHA256 sig).
 */
declare function mintHandoffToken(secret: Uint8Array, claims: HandoffClaims, now?: number): Promise<string>;
/**
 * Read-only accessor: returns the `user` field from a token's payload segment
 * without verifying the signature. Used by the edge to supply `expected.user`
 * to `verifyHandoffToken` when the edge has no prior notion of the Viewer.
 * The HMAC signature (checked inside `verifyHandoffToken`) protects the claim.
 * Returns null on any malformed or missing input; never throws.
 */
declare function peekHandoffUser(token: string): string | null;
/**
 * Reason a verification failed. `store-unavailable` is deliberately distinct from
 * every token-defect reason: a burn store that cannot answer is an outage, not a
 * malformed or replayed token, and reporting it as one sends every diagnosis after
 * the Viewer instead of the store (DW-37).
 */
declare const HANDOFF_STORE_UNAVAILABLE = "store-unavailable";
type HandoffVerifyResult = {
    ok: true;
    claims: HandoffClaims;
} | {
    ok: false;
    reason: string;
};
/**
 * Verify a handoff token. On success, burns the jti atomically (single-use).
 * Returns failure without throwing on any invalid condition.
 * @param expected - the {app, user, host, generation} bindings to enforce
 *   (anti-replay and stale-generation rejection).
 *   Organization and Workspace are carried as signed identity claims, not bindings.
 * @param burnStore - atomic put-if-absent for jti replay prevention.
 */
declare function verifyHandoffToken(secret: Uint8Array, token: string, expected: HandoffBinding, burnStore: BurnStore, now?: number): Promise<HandoffVerifyResult>;

declare const SESSION_LABEL = "mfg-agent:apps-edge:session:v1";
/** Cookie name — `__Host-` prefix enforces Secure + Path=/ + no Domain. */
declare const SESSION_COOKIE_NAME = "__Host-mfg-session";
/** Soft expiry: verify reports softExpired=true, caller should re-mint. */
declare const SESSION_SOFT_TTL_SECONDS = 1800;
/** Hard expiry: verify rejects the cookie entirely. */
declare const SESSION_HARD_TTL_SECONDS = 28800;
/** Symmetric clock-skew tolerance for the iat lower bound. */
declare const SESSION_SKEW_SECONDS = 60;
/**
 * Mint a session cookie value bound to {appHost, user, generation}.
 * Wire format: base64url(JSON payload) + '.' + base64url(HMAC-SHA256 sig).
 * The generation is read from the registry row by the caller; it is never
 * derived here.
 */
declare function mintSessionCookie(secret: Uint8Array, opts: {
    appHost: string;
    user: string;
    org: string;
    workspace: string;
    generation: number;
}, now?: number): Promise<string>;
type SessionVerifyResult = {
    ok: true;
    user: string;
    org: string;
    workspace: string;
    generation: number;
    softExpired: boolean;
} | {
    ok: false;
    reason: string;
};
/**
 * Verify a session cookie value.
 * - Fails if the appHost doesn't match (session isolation).
 * - Fails past the hard TTL.
 * - Succeeds past the soft TTL with softExpired=true (caller should re-mint).
 * - Exposes the generation to the caller for revocation-generation comparison.
 *
 * DW-37 named this function alongside verifyHandoffToken for its catch-all
 * `parse-error`. It is accurate here and stays: this function performs no I/O and
 * injects no store, so the only things that can throw are decode and JSON.parse —
 * both genuinely malformed input. The handoff path was the one with a store behind
 * the catch, and that is where the reason is now separated.
 */
declare function verifySessionCookie(secret: Uint8Array, value: string, opts: {
    appHost: string;
}, now?: number): Promise<SessionVerifyResult>;
/**
 * Build the Set-Cookie header value for the session cookie.
 * Attributes: __Host- prefix, Path=/, Secure, HttpOnly, SameSite=Lax, Max-Age.
 * No Domain attribute — enforced by __Host- prefix semantics.
 */
declare function buildSessionSetCookie(value: string, maxAgeSeconds: number): string;

/**
 * The platform-owned migration ledger, and how a migration's SQL is issued.
 *
 * AD-14: an App Migration's identity is its ordinal plus its content hash, recorded in a
 * platform-owned ledger table inside the App Database that the App's own code must not
 * address. "Exactly once" means checked against that ledger.
 */
/** Ledger table name. Also a forbidden literal in App bundles — App code must not address it. */
declare const MIGRATION_LEDGER_TABLE = "_mfg_migrations";
/**
 * Created on every ledger read rather than at provision time, so the ledger does not
 * depend on when the database was made — including databases provisioned before this
 * table existed.
 *
 * `status` is two-phase: a row is written `applying` before the migration's SQL runs and
 * updated to `applied` after. The control plane cannot make those atomic — D1's batch and
 * transaction APIs are Worker-only and explicit BEGIN/COMMIT is rejected — so an
 * interrupted deploy leaves a legible `applying` row instead of an applied-but-unrecorded
 * migration that the next deploy would blindly re-run.
 */
declare const MIGRATION_LEDGER_DDL = "CREATE TABLE IF NOT EXISTS _mfg_migrations (\n  ordinal INTEGER PRIMARY KEY,\n  hash TEXT NOT NULL,\n  status TEXT NOT NULL,\n  started_at INTEGER NOT NULL,\n  applied_at INTEGER\n)";
/**
 * Split a migration into the statements to issue, in order.
 *
 * A file with no marker is one statement. Splitting on drizzle's own marker rather than on
 * semicolons is what makes this safe: a semicolon inside a string literal or a trigger body
 * is not a boundary, and drizzle places the marker where the boundaries actually are.
 */
declare function splitMigrationStatements(sql: string): string[];

export { APP_ACCESS_REFUSED, APP_DEPLOYED, APP_DEPLOY_HEALTH_CHECK_FAILED, APP_DESTROYED, APP_OBJECT_STORAGE_PREFIX, APP_RELATIONS, APP_SHARING_REPLAY_LEASE_MS, APP_VERSION_SAVE_REJECTED, ASSET_HASH_HEX_LENGTH, ASSET_ROOT, type AppAuthorizationPort, type AppCreatorLister, type AppDatabaseDeclaration, type AppEvent, type AppEventSink, type AppMigration, type AppObjectStore, type AppProviderApi, type AppRecord, type AppRegistrationStore, type AppRegistryRow, type AppRegistryStore, type AppRuntimeDeclaration, type AppScriptBinding, type AppSharingChangeClaim, type AppSharingChangeIntent, AppSharingChangeReplayBusyError, type AppSharingChangeStore, type AppSharingFence, type AppSlot, type AppTombstone, type AppVersionRecord, type AppVersionStore, type ApplyMigrationParams, ArchiveImmutabilityError, ArchiveNotFoundError, type AssetManifest, type AssetManifestEntry, type AuthzCheck, type AuthzRelationship, type AuthzRelationshipUpdate, type AuthzSubject, BINDING_PATH, type BundleEntry, type BurnStore, type ChangeAppSharingDeps, type ChangeAppSharingInput, type ChangeAppSharingResult, CloudflareApiError, CloudflareProviderApi, type CloudflareProviderConfig, type CreateAppInput, type DeleteAppParams, type DeployAppVersionDeps, type DeployAppVersionInput, type DeployAppVersionResult, DeployFailedError, type DestroyAppDeps, type DestroyAppInput, type DestroyAppResult, DestroyFailedError, DisallowedBundleError, FakeCallController, HANDOFF_LABEL, HANDOFF_QUERY_PARAM, HANDOFF_SKEW_SECONDS, HANDOFF_STORE_UNAVAILABLE, HANDOFF_TTL_SECONDS, HOST_LABEL_SEPARATOR, HOST_SUFFIX_LENGTH, type HandoffBinding, type HandoffClaims, type HandoffVerifyResult, INITIAL_SLOT, InMemoryAppEventSink, InMemoryAppRegistrationStore, InMemoryAppRegistry, InMemoryAppVersionStore, InMemoryBurnStore, InvalidHostLabelError, MANIFEST_PATH, MAX_APP_SLUG_LENGTH, MAX_HOST_LABEL_LENGTH, MAX_ORG_NAME_SLUG_LENGTH, MIGRATIONS_DIR, MIGRATION_LEDGER_DDL, MIGRATION_LEDGER_TABLE, MIGRATION_META_DIR, MalformedBundleError, type Manifest, type MigrationLedgerEntry, MigrationRewrittenError, MissingMigrationError, type OpenUploadSessionParams, type OpenUploadSessionResult, PROBE_APP_HEADER, PROBE_HEADER, PROBE_LABEL, type PreparedAppSharingChange, type PriorAppVersion, type ProbeHealthParams, type ProbeHealthResult, ProviderContractError, ProviderDeleteIncompleteError, type ProvisionBucketParams, type ProvisionDatabaseParams, type ProvisionDatabaseResult, RESERVED_HOST_LABELS, type ReadMigrationLedgerParams, SESSION_COOKIE_NAME, SESSION_HARD_TTL_SECONDS, SESSION_LABEL, SESSION_SKEW_SECONDS, SESSION_SOFT_TTL_SECONDS, SOURCE_META_JOURNAL, SOURCE_ROOT, type SaveAppVersionDeps, type SaveAppVersionInput, type SchemaModule, type SessionVerifyResult, SharingLevel, SlugCollisionError, type UploadAssetsParams, type UploadScriptParams, VIEWER_HEADER_PREFIX, VIEWER_ID_HEADER, VIEWER_ORG_HEADER, VIEWER_WORKSPACE_HEADER, type ValidationContext, type ValidationResult, WORKER_ENTRY, appHost, appStorageObjectKey, appThumbnailKey, assertApplyMigrationContract, assertDeleteAppContract, assertOpenUploadSessionContract, assertProbeHealthContract, assertProvisionBucketContract, assertProvisionDatabaseContract, assertReadMigrationLedgerContract, assertUploadAssetsContract, assertUploadScriptContract, assetContentType, base64urlDecode, base64urlEncode, buildAssetManifest, buildSessionSetCookie, changeAppSharing, computeSchemaFingerprint, createInMemoryAuthorization, createInMemoryObjectStore, createInMemoryProviderApi, createInMemoryRegistry, deployAppVersion, deriveAppSlug, deriveOrgHostLabel, deriveProbeSubkey, deriveSharingLevel, destroyApp, hashMigration, isAppSharingRelation, isManifestPath, isNarrowing, isValidHostLabel, mintHandoffToken, mintSessionCookie, parseManifest, peekHandoffUser, publishPath, randomHostSuffix, readBundleArchive, reconcileAppTombstones, resumeAppSharingChange, saveAppVersion, sharingLevelTuples, signProbe, slotScriptName, slugifyHostLabel, splitMigrationStatements, stagingSlot, validateBundle, verifyHandoffToken, verifyProbeSignature, verifySessionCookie, writeAppRegistryRow, writeBundleArchive };
