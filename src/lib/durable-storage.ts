import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type StorageMode = "filesystem" | "blob";

type BlobListResponse = {
  blobs?: Array<{ pathname?: unknown }>;
  hasMore?: boolean;
  cursor?: string;
};

type BlobPutOptions = {
  allowOverwrite?: boolean;
  contentType?: string;
};

export class StorageUnavailableError extends Error {
  readonly code = "STORAGE_UNAVAILABLE" as const;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StorageUnavailableError";
  }
}

export type DurableStore = {
  readonly mode: StorageMode;
  put(pathname: string, body: string | Uint8Array, options?: BlobPutOptions): Promise<boolean>;
  get(pathname: string): Promise<string | null>;
  list(prefix: string): Promise<string[]>;
  writeJson(pathname: string, value: unknown, options?: BlobPutOptions): Promise<boolean>;
};

function hasBlobCredentials(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN?.trim() ||
    (process.env.VERCEL_OIDC_TOKEN?.trim() && process.env.BLOB_STORE_ID?.trim()),
  );
}

export function selectStorageMode(rootDir?: string): StorageMode {
  // A test/injected root always means an isolated filesystem store. Production
  // calls without a root select Blob when configured, and refuse to fall back
  // to Vercel's read-only bundle when Blob credentials are absent.
  if (rootDir) return "filesystem";
  const requested = process.env.INGEST_STORAGE?.trim().toLowerCase();
  if (requested === "filesystem") return "filesystem";
  if (requested === "blob") return "blob";
  if (hasBlobCredentials()) return "blob";
  if (process.env.VERCEL === "1") return "blob";
  return "filesystem";
}

function relativeKey(rootDir: string, pathname: string): string {
  return path.join(rootDir, pathname);
}

function normalizeKey(pathname: string): string {
  return pathname.replaceAll("\\", "/").replace(/^\/+/, "");
}

class FilesystemStore implements DurableStore {
  readonly mode = "filesystem" as const;
  private readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async put(pathname: string, body: string | Uint8Array, options?: BlobPutOptions): Promise<boolean> {
    const target = relativeKey(this.rootDir, pathname);
    await mkdir(path.dirname(target), { recursive: true });
    if (options?.allowOverwrite) {
      await writeFile(target, body, "utf8");
      return true;
    }
    try {
      await writeFile(target, body, { encoding: "utf8", flag: "wx" });
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
      throw error;
    }
  }

