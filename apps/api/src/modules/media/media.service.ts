// apps/api/src/modules/media/media.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import { DefectMedia, MediaType } from '@ax/shared';
import { MediaUploadInitRequest, MediaUploadInitResponse } from '@ax/shared';

const UPLOAD_URL_EXPIRY = 600;    // 10 minutes
const DOWNLOAD_URL_EXPIRY = 3600; // 1 hour

@Injectable()
export class MediaService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly couch: CouchService,
    private readonly config: ConfigService,
  ) {
    this.s3 = new S3Client({
      endpoint: config.get<string>('S3_ENDPOINT'),
      region: config.get<string>('S3_REGION', 'ap-northeast-2'),
      credentials: {
        accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID') ?? config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
        secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY') ?? config.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
      },
      forcePathStyle: true, // required for MinIO
    });
    this.bucket = config.get<string>('S3_BUCKET', 'ax-media');
  }

  async initUpload(
    orgId: string,
    dto: MediaUploadInitRequest,
    userId: string,
  ): Promise<MediaUploadInitResponse> {
    const mediaId = `defectMedia:${orgId}:img_${Date.now()}_${uuid().slice(0, 8)}`;
    const ext = dto.fileName.split('.').pop() ?? 'jpg';
    const storageKey = `${dto.complexId}/${dto.entityType}/${dto.entityId}/${Date.now()}_${uuid().slice(0, 8)}.${ext}`;

    // Create placeholder doc
    const now = new Date().toISOString();
    const doc: DefectMedia = {
      _id: mediaId,
      docType: 'defectMedia',
      orgId,
      defectId: dto.entityId,
      sessionId: '',
      complexId: dto.complexId,
      mediaType: MediaType.PHOTO,
      fileName: dto.fileName,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType,
      storageKey,
      capturedAt: now,
      capturedBy: userId,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };
    await this.couch.create(orgId, doc);

    // Generate S3 pre-signed PUT URL
    const putCommand = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: dto.mimeType,
      ContentLength: dto.fileSize,
      Metadata: {
        orgId,
        entityId: dto.entityId,
        uploadedBy: userId,
      },
    });

    const uploadUrl = await getSignedUrl(this.s3, putCommand, { expiresIn: UPLOAD_URL_EXPIRY });

    return { mediaId, uploadUrl, storageKey };
  }

  async completeUpload(
    orgId: string,
    mediaId: string,
    dto: { capturedAt?: string; gpsLat?: number; gpsLng?: number },
    userId: string,
  ): Promise<DefectMedia> {
    const doc = await this.couch.findById<DefectMedia>(orgId, mediaId);
    if (!doc) throw new Error(`Media ${mediaId} not found`);

    // Verify upload completed
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: doc.storageKey }));
    } catch {
      throw new Error('Upload not completed — file not found in S3');
    }

    const updated: DefectMedia = {
      ...doc,
      capturedAt: dto.capturedAt ?? doc.capturedAt,
      gpsLat: dto.gpsLat,
      gpsLng: dto.gpsLng,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };
    return this.couch.update(orgId, updated);
  }

  async getDownloadUrl(storageKey: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: storageKey });
    return getSignedUrl(this.s3, command, { expiresIn: DOWNLOAD_URL_EXPIRY });
  }

  /** Upload a raw buffer directly to S3 (used by report generator) */
  async uploadBuffer(buffer: Buffer, storageKey: string, contentType: string): Promise<void> {
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      Body: buffer,
      ContentType: contentType,
    }));
  }

  /** Alias for getDownloadUrl — returns a pre-signed GET URL */
  async getPresignedUrl(storageKey: string): Promise<string> {
    return this.getDownloadUrl(storageKey);
  }

  async getDownloadUrlByMediaId(orgId: string, mediaId: string): Promise<{ url: string; expiresIn: number }> {
    const doc = await this.couch.findById<DefectMedia>(orgId, mediaId);
    if (!doc || doc._deleted) throw new Error(`Media ${mediaId} not found`);
    const url = await this.getDownloadUrl(doc.storageKey);
    return { url, expiresIn: DOWNLOAD_URL_EXPIRY };
  }

  async delete(orgId: string, mediaId: string, userId: string): Promise<void> {
    const doc = await this.couch.findById<DefectMedia>(orgId, mediaId);
    if (!doc) return;

    // Schedule S3 cleanup (async — don't block)
    this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: doc.storageKey })).catch(
      (err) => console.warn(`S3 delete failed for ${doc.storageKey}:`, err.message),
    );

    await this.couch.softDelete(orgId, mediaId);
  }

  /**
   * Process PouchDB attachment sync:
   * Called by worker when a defectMedia doc arrives with _attachments.
   * Uploads the attachment to S3, then removes it from the CouchDB doc.
   */
  async processPouchAttachment(orgId: string, mediaId: string): Promise<void> {
    const db = await this.couch.getOrgDb(orgId);
    const doc = await db.get(mediaId, { attachments: true }) as any;

    if (!doc._attachments) return;

    for (const [attachmentName, attachment] of Object.entries(doc._attachments as Record<string, any>)) {
      if (doc.storageKey) continue; // already uploaded

      const buffer = Buffer.from(attachment.data, 'base64');
      const storageKey = `${doc.complexId}/offline/${doc.defectId}/${Date.now()}_${attachmentName}`;

      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: attachment.content_type,
      }));

      // Update doc: set storageKey, remove _attachments
      const updatedDoc = { ...doc, storageKey, _attachments: undefined };
      delete updatedDoc._attachments;
      await db.insert(updatedDoc);
    }
  }
}
