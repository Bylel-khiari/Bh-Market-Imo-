import path from "path";
import { Readable } from "stream";
import { dbPool } from "../config/db.js";
import { httpError } from "../utils/httpError.js";

const CREDIT_APPLICATION_DOCUMENT_TABLE = "credit_application_documents";
const CREDIT_APPLICATION_DOCUMENT_CHUNK_TABLE = "credit_application_document_chunks";
const MAX_DOCUMENT_BYTES = Number(
  process.env.CREDIT_APPLICATION_DOCUMENT_MAX_BYTES || 8 * 1024 * 1024
);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

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

function decodeDocumentData(value) {
  const rawValue = String(value || "");
  const base64 = rawValue.includes(",") ? rawValue.split(",").pop() : rawValue;

  if (!base64) {
    throw httpError(400, "Document content is missing");
  }

  return Buffer.from(base64, "base64");
}

export async function persistCreditApplicationDocuments(documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return [];
  }

  const persistedDocuments = [];

  for (const document of documents) {
    const type = String(document?.type || "").trim().toUpperCase();
    const originalName = sanitizeFilename(document?.name);
    const mimeType =
      normalizeMimeType(document?.content_type || document?.mime_type) ||
      inferMimeTypeFromName(originalName);
    const data = document?.data || document?.content || document?.base64;

    if (!data) {
      throw httpError(400, `Document content is missing for ${originalName}`);
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

    persistedDocuments.push({
      type,
      name: originalName,
      mime_type: mimeType,
      size_bytes: buffer.length,
      content_buffer: buffer,
    });
  }

  return persistedDocuments;
}

export async function cleanupPersistedCreditApplicationDocuments(documents) {
  return documents;
}

export async function openStoredCreditApplicationDocument(document) {
  const documentId = Number(document?.db_document_id);

  if (!documentId) {
    throw httpError(404, "Document file is not available");
  }

  const [rows] = await dbPool.execute(
    `
    SELECT
      file_name,
      mime_type,
      size_bytes,
      content
    FROM ${CREDIT_APPLICATION_DOCUMENT_TABLE}
    WHERE id = ?
    LIMIT 1
    `,
    [documentId]
  );
  const row = rows?.[0];

  if (!row?.content) {
    const [chunkRows] = await dbPool.execute(
      `
      SELECT content_chunk
      FROM ${CREDIT_APPLICATION_DOCUMENT_CHUNK_TABLE}
      WHERE document_id = ?
      ORDER BY chunk_index ASC
      `,
      [documentId]
    );
    const chunks = (chunkRows || [])
      .map((chunkRow) => chunkRow.content_chunk)
      .filter(Boolean)
      .map((chunk) => (Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));

    if (!chunks.length) {
      throw httpError(404, "Document file was not found");
    }

    const chunkedContent = Buffer.concat(chunks);

    return {
      stream: Readable.from(chunkedContent),
      size: Number(row.size_bytes || chunkedContent.length),
      mimeType: normalizeMimeType(row.mime_type) || "application/octet-stream",
      filename: sanitizeFilename(row.file_name || document.name),
    };
  }

  const content = Buffer.isBuffer(row.content) ? row.content : Buffer.from(row.content);

  return {
    stream: Readable.from(content),
    size: Number(row.size_bytes || content.length),
    mimeType: normalizeMimeType(row.mime_type) || "application/octet-stream",
    filename: sanitizeFilename(row.file_name || document.name),
  };
}

export function buildInlineContentDisposition(filename) {
  const safeFilename = sanitizeFilename(filename).replace(/"/g, "");
  return `inline; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`;
}