  async get(pathname: string): Promise<string | null> {
    try {
      return await readFile(relativeKey(this.rootDir, pathname), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async list(prefix: string): Promise<string[]> {
    const root = relativeKey(this.rootDir, prefix);
    const entries: string[] = [];
    const visit = async (directory: string): Promise<void> => {
      let children;
      try {
        children = await readdir(directory, { withFileTypes: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
        throw error;
      }
      await Promise.all(children.map(async (child) => {
        const target = path.join(directory, child.name);
        if (child.isDirectory()) {
          await visit(target);
        } else {
          entries.push(path.relative(this.rootDir, target).split(path.sep).join("/"));
        }
      }));
    };
    await visit(root);
    return entries.sort();
  }

  async writeJson(pathname: string, value: unknown, options?: BlobPutOptions): Promise<boolean> {
    const target = relativeKey(this.rootDir, pathname);
    await mkdir(path.dirname(target), { recursive: true });
    const contents = `${JSON.stringify(value, null, 2)}\n`;
    if (options?.allowOverwrite) {
      const temporary = `${target}.${process.pid}.tmp`;
      await writeFile(temporary, contents, "utf8");
      await rename(temporary, target);
      return true;
    }
    try {
      await writeFile(target, contents, { encoding: "utf8", flag: "wx" });
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
      throw error;
    }
  }
}

function blobStoreId(): string {
  const configured = process.env.BLOB_STORE_ID?.trim();
  if (configured) return configured.replace(/^store_/, "");
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  const fromToken = token?.split("_")[3];
  if (fromToken) return fromToken;
  throw new StorageUnavailableError("Vercel Blob credentials are incomplete (missing BLOB_STORE_ID).");
}

function blobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim();
  if (!token) throw new StorageUnavailableError("Vercel Blob credentials are not configured.");
  return token;
}

function blobApiHeaders(): Record<string, string> {
  return {
    authorization: `Bearer ${blobToken()}`,
    "x-vercel-blob-store-id": blobStoreId(),
    "x-api-version": "12",
  };
}

async function blobResponseError(response: Response): Promise<StorageUnavailableError> {
  let detail = "unknown provider error";
  try {
    const body = (await response.json()) as { error?: { message?: unknown } };
    if (typeof body.error?.message === "string" && body.error.message.trim()) detail = body.error.message.trim();
  } catch {
    // Keep the error specific without echoing an arbitrary upstream response.
  }
  return new StorageUnavailableError(`Vercel Blob returned HTTP ${response.status}: ${detail}`);
}

class VercelBlobStore implements DurableStore {
  readonly mode = "blob" as const;
  private readonly apiUrl = process.env.VERCEL_BLOB_API_URL?.trim() || "https://vercel.com/api/blob";

  async put(pathname: string, body: string | Uint8Array, options?: BlobPutOptions): Promise<boolean> {
    const url = new URL(`${this.apiUrl.replace(/\/$/, "")}/`);
    url.searchParams.set("pathname", normalizeKey(pathname));
    let response: Response;
    try {
      response = await fetch(url, {
        method: "PUT",
        headers: {
          ...blobApiHeaders(),
          "x-content-type": options?.contentType ?? "application/octet-stream",
          "x-vercel-blob-access": "private",
          "x-add-random-suffix": "0",
          "x-allow-overwrite": options?.allowOverwrite ? "1" : "0",
        },
        body: typeof body === "string" ? body : new Uint8Array(body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      throw new StorageUnavailableError("Vercel Blob could not be reached.", { cause: error });
    }
    if (response.status === 409 && !options?.allowOverwrite) return false;
    if (!response.ok) throw await blobResponseError(response);
    return true;
  }

  async get(pathname: string): Promise<string | null> {
    const url = `https://${blobStoreId()}.private.blob.vercel-storage.com/${normalizeKey(pathname)}`;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { authorization: `Bearer ${blobToken()}` },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      throw new StorageUnavailableError("Vercel Blob could not be reached.", { cause: error });
    }
    if (response.status === 404) return null;
    if (!response.ok) throw await blobResponseError(response);
    return response.text();
  }

  async list(prefix: string): Promise<string[]> {
    const entries: string[] = [];
    let cursor: string | undefined;
    do {
      const url = new URL(`${this.apiUrl.replace(/\/$/, "")}/`);
      url.searchParams.set("prefix", normalizeKey(prefix));
      url.searchParams.set("limit", "1000");
      if (cursor) url.searchParams.set("cursor", cursor);
      let response: Response;
      try {
        response = await fetch(url, {
          headers: blobApiHeaders(),
          signal: AbortSignal.timeout(15_000),
        });
      } catch (error) {
        throw new StorageUnavailableError("Vercel Blob could not be reached.", { cause: error });
      }
      if (!response.ok) throw await blobResponseError(response);
      const body = (await response.json()) as BlobListResponse;
      entries.push(...(body.blobs ?? []).flatMap((blob) => typeof blob.pathname === "string" ? [blob.pathname] : []));
      cursor = body.hasMore ? body.cursor : undefined;
    } while (cursor);
    return entries.sort();
  }

  async writeJson(pathname: string, value: unknown, options?: BlobPutOptions): Promise<boolean> {
    return this.put(pathname, `${JSON.stringify(value, null, 2)}\n`, {
      ...options,
      contentType: "application/json; charset=utf-8",
    });
  }
}

export function getDurableStore(rootDir?: string): DurableStore {
  const mode = selectStorageMode(rootDir);
  if (mode === "filesystem") return new FilesystemStore(rootDir ?? process.cwd());
  return new VercelBlobStore();
}

export async function readStoredText(pathname: string, rootDir?: string): Promise<string | null> {
  return getDurableStore(rootDir).get(pathname);
}

export async function writeStoredText(pathname: string, contents: string, options?: { rootDir?: string; allowOverwrite?: boolean }): Promise<void> {
  await getDurableStore(options?.rootDir).put(pathname, contents, { allowOverwrite: options?.allowOverwrite, contentType: "text/plain; charset=utf-8" });
}

export async function writeStoredJson(pathname: string, value: unknown, options?: { rootDir?: string; allowOverwrite?: boolean }): Promise<void> {
  await getDurableStore(options?.rootDir).writeJson(pathname, value, { allowOverwrite: options?.allowOverwrite });
}
