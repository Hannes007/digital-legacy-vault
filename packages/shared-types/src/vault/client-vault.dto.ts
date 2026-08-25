/**
 * Client-Encrypted Vault contracts. The server is zero-knowledge: it stores
 * only ciphertext + IV produced in the browser and never receives the vault key
 * or plaintext. Recovery uses Shamir shares held by the user (3-of-5 default).
 */
export interface ClientVaultItemDto {
  id: string;
  ownerId: string;
  label: string;
  /** AES-256-GCM ciphertext, base64 (encrypted client-side). */
  ciphertext: string;
  /** 12-byte IV, base64. */
  iv: string;
  createdAt: string;
}

export interface CreateClientVaultItemRequest {
  label: string;
  ciphertext: string;
  iv: string;
}

/** Metadata about a generated recovery kit — shares themselves never leave the client. */
export interface RecoveryKitInfoDto {
  shareCount: number;
  threshold: number;
  createdAt: string;
}
