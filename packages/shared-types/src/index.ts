/**
 * @dlv/shared-types — enums, DTOs and API contract types shared by apps/api
 * and apps/web (phase-2-contracts §@dlv/shared-types).
 */

export { Role } from './common/role.js';
export { DocumentType } from './common/document-type.js';
export type { ProblemDetails } from './common/problem-details.js';

export type { UserDto } from './identity/user.dto.js';
export type { AuthTokensDto, LoginResultDto } from './identity/auth.dto.js';
export type { SessionDto } from './identity/session.dto.js';
export type {
  RegisterRequest,
  LoginRequest,
  TotpVerifyRequest,
  PasskeyRegistrationStart,
  PasskeyRegistrationFinish,
  PasskeyAuthStart,
  PasskeyAuthFinish,
} from './identity/auth-requests.dto.js';
export type {
  Base64UrlString,
  AuthenticatorTransport,
  AuthenticatorAttachment,
  UserVerificationRequirement,
  ResidentKeyRequirement,
  AttestationConveyancePreference,
  PublicKeyCredentialHint,
  PublicKeyCredentialRpEntityJson,
  PublicKeyCredentialUserEntityJson,
  PublicKeyCredentialParametersJson,
  PublicKeyCredentialDescriptorJson,
  AuthenticatorSelectionCriteriaJson,
  AuthenticationExtensionsClientInputsJson,
  AuthenticationExtensionsClientOutputsJson,
  PublicKeyCredentialCreationOptionsJson,
  PublicKeyCredentialRequestOptionsJson,
  AuthenticatorAttestationResponseJson,
  AuthenticatorAssertionResponseJson,
  RegistrationResponseJson,
  AuthenticationResponseJson,
} from './identity/webauthn.js';

export { DocumentStatus, ScanVerdict, VaultKind } from './common/vault-enums.js';
export type {
  DocumentDto,
  DocumentVersionDto,
  DocumentCategoryDto,
  TagDto,
} from './vault/document.dto.js';
export type {
  UploadInitRequest,
  UploadInitResponse,
  UploadPartUrl,
  UploadedPart,
  UploadCompleteRequest,
} from './vault/upload.dto.js';
export type { DocumentSearchResult } from './vault/search.dto.js';
export type { TimelineEntryDto } from './vault/timeline.dto.js';
export type {
  ClientVaultItemDto,
  CreateClientVaultItemRequest,
  RecoveryKitInfoDto,
} from './vault/client-vault.dto.js';

export { SharePermission, ShareStatus, AccessRequestStatus } from './common/sharing-enums.js';
export {
  RelationshipRole,
  EmergencyScope,
  EmergencyStatus,
  DeathVerificationStatus,
} from './common/estate-enums.js';
export type {
  DocumentShareDto,
  CreateShareRequest,
  SecureLinkDto,
  CreateSecureLinkRequest,
  AccessRequestDto,
} from './sharing/share.dto.js';
export type {
  BeneficiaryDto,
  CreateBeneficiaryRequest,
  ExecutorDto,
  CreateExecutorRequest,
  EmergencyAccessRequestDto,
  CreateEmergencyAccessRequest,
  EmergencyAccessGrantDto,
  DeathVerificationDto,
  SubmitDeathVerificationRequest,
} from './estate/estate.dto.js';

export { SignatureRequestStatus, SignatureMethod } from './common/signature-enums.js';
export type {
  SignatureRequestDto,
  CreateSignatureRequest,
  CompleteSignatureRequest,
  SignatureDto,
  SealVerificationDto,
} from './signature/signature.dto.js';

export { ConsentPurpose, ConsentStatus } from './common/consent-enums.js';
export { LegalHoldScope, LegalHoldStatus } from './common/legal-hold-enums.js';
export { DataSubjectRequestType, DataSubjectRequestStatus } from './common/dsr-enums.js';
export type { ConsentDto, RecordConsentRequest } from './compliance/consent.dto.js';
export type { LegalHoldDto, PlaceLegalHoldRequest } from './compliance/legal-hold.dto.js';
export type {
  DataSubjectRequestDto,
  DataSubjectExportDto,
  ErasureResultDto,
} from './compliance/dsr.dto.js';

export { PlanTier, BillingInterval, BillingCurrency, SubscriptionStatus } from './common/billing-enums.js';
export type {
  EntitlementsDto,
  PlanDto,
  SubscriptionDto,
  UsageDto,
  CreateCheckoutRequest,
  BillingRedirectDto,
} from './billing/billing.dto.js';

export {
  NotificationCategory,
  NotificationChannel,
  NotificationStatus,
  ReminderStatus,
} from './common/notification-enums.js';
export type {
  NotificationDto,
  NotificationPreferenceDto,
  UpdatePreferenceRequest,
  ReminderDto,
  CreateReminderRequest,
  PushSubscriptionRequest,
} from './notification/notification.dto.js';

export type { AuditEventDto, AuditSearchResultDto, UserSupportSummaryDto } from './admin/admin.dto.js';

export { AiFeature } from './common/ai-enums.js';
export type {
  AiPreferenceDto,
  UpdateAiPreferenceRequest,
  AiInsightDto,
  GenerateInsightRequest,
  AiRecommendationDto,
  CompletenessReportDto,
  AiSearchRequest,
  AiSearchHitDto,
  AiSearchResultDto,
  AiUsageSummaryDto,
} from './ai/ai.dto.js';

export {
  ClientRelationshipStatus,
  ApiKeyStatus,
  WebhookStatus,
  WebhookDeliveryStatus,
  DATA_REGIONS,
  API_KEY_SCOPES,
} from './common/organisation-enums.js';
export type { DataRegion, ApiKeyScope } from './common/organisation-enums.js';
export type {
  ClientRelationshipDto,
  CreateClientRelationshipRequest,
  RespondClientRelationshipRequest,
  OrgUsageDto,
  ResidencyDto,
  UpdateResidencyRequest,
  SsoConnectionDto,
  UpsertSsoConnectionRequest,
  SsoStartDto,
} from './organisation/organisation.dto.js';
export { WEBHOOK_EVENT_TYPES } from './integration/integration.dto.js';
export type {
  ApiKeyDto,
  CreateApiKeyRequest,
  CreatedApiKeyDto,
  WebhookDto,
  CreateWebhookRequest,
  CreatedWebhookDto,
  WebhookDeliveryDto,
  WebhookEventType,
} from './integration/integration.dto.js';
