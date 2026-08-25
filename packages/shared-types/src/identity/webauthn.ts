/**
 * Structural models of the WebAuthn Level 3 JSON serialization types
 * (`https://www.w3.org/TR/webauthn-3/`), i.e. the wire format produced by
 * `PublicKeyCredential.toJSON()` / consumed by `parseCreationOptionsFromJSON()`.
 *
 * Modelled locally (rather than re-exported from a WebAuthn library) so the
 * shared contract has zero runtime dependencies and stays stable for both
 * apps/api and apps/web.
 */

/** A base64url-encoded (RFC 4648 §5, unpadded) byte string. */
export type Base64UrlString = string;

/** Transport hints describing how a client can reach an authenticator. */
export type AuthenticatorTransport =
  | 'ble'
  | 'cable'
  | 'hybrid'
  | 'internal'
  | 'nfc'
  | 'smart-card'
  | 'usb';

/** Platform (built-in) vs cross-platform (roaming) authenticator attachment. */
export type AuthenticatorAttachment = 'platform' | 'cross-platform';

/** Relying-party requirement for user verification (PIN/biometric). */
export type UserVerificationRequirement = 'required' | 'preferred' | 'discouraged';

/** Relying-party requirement for creating a client-side discoverable credential. */
export type ResidentKeyRequirement = 'required' | 'preferred' | 'discouraged';

/** How much attestation data the relying party wants returned. */
export type AttestationConveyancePreference = 'none' | 'indirect' | 'direct' | 'enterprise';

/** Hints guiding the client's authenticator-selection UI (WebAuthn L3). */
export type PublicKeyCredentialHint = 'security-key' | 'client-device' | 'hybrid';

/** Relying-party entity presented during credential creation. */
export interface PublicKeyCredentialRpEntityJson {
  /** RP ID (a registrable domain suffix of the origin, e.g. `dlv.stellr-net.com`). */
  id?: string;
  /** Human-readable relying-party name shown by the authenticator UI. */
  name: string;
}

/** User account entity presented during credential creation. */
export interface PublicKeyCredentialUserEntityJson {
  /** Opaque user handle (base64url); DLV uses the UUIDv7 user id bytes. */
  id: Base64UrlString;
  /** Account identifier shown by the authenticator UI (DLV: email). */
  name: string;
  /** Display name shown by the authenticator UI. */
  displayName: string;
}

/** One acceptable credential algorithm (COSE identifier, e.g. -7 for ES256). */
export interface PublicKeyCredentialParametersJson {
  /** Always the literal `public-key`. */
  type: 'public-key';
  /** COSE algorithm identifier (e.g. -7 ES256, -257 RS256). */
  alg: number;
}

/** Reference to an existing credential (for exclude/allow lists). */
export interface PublicKeyCredentialDescriptorJson {
  /** Credential ID, base64url. */
  id: Base64UrlString;
  /** Always the literal `public-key`. */
  type: 'public-key';
  /** Transports the credential is known to support. */
  transports?: AuthenticatorTransport[];
}

/** Criteria the client uses to filter eligible authenticators during registration. */
export interface AuthenticatorSelectionCriteriaJson {
  /** Restrict to platform or cross-platform authenticators. */
  authenticatorAttachment?: AuthenticatorAttachment;
  /** Discoverable-credential requirement. */
  residentKey?: ResidentKeyRequirement;
  /** Legacy (L1) boolean form of `residentKey: 'required'`. */
  requireResidentKey?: boolean;
  /** User-verification requirement. */
  userVerification?: UserVerificationRequirement;
}

/** Client extension inputs relevant to DLV flows. */
export interface AuthenticationExtensionsClientInputsJson {
  /** Legacy FIDO AppID extension. */
  appid?: string;
  /** Request credential-properties output (e.g. discoverability). */
  credProps?: boolean;
  /** Request creation of an hmac-secret credential. */
  hmacCreateSecret?: boolean;
}

/** Client extension outputs relevant to DLV flows. */
export interface AuthenticationExtensionsClientOutputsJson {
  /** Legacy FIDO AppID extension result. */
  appid?: boolean;
  /** Credential properties reported by the client. */
  credProps?: {
    /** True when the created credential is discoverable (resident). */
    rk?: boolean;
  };
  /** Whether an hmac-secret credential was created. */
  hmacCreateSecret?: boolean;
}

/**
 * JSON form of `PublicKeyCredentialCreationOptions` — returned by
 * `POST /api/v1/auth/passkeys/registration/options`.
 */
