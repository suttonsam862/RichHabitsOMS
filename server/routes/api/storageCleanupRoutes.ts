/**
 * Storage Cleanup Routes - Utility routes for managing orphaned files
 */
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireRole } from '../../middleware/adminAuth.js';
import ImageAssetService from '../../services/imageAssetService.js';

const router = Router();

// Initialize Supabase client with service key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

interface OrphanedFile {
  bucket: string;
  path: string;
  size: number;
  lastModified: string;
  url: string;
}

interface CleanupStats {
  total_files_scanned: number;
  orphaned_files_found: number;
  orphaned_files_deleted: number;
  total_space_freed: number;
  errors: string[];
  scan_duration_ms: number;
}

/**
 * Scan all buckets for orphaned files
 */
router.get('/scan-orphaned', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  const startTime = Date.now();
  console.log('🔍 Starting orphaned files scan...');

  try {
    const stats: CleanupStats = {
      total_files_scanned: 0,
      orphaned_files_found: 0,
      orphaned_files_deleted: 0,
      total_space_freed: 0,
      errors: [],
      scan_duration_ms: 0
    };

    const orphanedFiles: OrphanedFile[] = [];
    const buckets = ['uploads', 'catalog_items', 'orders', 'private_files'];

    // Get all URLs from image_assets table
    console.log('📋 Fetching all image asset URLs from database...');
    const { data: imageAssets, error: assetsError } = await supabase
      .from('image_assets')
      .select('url')
      .is('deleted_at', null);

    if (assetsError) {
      console.error('❌ Error fetching image assets:', assetsError);
      return res.status(400).json({
        success: false,
        error: 'Failed to fetch image assets from database'
      });
    }

    const validUrls = new Set(imageAssets?.map(asset => asset.url) || []);
    console.log(`✅ Found ${validUrls.size} valid URLs in database`);

    // Scan each bucket for files
    for (const bucketName of buckets) {
      console.log(`🗂️ Scanning bucket: ${bucketName}`);
      
      try {
        const { data: files, error: listError } = await supabase.storage
          .from(bucketName)
          .list('', {
            limit: 1000,
            sortBy: { column: 'updated_at', order: 'desc' }
          });

        if (listError) {
          console.error(`❌ Error listing files in bucket ${bucketName}:`, listError);
          stats.errors.push(`Failed to list files in bucket ${bucketName}: ${listError.message}`);
          continue;
        }

        if (!files || files.length === 0) {
          console.log(`📂 Bucket ${bucketName} is empty`);
          continue;
        }

        // Process files recursively
        await scanBucketRecursively(bucketName, '', files, validUrls, orphanedFiles, stats);

      } catch (error) {
        console.error(`❌ Error processing bucket ${bucketName}:`, error);
        stats.errors.push(`Error processing bucket ${bucketName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    stats.scan_duration_ms = Date.now() - startTime;
    
    console.log(`✅ Scan completed in ${stats.scan_duration_ms}ms`);
    console.log(`📊 Results: ${stats.total_files_scanned} files scanned, ${stats.orphaned_files_found} orphaned files found`);

    res.status(200).json({
      success: true,
      message: 'Orphaned files scan completed',
      data: {
        stats,
        orphaned_files: orphanedFiles.slice(0, 100) // Limit response size
      }
    });

  } catch (error) {
    console.error('❌ Storage cleanup scan error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Delete orphaned files
 */
router.delete('/delete-orphaned', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { dry_run = false, bucket_filter, max_files = 50 } = req.body;
  
  console.log(`🗑️ Starting orphaned files deletion (dry_run: ${dry_run})...`);

  try {
    const stats: CleanupStats = {
      total_files_scanned: 0,
      orphaned_files_found: 0,
      orphaned_files_deleted: 0,
      total_space_freed: 0,
      errors: [],
      scan_duration_ms: 0
    };

    const orphanedFiles: OrphanedFile[] = [];
    const bucketsToScan = bucket_filter ? [bucket_filter] : ['uploads', 'catalog_items', 'orders', 'private_files'];

    // Get all valid URLs from database
    const { data: imageAssets, error: assetsError } = await supabase
      .from('image_assets')
      .select('url')
      .is('deleted_at', null);

    if (assetsError) {
      return res.status(400).json({
        success: false,
        error: 'Failed to fetch image assets from database'
      });
    }

    const validUrls = new Set(imageAssets?.map(asset => asset.url) || []);

    // Find orphaned files
    for (const bucketName of bucketsToScan) {
      try {
        const { data: files, error: listError } = await supabase.storage
          .from(bucketName)
          .list('', { limit: 1000 });

        if (listError || !files) continue;

        await scanBucketRecursively(bucketName, '', files, validUrls, orphanedFiles, stats);
      } catch (error) {
        stats.errors.push(`Error scanning bucket ${bucketName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Limit files to delete
    const filesToDelete = orphanedFiles.slice(0, max_files);

    if (!dry_run && filesToDelete.length > 0) {
      console.log(`🗑️ Deleting ${filesToDelete.length} orphaned files...`);
      
      for (const file of filesToDelete) {
        try {
          const { error: deleteError } = await supabase.storage
            .from(file.bucket)
            .remove([file.path]);

          if (deleteError) {
            console.error(`❌ Failed to delete ${file.path}:`, deleteError);
            stats.errors.push(`Failed to delete ${file.path}: ${deleteError.message}`);
          } else {
            stats.orphaned_files_deleted++;
            stats.total_space_freed += file.size;
            console.log(`✅ Deleted orphaned file: ${file.path}`);
          }
        } catch (error) {
          stats.errors.push(`Error deleting ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    stats.scan_duration_ms = Date.now() - startTime;

    const message = dry_run 
      ? `Dry run completed - found ${stats.orphaned_files_found} orphaned files`
      : `Cleanup completed - deleted ${stats.orphaned_files_deleted} files, freed ${(stats.total_space_freed / 1024 / 1024).toFixed(2)} MB`;

    res.status(200).json({
      success: true,
      message,
      data: {
        stats,
        orphaned_files: dry_run ? filesToDelete : [],
        dry_run
      }
    });

  } catch (error) {
    console.error('❌ Storage cleanup deletion error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get storage statistics
 */
router.get('/stats', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    console.log('📊 Fetching storage statistics...');

    const buckets = ['uploads', 'catalog_items', 'orders', 'private_files'];
    const bucketStats: Record<string, { file_count: number; total_size: number }> = {};
    let totalFiles = 0;
    let totalSize = 0;

    for (const bucketName of buckets) {
      try {
        const { data: files, error } = await supabase.storage
          .from(bucketName)
          .list('', { limit: 1000 });

        if (error || !files) {
          bucketStats[bucketName] = { file_count: 0, total_size: 0 };
          continue;
        }

        const stats = await calculateBucketStats(bucketName, '', files);
        bucketStats[bucketName] = stats;
        totalFiles += stats.file_count;
        totalSize += stats.total_size;

      } catch (error) {
        console.error(`Error getting stats for bucket ${bucketName}:`, error);
        bucketStats[bucketName] = { file_count: 0, total_size: 0 };
      }
    }

    // Get database statistics
    const dbStats = await ImageAssetService.getStats();

    res.status(200).json({
      success: true,
      data: {
        storage: {
          total_files: totalFiles,
          total_size_bytes: totalSize,
          total_size_mb: (totalSize / 1024 / 1024).toFixed(2),
          buckets: bucketStats
        },
        database: dbStats.success ? dbStats.data : null
      }
    });

  } catch (error) {
    console.error('❌ Storage stats error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Recursively scan bucket for orphaned files
 */
async function scanBucketRecursively(
  bucketName: string,
  prefix: string,
  files: any[],
  validUrls: Set<string>,
  orphanedFiles: OrphanedFile[],
  stats: CleanupStats
): Promise<void> {
  for (const file of files) {
    if (file.name === '.emptyFolderPlaceholder') continue;

    const fullPath = prefix ? `${prefix}/${file.name}` : file.name;
    stats.total_files_scanned++;

    // If it's a folder, scan recursively
    if (!file.id && file.name) {
      try {
        const { data: subFiles, error } = await supabase.storage
          .from(bucketName)
          .list(fullPath, { limit: 1000 });

        if (!error && subFiles) {
          await scanBucketRecursively(bucketName, fullPath, subFiles, validUrls, orphanedFiles, stats);
        }
      } catch (error) {
        stats.errors.push(`Error scanning folder ${fullPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      continue;
    }

    // Generate possible URLs for this file
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fullPath);

    const publicUrl = urlData.publicUrl;
    
    // Check if URL exists in database
    if (!validUrls.has(publicUrl)) {
      orphanedFiles.push({
        bucket: bucketName,
        path: fullPath,
        size: file.metadata?.size || 0,
        lastModified: file.updated_at || file.created_at,
        url: publicUrl
      });
      stats.orphaned_files_found++;
    }
  }
}

/**
 * Calculate bucket statistics recursively
 */
async function calculateBucketStats(
  bucketName: string,
  prefix: string,
  files: any[]
): Promise<{ file_count: number; total_size: number }> {
  let fileCount = 0;
  let totalSize = 0;

  for (const file of files) {
    if (file.name === '.emptyFolderPlaceholder') continue;

    const fullPath = prefix ? `${prefix}/${file.name}` : file.name;

    // If it's a folder, scan recursively
    if (!file.id && file.name) {
      try {
        const { data: subFiles, error } = await supabase.storage
          .from(bucketName)
          .list(fullPath, { limit: 1000 });

        if (!error && subFiles) {
          const subStats = await calculateBucketStats(bucketName, fullPath, subFiles);
          fileCount += subStats.file_count;
          totalSize += subStats.total_size;
        }
      } catch (error) {
        console.error(`Error calculating stats for folder ${fullPath}:`, error);
      }
    } else {
      // It's a file
      fileCount++;
      totalSize += file.metadata?.size || 0;
    }
  }

  return { file_count: fileCount, total_size: totalSize };
}

export default router;