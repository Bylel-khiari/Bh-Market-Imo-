import crypto from "crypto";
import { createReadStream } from "fs";
import { mkdir, rm, stat, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { httpError } from "../utils/httpError.js";

const DEFAULT_UPLOAD_ROOT = fileURLToPath(
  new URL("../../uploads/credit-applications/", import.meta.url)
);
const UPLOAD_ROOT = path.resolve(
  process.env.CREDIT_APPLICATION_UPLOAD_DIR || DEFAULT_UPLOAD_ROOT
);
const MAX_DOCUMENT_BYTES = Number(
  process.env.CREDIT_APPLICATION_DOCUMENT_MAX_BYTES || 8 * 1024 * 1024
);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const MIME_EXTENSIONS = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

function sanitizeFilename(name) {
  const basename = path.basename(String(name || "document").trim());
  const sanitized = basename
    .replace(/[^\w.\-() ]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 180);

  return sanitized || "document";
}

function normalizeMimeType(value) {
  const mimeType = String(value || "").trim().toLowerCase();
  return ALLOWED_MIME_TYPES.has(mimeType) ? mimeType : "";
}

function inferMimeTypeFromName(name) {
  const ext = path.extname(String(name || "")).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "";
}

function getFilenameExtension(name, mimeType) {
  const ext = path.extname(String(name || "")).toLowerCase();
  if ([".pdf", ".jpg", ".jpeg", ".png"].includes(ext)) {
    return ext === ".jpeg" ? ".jpg" : ext;
  }

  return MIME_EXTENSIONS[mimeType] || ".bin";
}

function decodeDocumentData(value) {
  const rawValue = String(value || "");
  const base64 = rawValue.includes(",") ? rawValue.split(",").pop() : rawValue;

  if (!base64) {
    throw httpError(400, "Document content is missing");
  }

  return Buffer.from(base64, "base64");
}

function resolveStoredDocumentPath(storagePath) {
  const normalizedStoragePath = String(storagePath || "").replace(/\\/g, "/");
  const resolvedPath = path.resolve(UPLOAD_ROOT, normalizedStoragePath);

  if (!resolvedPath.startsWith(`${UPLOAD_ROOT}${path.sep}`)) {
    throw httpError(400, "Invalid document path");
  }

  return resolvedPath;
}

export async function persistCreditApplicationDocuments(documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return [];
  }

  const folderName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
  const targetDir = path.join(UPLOAD_ROOT, folderName);
  const persistedDocuments = [];

  try {
    await mkdir(targetDir, { recursive: true });

    for (const document of documents) {
      const type = String(document?.type || "").trim().toUpperCase();
      const originalName = sanitizeFilename(document?.name);
      const mimeType =
        normalizeMimeType(document?.content_type || document?.mime_type) ||
        inferMimeTypeFromName(originalName);
      const data = document?.data || document?.content || document?.base64;

      if (!data) {
        persistedDocuments.push({ type, name: originalName });
        continue;
      }

      if (!mimeType) {
        throw httpError(400, `Unsupported document type for ${originalName}`);
      }

      const buffer = decodeDocumentData(data);

      if (buffer.length <= 0) {
        throw httpError(400, `Document ${originalName} is empty`);
      }

      if (buffer.length > MAX_DOCUMENT_BYTES) {
        throw httpError(413, `Document ${originalName} exceeds the maximum allowed size`);
      }

      const extension = getFilenameExtension(originalName, mimeType);
      const storedName = `${type.toLowerCase()}_${crypto.randomBytes(10).toString("hex")}${extension}`;
      const storagePath = `${folderName}/${storedName}`;
      await writeFile(path.join(targetDir, storedName), buffer, { flag: "wx" });

      persistedDocuments.push({
        type,
        name: originalName,
        mime_type: mimeType,
        size_bytes: buffer.length,
        storage_path: storagePath,
      });
    }

    return persistedDocuments;
  } catch (error) {
    await rm(targetDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

export async function cleanupPersistedCreditApplicationDocuments(documents) {
  const storagePaths = (Array.isArray(documents) ? documents : [])
    .map((document) => document?.storage_path)
    .filter(Boolean);

  await Promise.all(
    storagePaths.map((storagePath) =>
      rm(resolveStoredDocumentPath(storagePath), { force: true }).catch(() => {})
    )
  );
}

export async function openStoredCreditApplicationDocument(document) {
  if (!document?.storage_path) {
    throw httpError(404, "Document file is not available");
  }

  const filePath = resolveStoredDocumentPath(document.storage_path);
  const fileStat = await stat(filePath).catch(() => null);

  if (!fileStat?.isFile()) {
    throw httpError(404, "Document file was not found");
  }

  return {
    stream: createReadStream(filePath),
    size: fileStat.size,
    mimeType: normalizeMimeType(document.mime_type) || "application/octet-stream",
    filename: sanitizeFilename(document.name),
  };
}

export function buildInlineContentDisposition(filename) {
  const safeFilename = sanitizeFilename(filename).replace(/"/g, "");
  return `inline; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`;
}
