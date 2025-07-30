/**
 * UPLOAD PROGRESS SERVICE
 * Service for handling file uploads to Supabase with real-time progress tracking
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export interface UploadOptions {
  bucket: string;
  path: string;
  file: File;
  onProgress?: (progress: number, uploadedBytes: number, totalBytes: number) => void;
  onComplete?: (url: string, path: string) => void;
  onError?: (error: string) => void;
  chunkSize?: number;
  maxRetries?: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

class UploadProgressService {
  private supabase = createClient(supabaseUrl, supabaseAnonKey);
  private activeUploads = new Map<string, AbortController>();

  /**
   * Upload file with real-time progress tracking
   */
  async uploadWithProgress(
    uploadId: string,
    options: UploadOptions
  ): Promise<UploadResult> {
    const { bucket, path, file, onProgress, onComplete, onError, chunkSize = 1024 * 1024 } = options;

    try {
      // Create abort controller for cancellation
      const abortController = new AbortController();
      this.activeUploads.set(uploadId, abortController);

      // Check if file is small enough for single upload
      if (file.size <= chunkSize) {
        return await this.singleUpload(uploadId, options, abortController.signal);
      } else {
        return await this.chunkedUpload(uploadId, options, abortController.signal);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Upload failed';
      onError?.(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.activeUploads.delete(uploadId);
    }
  }

  /**
   * Single file upload with progress tracking
   */
  private async singleUpload(
    uploadId: string,
    options: UploadOptions,
    signal: AbortSignal
  ): Promise<UploadResult> {
    const { bucket, path, file, onProgress, onComplete, onError } = options;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Handle abort signal
      if (signal.aborted) {
        reject(new Error('Upload cancelled'));
        return;
      }

      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new Error('Upload cancelled'));
      });

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress?.(progress, event.loaded, event.total);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            const publicUrl = this.supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
            onComplete?.(publicUrl, path);
            resolve({ success: true, url: publicUrl, path });
          } catch (error) {
            const errorMessage = 'Failed to parse upload response';
            onError?.(errorMessage);
            resolve({ success: false, error: errorMessage });
          }
        } else {
          const errorMessage = `Upload failed with status ${xhr.status}`;
          onError?.(errorMessage);
          resolve({ success: false, error: errorMessage });
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        const errorMessage = 'Network error during upload';
        onError?.(errorMessage);
        resolve({ success: false, error: errorMessage });
      });

      // Prepare form data
      const formData = new FormData();
      formData.append('file', file);

      // Get upload URL and headers
      this.getUploadUrl(bucket, path).then(({ url, headers }) => {
        xhr.open('POST', url);
        
        // Set headers
        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });

        xhr.send(formData);
      }).catch(error => {
        onError?.(error.message);
        resolve({ success: false, error: error.message });
      });
    });
  }

  /**
   * Chunked upload for large files
   */
  private async chunkedUpload(
    uploadId: string,
    options: UploadOptions,
    signal: AbortSignal
  ): Promise<UploadResult> {
    const { bucket, path, file, onProgress, onComplete, onError, chunkSize = 1024 * 1024 } = options;

    try {
      const totalChunks = Math.ceil(file.size / chunkSize);
      let uploadedBytes = 0;

      // Start multipart upload
      const { data: multipartData, error: multipartError } = await this.supabase.storage
        .from(bucket)
        .createSignedUploadUrl(path);

      if (multipartError) {
        throw new Error(multipartError.message);
      }

      const uploadUrl = multipartData.signedUrl;
      const uploadToken = multipartData.token;

      // Upload chunks
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        if (signal.aborted) {
          throw new Error('Upload cancelled');
        }

        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        await this.uploadChunk(uploadUrl, uploadToken, chunk, chunkIndex, signal);
        
        uploadedBytes += chunk.size;
        const progress = Math.round((uploadedBytes / file.size) * 100);
        onProgress?.(progress, uploadedBytes, file.size);
      }

      // Complete multipart upload
      const publicUrl = this.supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      onComplete?.(publicUrl, path);

      return { success: true, url: publicUrl, path };

    } catch (error: any) {
      const errorMessage = error.message || 'Chunked upload failed';
      onError?.(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Upload a single chunk
   */
  private async uploadChunk(
    uploadUrl: string,
    uploadToken: string,
    chunk: Blob,
    chunkIndex: number,
    signal: AbortSignal
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new Error('Upload cancelled'));
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Chunk upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during chunk upload'));
      });

      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('uploadToken', uploadToken);

      xhr.open('POST', uploadUrl);
      xhr.send(formData);
    });
  }

  /**
   * Get upload URL and headers for direct upload
   */
  private async getUploadUrl(bucket: string, path: string): Promise<{ url: string; headers: Record<string, string> }> {
    // For Supabase, we can use the REST API directly
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error) {
      throw new Error(error.message);
    }

    return {
      url: data.signedUrl,
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'x-upsert': 'true'
      }
    };
  }

  /**
   * Cancel an active upload
   */
  cancelUpload(uploadId: string): boolean {
    const controller = this.activeUploads.get(uploadId);
    if (controller) {
      controller.abort();
      this.activeUploads.delete(uploadId);
      return true;
    }
    return false;
  }

  /**
   * Cancel all active uploads
   */
  cancelAllUploads(): void {
    this.activeUploads.forEach((controller, uploadId) => {
      controller.abort();
    });
    this.activeUploads.clear();
  }

  /**
   * Get active upload count
   */
  getActiveUploadCount(): number {
    return this.activeUploads.size;
  }

  /**
   * Check if upload is active
   */
  isUploadActive(uploadId: string): boolean {
    return this.activeUploads.has(uploadId);
  }
}

export const uploadProgressService = new UploadProgressService();