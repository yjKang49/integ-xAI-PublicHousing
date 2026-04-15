/**
 * media-upload.service.ts
 *
 * Online media upload flow (used when network is available):
 *   1. POST /api/v1/media/upload/init  → { mediaId, uploadUrl, storageKey }
 *   2. PUT {uploadUrl} with blob (direct to S3/MinIO)
 *   3. PATCH /api/v1/media/upload/{mediaId}/complete
 *
 * Offline flow: photos are saved as PouchDB attachments by defect-form.
 * SyncQueueService picks them up and calls this service once online.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UploadInitResponse {
  mediaId: string;
  uploadUrl: string;
  storageKey: string;
}

export interface UploadResult {
  mediaId: string;
  storageKey: string;
  success: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class MediaUploadService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/media`;

  /**
   * Full online upload: init presigned URL → PUT blob to S3 → complete.
   * @returns mediaId to include in defect.mediaIds
   */
  async uploadPhoto(
    blob: Blob,
    options: {
      fileName: string;
      defectId: string;
      complexId: string;
      capturedAt?: string;
      gpsLat?: number;
      gpsLng?: number;
    },
  ): Promise<UploadResult> {
    // Step 1: Get pre-signed URL
    const initRes = await firstValueFrom(
      this.http.post<any>(`${this.base}/upload/init`, {
        fileName: options.fileName,
        mimeType: blob.type || 'image/jpeg',
        fileSize: blob.size,
        entityType: 'defect',
        entityId: options.defectId,
        complexId: options.complexId,
      }),
    );

    const { mediaId, uploadUrl } = (initRes.data ?? initRes) as UploadInitResponse;

    // Step 2: PUT blob directly to S3/MinIO (no auth header — pre-signed URL handles auth)
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': blob.type || 'image/jpeg' },
    });

    if (!putRes.ok) {
      return { mediaId, storageKey: '', success: false, error: `S3 PUT failed: ${putRes.status}` };
    }

    // Step 3: Confirm upload to API
    await firstValueFrom(
      this.http.patch(`${this.base}/upload/${encodeURIComponent(mediaId)}/complete`, {
        capturedAt: options.capturedAt ?? new Date().toISOString(),
        gpsLat: options.gpsLat,
        gpsLng: options.gpsLng,
      }),
    );

    return { mediaId, storageKey: '', success: true };
  }

  /**
   * Get a download URL for a media item by its mediaId.
   */
  async getDownloadUrl(mediaId: string): Promise<string | null> {
    try {
      const res = await firstValueFrom(
        this.http.get<any>(`${this.base}/${encodeURIComponent(mediaId)}/url`),
      );
      return (res.data ?? res).url ?? null;
    } catch {
      return null;
    }
  }
}
