/**
 * Magic-byte (file-signature) validation for the upload pipeline (§7.5). A
 * declared MIME type must be consistent with the actual leading bytes, so a
 * client cannot smuggle an executable as an "image/png". Unknown types with no
 * signature we can check are allowed through (deeper checks happen elsewhere),
 * but a declared type we DO know must match.
 */
const SIGNATURES: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
  // ZIP-based Office/OpenDocument containers.
  'application/zip': [[0x50, 0x4b, 0x03, 0x04]],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4b, 0x03, 0x04]],
};

/** Returns true if the declared MIME is consistent with the byte signature. */
export function magicBytesMatch(bytes: Uint8Array, declaredMimeType: string): boolean {
  const sigs = SIGNATURES[declaredMimeType];
  if (!sigs) return true; // no known signature to enforce
  return sigs.some((sig) => sig.every((b, i) => bytes[i] === b));
}

/** Known MIME types we can positively validate. */
export function hasKnownSignature(mimeType: string): boolean {
  return mimeType in SIGNATURES;
}
