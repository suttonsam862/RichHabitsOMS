/**
 * SHARED UPLOAD UTILITIES
 * Common utility functions for upload operations
 */

import crypto from 'crypto';
import path from 'path';
import { 
  EntityType, 
  ImagePurpose, 
  ProcessingProfile,
  ENTITY_STORAGE_CONFIG,
  PROCESSING_PROFILES,
  generateStoragePath,
  UploadMetadata
} from './uploadTypes';

// =============================================================================
// FILE UTILITIES
// =============================================================================

/**
 * Generate unique filename with timestamp and random component
 */
export function generateUniqueFilename(
  originalFilename: string,
  processingProfile?: ProcessingProfile
): string {
  const ext = path.extname(originalFilename).toLowerCase();
  const baseName = path.basename(originalFilename, ext);
  const timestamp = new Date().toISOString().split('T')[0];
  const randomId = crypto.randomBytes(8).toString('hex');
  
  let suffix = '';
  if (processingProfile && processingProfile !== 'original') {
    suffix = `_${processingProfile}`;
  }
  
  return `${timestamp}_${randomId}${suffix}${ext}`;
}

/**
 * Calculate file checksum for integrity verification
 */
export function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}

/**
 * Extract file extension and validate
 */
export function getFileExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return ext.startsWith('.') ? ext.slice(1) : ext;
}

/**
 * Determine content type from file extension
 */
export function getContentType(filename: string): string {
  const ext = getFileExtension(filename);
  
  const contentTypeMap: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'json': 'application/json'
  };
  
  return contentTypeMap[ext] || 'application/octet-stream';
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Comprehensive file validation
 */
export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateUploadFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  entityType: EntityType
): FileValidationResult {
  const result: FileValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };
  
  const config = ENTITY_STORAGE_CONFIG[entityType];
  
  // File size validation
  if (buffer.length > config.max_file_size) {
    result.valid = false;
    result.errors.push(
      `File size (${formatFileSize(buffer.length)}) exceeds maximum allowed size (${formatFileSize(config.max_file_size)})`
    );
  }
  
  // MIME type validation
  if (!config.allowed_mime_types.includes(mimeType)) {
    result.valid = false;
    result.errors.push(
      `File type '${mimeType}' is not allowed for ${entityType}. Allowed types: ${config.allowed_mime_types.join(', ')}`
    );
  }
  
  // Filename validation
  if (!filename || filename.trim().length === 0) {
    result.valid = false;
    result.errors.push('Filename cannot be empty');
  }
  
  // Security checks
  const suspiciousExtensions = ['.exe', '.bat', '.sh', '.cmd', '.scr', '.vbs', '.js'];
  const fileExt = path.extname(filename).toLowerCase();
  if (suspiciousExtensions.includes(fileExt)) {
    result.valid = false;
    result.errors.push(`File extension '${fileExt}' is not allowed for security reasons`);
  }
  
  // Image-specific validation
  if (mimeType.startsWith('image/')) {
    if (buffer.length < 100) {
      result.valid = false;
      result.errors.push('Image file appears to be corrupted or too small');
    }
    
    // Check for basic image headers
    const isValidImage = 
      (mimeType === 'image/jpeg' && buffer.slice(0, 3).toString('hex') === 'ffd8ff') ||
      (mimeType === 'image/png' && buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a') ||
      (mimeType === 'image/webp' && buffer.slice(8, 12).toString('ascii') === 'WEBP');
    
    if (!isValidImage && mimeType !== 'image/svg+xml') {
      result.warnings.push('Image file header validation failed - file may be corrupted');
    }
  }
  
  return result;
}

/**
 * Format file size for human readability
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// =============================================================================
// METADATA UTILITIES
// =============================================================================

/**
 * Create base upload metadata
 */
export function createBaseMetadata(
  originalFilename: string,
  fileSize: number,
  mimeType: string,
  uploadedById: string,
  processingProfile: ProcessingProfile = 'gallery'
): UploadMetadata {
  return {
    original_filename: originalFilename,
    file_size: fileSize,
    mime_type: mimeType,
    uploaded_at: new Date().toISOString(),
    uploaded_by_id: uploadedById,
    processing_profile: processingProfile,
    upload_session_id: generateSessionId()
  };
}

/**
 * Generate upload session ID for tracking
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Merge metadata objects safely
 */
export function mergeMetadata(
  base: UploadMetadata,
  additional: Partial<UploadMetadata>
): UploadMetadata {
  return {
    ...base,
    ...additional,
    custom: {
      ...base.custom,
      ...additional.custom
    }
  };
}

