import { VaultKind } from '@dlv/shared-types';

declare const SERVER_PROCESSABLE: unique symbol;

/**
 * Text proven to originate from a STANDARD (server-processable) vault.
 *
 * This branded type is the compile-time enforcement of PROJECT_MEMORY §2.4 /
 * coding-standards §10.8: the `AiGateway` port only accepts
 * `ServerProcessableText`, and the sole constructor ({@link toServerProcessable})
 * throws before any client-encrypted content can become one. Client-Encrypted
 * Vault objects therefore cannot reach OCR/AI/search — the compiler blocks a
 * plain `string`, and the runtime guard blocks a mislabeled source.
 */
export type ServerProcessableText = string & { readonly [SERVER_PROCESSABLE]: true };

/** Raised when client-encrypted content is routed towards an AI feature. */
export class ClientEncryptedExclusionError extends Error {
  constructor() {
    super('Client-encrypted content is excluded from AI processing (PROJECT_MEMORY §2.4).');
    this.name = 'ClientEncryptedExclusionError';
  }
}

export interface ProcessableSource {
  vaultKind: VaultKind;
  text: string;
}

/**
 * The ONLY way to obtain a {@link ServerProcessableText}. Throws
 * {@link ClientEncryptedExclusionError} for anything but a STANDARD vault —
 * callers must do this check before writing any AI telemetry.
 */
export function toServerProcessable(source: ProcessableSource): ServerProcessableText {
  if (source.vaultKind !== VaultKind.STANDARD) {
    throw new ClientEncryptedExclusionError();
  }
  return source.text as ServerProcessableText;
}

/** Truncates to the configured input budget without losing the brand. */
export function truncateProcessable(
  text: ServerProcessableText,
  maxChars: number,
): ServerProcessableText {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) as ServerProcessableText;
}
