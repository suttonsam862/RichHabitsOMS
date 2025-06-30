
import { supabase } from './db';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface UploadResult {
  success: boolean;
  url?: string;
  publicUrl?: string;
  error?: string;
  fileName?: string;
}

export class SupabaseImageStorage {
  private readonly bucketName = 'catalog-images';
  private readonly measurementBucketName = 'measurement-charts';

  /**
   * Initialize storage buckets if they don't exist
   */
  async initializeBuckets(): Promise<void> {
    try {
      // Check if catalog images bucket exists
      const { data: catalogBucket } = await supabase.storage.getBucket(this.bucketName);
      
      if (!catalogBucket) {
        await supabase.storage.createBucket(this.bucketName, {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          fileSizeLimit: 5242880 // 5MB
        });
        console.log(`Created ${this.bucketName} bucket`);
      }

      // Check if measurement charts bucket exists
      const { data: measurementBucket } = await supabase.storage.getBucket(this.measurementBucketName);
      
      if (!measurementBucket) {
        await supabase.storage.createBucket(this.measurementBucketName, {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
          fileSizeLimit: 10485760 // 10MB for measurement charts
        });
        console.log(`Created ${this.measurementBucketName} bucket`);
      }
    } catch (error) {
      console.error('Error initializing storage buckets:', error);
    }
  }

  /**
   * Process and optimize image before upload
   */
  private async processImage(
    buffer: Buffer, 
    options: ImageProcessingOptions = {}
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const { 
      width = 800, 
      height = 800, 
      quality = 80, 
      format = 'jpeg' 
    } = options;

    let processedBuffer: Buffer;
    let contentType: string;

    try {
      const sharpInstance = sharp(buffer)
        .resize(width, height, { 
          fit: 'inside', 
          withoutEnlargement: true 
        });

      switch (format) {
        case 'webp':
          processedBuffer = await sharpInstance.webp({ quality }).toBuffer();
          contentType = 'image/webp';
          break;
        case 'png':
          processedBuffer = await sharpInstance.png({ quality }).toBuffer();
          contentType = 'image/png';
          break;
        default:
          processedBuffer = await sharpInstance.jpeg({ quality }).toBuffer();
          contentType = 'image/jpeg';
      }

      return { buffer: processedBuffer, contentType };
    } catch (error) {
      console.error('Error processing image:', error);
      // Return original buffer if processing fails
      return { buffer, contentType: 'image/jpeg' };
    }
  }

  /**
   * Upload catalog item image
   */
  async uploadCatalogImage(
    catalogItemId: string,
    fileBuffer: Buffer,
    originalName: string,
    options: ImageProcessingOptions = {}
  ): Promise<UploadResult> {
    try {
      await this.initializeBuckets();

      // Process the image
      const { buffer: processedBuffer, contentType } = await this.processImage(fileBuffer, options);

      // Generate unique filename
      const fileExtension = options.format || 'jpg';
      const fileName = `${catalogItemId}-${uuidv4()}.${fileExtension}`;
      const filePath = `catalog-items/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, processedBuffer, {
          contentType,
          cacheControl: '31536000', // 1 year cache
          upsert: false
        });

      if (error) {
        console.error('Supabase storage upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return {
        success: true,
        url: urlData.publicUrl,
        publicUrl: urlData.publicUrl,
        fileName: fileName
      };

    } catch (error) {
      console.error('Error uploading catalog image:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      };
    }
  }

  /**
   * Upload measurement chart
   */
  async uploadMeasurementChart(
    catalogItemId: string,
    fileBuffer: Buffer,
    originalName: string
  ): Promise<UploadResult> {
    try {
      await this.initializeBuckets();

      // Generate unique filename
      const fileExtension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${catalogItemId}-measurement-${uuidv4()}.${fileExtension}`;
      const filePath = `measurement-charts/${fileName}`;

      // Determine content type
      let contentType = 'image/jpeg';
      if (fileExtension === 'png') contentType = 'image/png';
      if (fileExtension === 'webp') contentType = 'image/webp';
      if (fileExtension === 'pdf') contentType = 'application/pdf';

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.measurementBucketName)
        .upload(filePath, fileBuffer, {
          contentType,
          cacheControl: '31536000', // 1 year cache
          upsert: false
        });

      if (error) {
        console.error('Supabase storage upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.measurementBucketName)
        .getPublicUrl(filePath);

      return {
        success: true,
        url: urlData.publicUrl,
        publicUrl: urlData.publicUrl,
        fileName: fileName
      };

    } catch (error) {
      console.error('Error uploading measurement chart:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      };
    }
  }

  /**
   * Delete image from storage
   */
  async deleteImage(filePath: string, bucketType: 'catalog' | 'measurement' = 'catalog'): Promise<boolean> {
    try {
      const bucket = bucketType === 'catalog' ? this.bucketName : this.measurementBucketName;
      
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting image:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  /**
   * Generate multiple image sizes for responsive display
   */
  async uploadMultipleSizes(
    catalogItemId: string,
    fileBuffer: Buffer,
    originalName: string
  ): Promise<{ thumbnail: string; medium: string; large: string } | null> {
    try {
      const sizes = [
        { name: 'thumbnail', width: 150, height: 150, quality: 70 },
        { name: 'medium', width: 400, height: 400, quality: 80 },
        { name: 'large', width: 800, height: 800, quality: 85 }
      ];

      const results: Record<string, string> = {};

      for (const size of sizes) {
        const result = await this.uploadCatalogImage(
          catalogItemId,
          fileBuffer,
          `${size.name}-${originalName}`,
          {
            width: size.width,
            height: size.height,
            quality: size.quality,
            format: 'webp' // Use WebP for better compression
          }
        );

        if (result.success && result.publicUrl) {
          results[size.name] = result.publicUrl;
        }
      }

      if (Object.keys(results).length === 3) {
        return {
          thumbnail: results.thumbnail,
          medium: results.medium,
          large: results.large
        };
      }

      return null;
    } catch (error) {
      console.error('Error uploading multiple sizes:', error);
      return null;
    }
  }
}

export const supabaseImageStorage = new SupabaseImageStorage();
