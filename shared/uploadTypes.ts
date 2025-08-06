/**
 * SHARED UPLOAD TYPES AND SCHEMAS
 * Centralized types for all upload operations across the platform
 */

import { z } from 'zod';

// =============================================================================
// CORE UPLOAD TYPES
// =============================================================================

export type EntityType = 
  | 'catalog_item'
  | 'customer' 
  | 'user_profile'
  | 'organization'
  | 'order'
  | 'design_task'
  | 'production_task'
  | 'product_library'
  | 'manufacturer';

export type ImagePurpose = 
  | 'profile'
  | 'gallery'
  | 'production'
  | 'design'
  | 'logo'
  | 'thumbnail'
  | 'hero'
  | 'attachment'
  | 'mockup'
  | 'product_photo'
  | 'design_proof'
  | 'size_chart'
  | 'color_reference'
  | 'technical_drawing';

export type ProcessingProfile = 
  | 'thumbnail'    // 150x150, high compression
  | 'profile'      // 400x400, medium compression
  | 'gallery'      // 1200x1200, medium compression
  | 'hero'         // 1920x1080, low compression
  | 'production'   // 2400x2400, low compression
  | 'original';    // No processing

// =============================================================================
// METADATA STRUCTURES
// =============================================================================

export interface BaseUploadMetadata {
  original_filename: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  uploaded_by_id: string;
  upload_session_id?: string;
  processing_profile: ProcessingProfile;
  checksum?: string;
}

export interface ImageProcessingMetadata {
  original_dimensions?: {
    width: number;
    height: number;
  };
  processed_dimensions?: {
    width: number;
    height: number;
  };
  compression_ratio?: number;
  format_converted?: boolean;
  processing_time_ms?: number;
}

export interface EntityRelationMetadata {
  entity_type: EntityType;
  entity_id: string;
  image_purpose: ImagePurpose;
  is_primary?: boolean;
  display_order?: number;
  alt_text?: string;
  caption?: string;
}

export interface SecurityMetadata {
  virus_scan_result?: 'clean' | 'infected' | 'pending';
  access_level: 'public' | 'private' | 'restricted';
  allowed_roles?: string[];
  expires_at?: string;
}

export interface AuditMetadata {
  upload_ip?: string;
  user_agent?: string;
  api_version?: string;
  client_type?: 'web' | 'mobile' | 'api';
  workflow_id?: string;
  trace_id?: string;
}

// Combined metadata interface
export interface UploadMetadata extends BaseUploadMetadata {
  image_processing?: ImageProcessingMetadata;
  entity_relation?: EntityRelationMetadata;
  security?: SecurityMetadata;
  audit?: AuditMetadata;
  custom?: Record<string, any>;
}

// =============================================================================
// REQUEST/RESPONSE SCHEMAS
// =============================================================================

export const uploadRequestSchema = z.object({
  entity_type: z.enum([
    'catalog_item', 'customer', 'user_profile', 'organization', 
    'order', 'design_task', 'production_task', 'product_library', 'manufacturer'
  ]),
  entity_id: z.string().uuid(),
  image_purpose: z.enum([
    'profile', 'gallery', 'production', 'design', 'logo', 'thumbnail', 
    'hero', 'attachment', 'mockup', 'product_photo', 'design_proof',
    'size_chart', 'color_reference', 'technical_drawing'
  ]),
  processing_profile: z.enum([
    'thumbnail', 'profile', 'gallery', 'hero', 'production', 'original'
  ]).default('gallery'),
  alt_text: z.string().optional(),
  caption: z.string().optional(),
  is_primary: z.boolean().default(false),
  access_level: z.enum(['public', 'private', 'restricted']).default('private'),
  custom_metadata: z.record(z.any()).optional()
});