export interface PublicKeyCredentialCreationOptionsJson {
  /** Relying party. */
  rp: PublicKeyCredentialRpEntityJson;
  /** Account the new credential will be bound to. */
  user: PublicKeyCredentialUserEntityJson;
  /** Server-generated random challenge, base64url. */
  challenge: Base64UrlString;
  /** Acceptable credential algorithms, most-preferred first. */
  pubKeyCredParams: PublicKeyCredentialParametersJson[];
  /** Client-side timeout in milliseconds. */
  timeout?: number;
  /** Credentials that must not be re-registered (prevents duplicates). */
  excludeCredentials?: PublicKeyCredentialDescriptorJson[];
  /** Authenticator filtering criteria. */
  authenticatorSelection?: AuthenticatorSelectionCriteriaJson;
  /** Attestation conveyance preference. */
  attestation?: AttestationConveyancePreference;
  /** UI hints for the client. */
  hints?: PublicKeyCredentialHint[];
  /** Extension inputs. */
  extensions?: AuthenticationExtensionsClientInputsJson;
}

/**
 * JSON form of `PublicKeyCredentialRequestOptions` — returned by
 * `POST /api/v1/auth/passkeys/authentication/options`.
 */
export interface PublicKeyCredentialRequestOptionsJson {
  /** Server-generated random challenge, base64url. */
  challenge: Base64UrlString;
  /** Client-side timeout in milliseconds. */
  timeout?: number;
  /** Relying-party ID the assertion must be scoped to. */
  rpId?: string;
  /** Acceptable credentials; empty/omitted enables discoverable-credential flows. */
  allowCredentials?: PublicKeyCredentialDescriptorJson[];
  /** User-verification requirement. */
  userVerification?: UserVerificationRequirement;
  /** UI hints for the client. */
  hints?: PublicKeyCredentialHint[];
  /** Extension inputs. */
  extensions?: AuthenticationExtensionsClientInputsJson;
}

/** JSON form of `AuthenticatorAttestationResponse` (registration ceremony). */
export interface AuthenticatorAttestationResponseJson {
  /** Serialized client data, base64url. */
  clientDataJSON: Base64UrlString;
  /** CBOR attestation object, base64url. */
  attestationObject: Base64UrlString;
  /** Raw authenticator data, base64url (when exposed by the client). */
  authenticatorData?: Base64UrlString;
  /** Transports reported for the new credential. */
  transports?: AuthenticatorTransport[];
  /** DER SubjectPublicKeyInfo of the new credential, base64url (when exposed). */
  publicKey?: Base64UrlString;
  /** COSE algorithm of the new credential's public key (when exposed). */
  publicKeyAlgorithm?: number;
}

/** JSON form of `AuthenticatorAssertionResponse` (authentication ceremony). */
export interface AuthenticatorAssertionResponseJson {
  /** Serialized client data, base64url. */
  clientDataJSON: Base64UrlString;
  /** Raw authenticator data, base64url. */
  authenticatorData: Base64UrlString;
  /** Assertion signature, base64url. */
  signature: Base64UrlString;
  /** User handle associated with the credential, base64url. */
  userHandle?: Base64UrlString;
}

/**
 * JSON form of a registration `PublicKeyCredential` — the payload of
 * `POST /api/v1/auth/passkeys/registration/verify`.
 */
export interface RegistrationResponseJson {
  /** Credential ID, base64url. */
  id: Base64UrlString;
  /** Raw credential ID, base64url (identical bytes to `id`). */
  rawId: Base64UrlString;
  /** Always the literal `public-key`. */
  type: 'public-key';
  /** Attestation response from the authenticator. */
  response: AuthenticatorAttestationResponseJson;
  /** Attachment modality actually used. */
  authenticatorAttachment?: AuthenticatorAttachment;
  /** Extension outputs produced by the client. */
  clientExtensionResults: AuthenticationExtensionsClientOutputsJson;
}

/**
 * JSON form of an authentication `PublicKeyCredential` — the payload of
 * `POST /api/v1/auth/passkeys/authentication/verify`.
 */
export interface AuthenticationResponseJson {
  /** Credential ID, base64url. */
  id: Base64UrlString;
  /** Raw credential ID, base64url (identical bytes to `id`). */
  rawId: Base64UrlString;
  /** Always the literal `public-key`. */
  type: 'public-key';
  /** Assertion response from the authenticator. */
  response: AuthenticatorAssertionResponseJson;
  /** Attachment modality actually used. */
  authenticatorAttachment?: AuthenticatorAttachment;
  /** Extension outputs produced by the client. */
  clientExtensionResults: AuthenticationExtensionsClientOutputsJson;
}