// =============================================================================
// PATH UTILITIES
// =============================================================================

/**
 * Generate full storage path with all components
 */
export function generateFullStoragePath(
  entityType: EntityType,
  entityId: string,
  purpose: ImagePurpose,
  filename: string,
  processingProfile?: ProcessingProfile
): {
  bucket: string;
  path: string;
  fullPath: string;
} {
  const config = ENTITY_STORAGE_CONFIG[entityType];
  const processedFilename = processingProfile 
    ? generateUniqueFilename(filename, processingProfile)
    : sanitizeFilename(filename);
  
  const path = generateStoragePath(entityType, entityId, purpose, processedFilename);
  
  return {
    bucket: config.bucket,
    path: path,
    fullPath: `${config.bucket}/${path}`
  };
}

/**
 * Parse storage path to extract components
 */
export function parseStoragePath(fullPath: string): {
  bucket?: string;
  entityType?: string;
  entityId?: string;
  purpose?: string;
  filename?: string;
} {
  const parts = fullPath.split('/');
  
  if (parts.length < 4) {
    return {};
  }
  
  return {
    bucket: parts[0],
    entityType: parts[1],
    entityId: parts[2],
    purpose: parts[3],
    filename: parts[4]
  };
}

// =============================================================================
// ERROR HANDLING UTILITIES
// =============================================================================

export interface UploadError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
}

/**
 * Create standardized upload error
 */
export function createUploadError(
  code: string,
  message: string,
  retryable: boolean = false,
  details?: any
): UploadError {
  return {
    code,
    message,
    details,
    retryable
  };
}

/**
 * Common upload error codes and messages
 */
export const UPLOAD_ERRORS = {
  FILE_TOO_LARGE: (maxSize: number) => createUploadError(
    'FILE_TOO_LARGE',
    `File exceeds maximum size limit of ${formatFileSize(maxSize)}`,
    false
  ),
  
  INVALID_FILE_TYPE: (allowedTypes: string[]) => createUploadError(
    'INVALID_FILE_TYPE',
    `File type not allowed. Supported types: ${allowedTypes.join(', ')}`,
    false
  ),
  
  UPLOAD_FAILED: (reason?: string) => createUploadError(
    'UPLOAD_FAILED',
    `Upload failed${reason ? `: ${reason}` : ''}`,
    true
  ),
  
  PROCESSING_FAILED: (stage: string) => createUploadError(
    'PROCESSING_FAILED',
    `Image processing failed at stage: ${stage}`,
    true
  ),
  
  STORAGE_ERROR: (message: string) => createUploadError(
    'STORAGE_ERROR',
    `Storage operation failed: ${message}`,
    true
  ),
  
  ENTITY_NOT_FOUND: (entityType: string, entityId: string) => createUploadError(
    'ENTITY_NOT_FOUND',
    `${entityType} with ID ${entityId} not found`,
    false
  ),
  
  PERMISSION_DENIED: () => createUploadError(
    'PERMISSION_DENIED',
    'You do not have permission to upload to this entity',
    false
  ),
  
  VIRUS_DETECTED: () => createUploadError(
    'VIRUS_DETECTED',
    'File failed security scan - upload rejected',
    false
  )
} as const;

// =============================================================================
// BATCH PROCESSING UTILITIES
// =============================================================================

/**
 * Split array into chunks for batch processing
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Generate batch ID for tracking multiple uploads
 */
export function generateBatchId(): string {
  return `batch_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Calculate estimated processing time based on file sizes
 */
export function estimateProcessingTime(fileSizes: number[]): number {
  // Rough estimate: 1 second per MB + base processing time
  const totalSizeMB = fileSizes.reduce((sum, size) => sum + size, 0) / (1024 * 1024);
  const baseTimeMs = 2000; // 2 seconds base time
  const processingTimeMs = totalSizeMB * 1000; // 1 second per MB
  
  return Math.round(baseTimeMs + processingTimeMs);
}

// =============================================================================
// AUDIT UTILITIES
// =============================================================================

/**
 * Create audit trail entry for upload
 */
export function createAuditEntry(
  action: string,
  entityType: EntityType,
  entityId: string,
  userId: string,
  metadata?: any
): any {
  return {
    action,
    entity_type: entityType,
    entity_id: entityId,
    user_id: userId,
    timestamp: new Date().toISOString(),
    metadata: metadata || {}
  };
}