export const bulkUploadRequestSchema = z.object({
  uploads: z.array(uploadRequestSchema),
  batch_metadata: z.object({
    batch_id: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(['low', 'normal', 'high']).default('normal')
  }).optional()
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;
export type BulkUploadRequest = z.infer<typeof bulkUploadRequestSchema>;

// =============================================================================
// STORAGE CONFIGURATION
// =============================================================================

export interface StorageConfig {
  bucket: string;
  path_template: string; // e.g., "{entity_type}/{entity_id}/{purpose}/{filename}"
  max_file_size: number;
  allowed_mime_types: string[];
  enable_compression: boolean;
  enable_virus_scan: boolean;
  retention_days?: number;
}

export const ENTITY_STORAGE_CONFIG: Record<EntityType, StorageConfig> = {
  catalog_item: {
    bucket: 'catalog-images',
    path_template: 'catalog_items/{entity_id}/{purpose}/{filename}',
    max_file_size: 10 * 1024 * 1024, // 10MB
    allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
    enable_compression: true,
    enable_virus_scan: true,
    retention_days: 365
  },
  customer: {
    bucket: 'customer-assets',
    path_template: 'customers/{entity_id}/{purpose}/{filename}',
    max_file_size: 5 * 1024 * 1024, // 5MB
    allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
    enable_compression: true,
    enable_virus_scan: true,
    retention_days: 180
  },
  user_profile: {
    bucket: 'user-profiles',
    path_template: 'users/{entity_id}/{purpose}/{filename}',
    max_file_size: 2 * 1024 * 1024, // 2MB
    allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
    enable_compression: true,
    enable_virus_scan: true,
    retention_days: 90
  },
  organization: {
    bucket: 'organization-assets',
    path_template: 'organizations/{entity_id}/{purpose}/{filename}',
    max_file_size: 5 * 1024 * 1024, // 5MB
    allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    enable_compression: true,
    enable_virus_scan: true,
    retention_days: 365
  },
  order: {
    bucket: 'order-attachments',
    path_template: 'orders/{entity_id}/{purpose}/{filename}',
    max_file_size: 20 * 1024 * 1024, // 20MB
    allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    enable_compression: true,
    enable_virus_scan: true,
    retention_days: 2555 // 7 years for compliance
  },
  design_task: {
    bucket: 'design-assets',
    path_template: 'designs/{entity_id}/{purpose}/{filename}',
    max_file_size: 50 * 1024 * 1024, // 50MB
    allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/svg+xml'],
    enable_compression: false, // Preserve design quality
    enable_virus_scan: true,
    retention_days: 365
  },
  production_task: {
    bucket: 'production-assets',
    path_template: 'production/{entity_id}/{purpose}/{filename}',
    max_file_size: 25 * 1024 * 1024, // 25MB
    allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
    enable_compression: true,
    enable_virus_scan: true,
    retention_days: 730 // 2 years
  },
  product_library: {
    bucket: 'product-library',
    path_template: 'products/{entity_id}/{purpose}/{filename}',
    max_file_size: 15 * 1024 * 1024, // 15MB
    allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
    enable_compression: true,
    enable_virus_scan: true,
    retention_days: 1095 // 3 years
  },
  manufacturer: {
    bucket: 'manufacturer-assets',
    path_template: 'manufacturers/{entity_id}/{purpose}/{filename}',
    max_file_size: 10 * 1024 * 1024, // 10MB
    allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
    enable_compression: true,
    enable_virus_scan: true,
    retention_days: 365
  }
};

// =============================================================================
// PROCESSING PROFILES
// =============================================================================

export interface ProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  background?: string;
  progressive?: boolean;
  strip_metadata?: boolean;
}

export const PROCESSING_PROFILES: Record<ProcessingProfile, ProcessingOptions> = {
  thumbnail: {
    width: 150,
    height: 150,
    quality: 60,
    format: 'webp',
    fit: 'cover',
    progressive: true,
    strip_metadata: true
  },
  profile: {
    width: 400,
    height: 400,
    quality: 75,
    format: 'webp',
    fit: 'cover',
    progressive: true,
    strip_metadata: true
  },
  gallery: {
    width: 1200,
    height: 1200,
    quality: 85,
    format: 'webp',
    fit: 'inside',
    progressive: true,
    strip_metadata: true
  },
  hero: {
    width: 1920,
    height: 1080,
    quality: 90,
    format: 'webp',
    fit: 'cover',
    progressive: true,
    strip_metadata: true
  },
  production: {
    width: 2400,
    height: 2400,
    quality: 95,
    format: 'jpeg',
    fit: 'inside',
    progressive: false,
    strip_metadata: false
  },
  original: {
    // No processing applied
    strip_metadata: true
  }
};

// =============================================================================
// UPLOAD RESULT TYPES
// =============================================================================

export interface UploadResult {
  success: boolean;
  image_asset_id?: string;
  public_url?: string;
  secure_url?: string;
  storage_path?: string;
  processing_results?: {
    profile: ProcessingProfile;
    original_size: number;
    processed_size: number;
    dimensions: { width: number; height: number };
  };
  metadata?: UploadMetadata;
  error?: string;
  error_code?: string;
}

export interface BulkUploadResult {
  success: boolean;
  batch_id: string;
  results: (UploadResult & { index: number })[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    total_size: number;
    processing_time_ms: number;
  };
  errors?: string[];
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function validateFileType(mimeType: string, entityType: EntityType): boolean {
  const config = ENTITY_STORAGE_CONFIG[entityType];
  return config.allowed_mime_types.includes(mimeType);
}

export function validateFileSize(size: number, entityType: EntityType): boolean {
  const config = ENTITY_STORAGE_CONFIG[entityType];
  return size <= config.max_file_size;
}

export function generateStoragePath(
  entityType: EntityType,
  entityId: string,
  purpose: ImagePurpose,
  filename: string
): string {
  const config = ENTITY_STORAGE_CONFIG[entityType];
  return config.path_template
    .replace('{entity_type}', entityType)
    .replace('{entity_id}', entityId)
    .replace('{purpose}', purpose)
    .replace('{filename}', filename);
}

export function generateUploadId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}