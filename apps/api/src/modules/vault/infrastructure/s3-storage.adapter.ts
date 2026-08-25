import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  PutObjectRetentionCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable } from '@nestjs/common';

import { ENV } from '../../../common/tokens';
import type { CompletedPart, PartUrl, RetentionSpec, StoragePort } from '../application/ports';
import type { Env } from '@dlv/config';

/** S3-backed {@link StoragePort}: quarantine (multipart) + documents buckets. */
@Injectable()
export class S3StorageAdapter implements StoragePort {
  private readonly s3: S3Client;

  constructor(@Inject(ENV) private readonly env: Env) {
    this.s3 = new S3Client({ region: env.AWS_REGION });
  }

  async initQuarantineUpload(
    key: string,
    contentType: string,
    partCount: number,
  ): Promise<{ uploadId: string; parts: PartUrl[] }> {
    const created = await this.s3.send(
      new CreateMultipartUploadCommand({
        Bucket: this.env.QUARANTINE_BUCKET,
        Key: key,
        ContentType: contentType,
        ServerSideEncryption: 'aws:kms',
      }),
    );
    const uploadId = created.UploadId ?? '';
    const parts: PartUrl[] = [];
    for (let n = 1; n <= partCount; n++) {
      const url = await getSignedUrl(
        this.s3,
        new UploadPartCommand({ Bucket: this.env.QUARANTINE_BUCKET, Key: key, UploadId: uploadId, PartNumber: n }),
        { expiresIn: this.env.UPLOAD_URL_TTL_SECONDS },
      );
      parts.push({ partNumber: n, url });
    }
    return { uploadId, parts };
  }

  async completeQuarantineUpload(key: string, uploadId: string, parts: CompletedPart[]): Promise<void> {
    await this.s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.env.QUARANTINE_BUCKET,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts.map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })) },
      }),
    );
  }

  async readQuarantine(key: string): Promise<Uint8Array> {
    const res = await this.s3.send(new GetObjectCommand({ Bucket: this.env.QUARANTINE_BUCKET, Key: key }));
    if (!res.Body) throw new Error('Empty S3 object body.');
    return res.Body.transformToByteArray();
  }

  async deleteQuarantine(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.env.QUARANTINE_BUCKET, Key: key }));
  }

  async putDocument(key: string, body: Uint8Array, retention?: RetentionSpec): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.env.DOCUMENTS_BUCKET,
        Key: key,
        Body: body,
        ContentType: 'application/octet-stream',
        ServerSideEncryption: 'aws:kms',
        ...(retention
          ? { ObjectLockMode: retention.mode, ObjectLockRetainUntilDate: retention.retainUntil }
          : {}),
      }),
    );
  }

  async applyRetention(key: string, retention: RetentionSpec): Promise<void> {
    await this.s3.send(
      new PutObjectRetentionCommand({
        Bucket: this.env.DOCUMENTS_BUCKET,
        Key: key,
        Retention: { Mode: retention.mode, RetainUntilDate: retention.retainUntil },
      }),
    );
  }

  async presignDocumentDownload(key: string): Promise<string> {
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.env.DOCUMENTS_BUCKET, Key: key }), {
      expiresIn: this.env.UPLOAD_URL_TTL_SECONDS,
    });
  }
}
