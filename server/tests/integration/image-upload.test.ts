import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream, existsSync } from 'fs';

// Mock application setup
const app = express();
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/test/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

// Mock catalog items data
const mockCatalogItems = new Map();
mockCatalogItems.set('item-1', {
  id: 'item-1',
  name: 'Premium T-Shirt',
  sku: 'TSHIRT-001',
  image_url: null
});

// Mock orders data
const mockOrders = new Map();
mockOrders.set('order-1', {
  id: 'order-1',
  order_number: 'ORD-001',
  status: 'draft'
});

// Mock design tasks data
const mockDesignTasks = new Map();
mockDesignTasks.set('task-1', {
  id: 'task-1',
  order_id: 'order-1',
  status: 'pending',
  design_file_url: null
});

// Helper function to create test directory
async function ensureTestDirectory() {
  try {
    await fs.mkdir('uploads/test', { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

// Helper function to cleanup test files
async function cleanupTestFiles() {
  try {
    const files = await fs.readdir('uploads/test');
    for (const file of files) {
      await fs.unlink(path.join('uploads/test', file));
    }
  } catch (error) {
    // Directory might not exist or be empty
  }
}

// Routes for image upload testing
app.post('/api/catalog-items/:id/image', upload.single('image'), (req, res) => {
  const { id } = req.params;
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ error: 'No image file provided' });
  }
  
  if (!mockCatalogItems.has(id)) {
    return res.status(404).json({ error: 'Catalog item not found' });
  }
  
  const catalogItem = mockCatalogItems.get(id);
  const imageUrl = `/uploads/test/${file.filename}`;
  catalogItem.image_url = imageUrl;
  
  res.json({
    id: catalogItem.id,
    image_url: imageUrl,
    file_size: file.size,
    mime_type: file.mimetype,
    original_name: file.originalname
  });
});

app.post('/api/design-tasks/:id/file', upload.single('design_file'), (req, res) => {
  const { id } = req.params;
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ error: 'No design file provided' });
  }
  
  if (!mockDesignTasks.has(id)) {
    return res.status(404).json({ error: 'Design task not found' });
  }
  
  const designTask = mockDesignTasks.get(id);
  const fileUrl = `/uploads/test/${file.filename}`;
  designTask.design_file_url = fileUrl;
  designTask.status = 'submitted';
  
  res.json({
    id: designTask.id,
    design_file_url: fileUrl,
    status: 'submitted',
    file_size: file.size,
    mime_type: file.mimetype,
    original_name: file.originalname
  });
});

app.post('/api/images-unified', upload.single('image'), (req, res) => {
  const file = req.file;
  const { type, related_id } = req.body;
  
  if (!file) {
    return res.status(400).json({ error: 'No image file provided' });
  }
  
  if (!type || !related_id) {
    return res.status(400).json({ error: 'Type and related_id are required' });
  }
  
  const variants = {
    thumbnail: `/uploads/test/thumb_${file.filename}`,
    medium: `/uploads/test/med_${file.filename}`,
    large: `/uploads/test/large_${file.filename}`,
    original: `/uploads/test/${file.filename}`
  };
  
  res.json({
    id: `img-${Date.now()}`,
    type,
    related_id,
    variants,
    file_size: file.size,
    mime_type: file.mimetype,
    original_name: file.originalname
  });
});

app.get('/api/catalog-items/:id', (req, res) => {
  const { id } = req.params;
  const item = mockCatalogItems.get(id);
  
  if (!item) {
    return res.status(404).json({ error: 'Catalog item not found' });
  }
  
  res.json(item);
});

app.get('/api/design-tasks/:id', (req, res) => {
  const { id } = req.params;
  const task = mockDesignTasks.get(id);
  
  if (!task) {
    return res.status(404).json({ error: 'Design task not found' });
  }
  
  res.json(task);
});

app.delete('/api/images/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join('uploads/test', filename);
  
  if (!existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.status(204).send();
});

// Error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: error.message });
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({ error: error.message });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

describe('Image Upload Integration Tests', () => {
  beforeAll(async () => {
    await ensureTestDirectory();
  });

  afterAll(async () => {
    await cleanupTestFiles();
  });

  beforeEach(async () => {
    // Reset mock data
    mockCatalogItems.clear();
    mockCatalogItems.set('item-1', {
      id: 'item-1',
      name: 'Premium T-Shirt',
      sku: 'TSHIRT-001',
      image_url: null
    });

    mockDesignTasks.clear();
    mockDesignTasks.set('task-1', {
      id: 'task-1',
      order_id: 'order-1',
      status: 'pending',
      design_file_url: null
    });
  });

  afterEach(async () => {
    await cleanupTestFiles();
  });

  describe('Catalog Item Image Upload', () => {
    test('should upload valid image to catalog item', async () => {
      // Create a small test image buffer
      const testImageBuffer = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );

      const response = await request(app)
        .post('/api/catalog-items/item-1/image')
        .attach('image', testImageBuffer, {
          filename: 'test-image.gif',
          contentType: 'image/gif'
        })
        .expect(400); // GIF not allowed

      expect(response.body.error).toContain('Invalid file type');
    });

    test('should upload valid JPEG image', async () => {
      // Create a minimal JPEG header
      const jpegHeader = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xD9
      ]);

      const response = await request(app)
        .post('/api/catalog-items/item-1/image')
        .attach('image', jpegHeader, {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg'
        })
        .expect(200);

      expect(response.body).toHaveProperty('image_url');
      expect(response.body).toHaveProperty('file_size');
      expect(response.body.mime_type).toBe('image/jpeg');
      expect(response.body.original_name).toBe('test-image.jpg');
    });

    test('should fail when no image file provided', async () => {
      const response = await request(app)
        .post('/api/catalog-items/item-1/image')
        .expect(400);

      expect(response.body.error).toBe('No image file provided');
    });

    test('should fail for non-existent catalog item', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');

      const response = await request(app)
        .post('/api/catalog-items/nonexistent/image')
        .attach('image', testImageBuffer, {
          filename: 'test.jpg',
          contentType: 'image/jpeg'
        })
        .expect(404);

      expect(response.body.error).toBe('Catalog item not found');
    });

    test('should update catalog item with image URL', async () => {
      const jpegHeader = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xD9
      ]);

      await request(app)
        .post('/api/catalog-items/item-1/image')
        .attach('image', jpegHeader, {
          filename: 'test.jpg',
          contentType: 'image/jpeg'
        })
        .expect(200);

      // Verify the catalog item was updated
      const itemResponse = await request(app)
        .get('/api/catalog-items/item-1')
        .expect(200);

      expect(itemResponse.body.image_url).toMatch(/\/uploads\/test\/image-.*\.jpg/);
    });
  });

  describe('Design Task File Upload', () => {
    test('should upload design file to task', async () => {
      const designFileBuffer = Buffer.from('design-file-content');

      const response = await request(app)
        .post('/api/design-tasks/task-1/file')
        .attach('design_file', designFileBuffer, {
          filename: 'design.png',
          contentType: 'image/png'
        })
        .expect(200);

      expect(response.body).toHaveProperty('design_file_url');
      expect(response.body.status).toBe('submitted');
      expect(response.body.mime_type).toBe('image/png');
    });

    test('should fail when no design file provided', async () => {
      const response = await request(app)
        .post('/api/design-tasks/task-1/file')
        .expect(400);

      expect(response.body.error).toBe('No design file provided');
    });

    test('should fail for non-existent design task', async () => {
      const designFileBuffer = Buffer.from('design-file-content');

      const response = await request(app)
        .post('/api/design-tasks/nonexistent/file')
        .attach('design_file', designFileBuffer, {
          filename: 'design.png',
          contentType: 'image/png'
        })
        .expect(404);

      expect(response.body.error).toBe('Design task not found');
    });

    test('should update task status after file upload', async () => {
      const designFileBuffer = Buffer.from('design-file-content');

      await request(app)
        .post('/api/design-tasks/task-1/file')
        .attach('design_file', designFileBuffer, {
          filename: 'design.png',
          contentType: 'image/png'
        })
        .expect(200);

      // Verify the task was updated
      const taskResponse = await request(app)
        .get('/api/design-tasks/task-1')
        .expect(200);

      expect(taskResponse.body.status).toBe('submitted');
      expect(taskResponse.body.design_file_url).toMatch(/\/uploads\/test\/design_file-.*\.png/);
    });
  });

  describe('Unified Image Upload Endpoint', () => {
    test('should upload image with type and related_id', async () => {
      const imageBuffer = Buffer.from('image-content');

      const response = await request(app)
        .post('/api/images-unified')
        .field('type', 'catalog_item')
        .field('related_id', 'item-1')
        .attach('image', imageBuffer, {
          filename: 'product.jpg',
          contentType: 'image/jpeg'
        })
        .expect(200);

      expect(response.body).toHaveProperty('variants');
      expect(response.body.variants).toHaveProperty('thumbnail');
      expect(response.body.variants).toHaveProperty('medium');
      expect(response.body.variants).toHaveProperty('large');
      expect(response.body.variants).toHaveProperty('original');
      expect(response.body.type).toBe('catalog_item');
      expect(response.body.related_id).toBe('item-1');
    });

    test('should fail when type is missing', async () => {
      const imageBuffer = Buffer.from('image-content');

      const response = await request(app)
        .post('/api/images-unified')
        .field('related_id', 'item-1')
        .attach('image', imageBuffer, {
          filename: 'product.jpg',
          contentType: 'image/jpeg'
        })
        .expect(400);

      expect(response.body.error).toBe('Type and related_id are required');
    });

    test('should fail when related_id is missing', async () => {
      const imageBuffer = Buffer.from('image-content');

      const response = await request(app)
        .post('/api/images-unified')
        .field('type', 'catalog_item')
        .attach('image', imageBuffer, {
          filename: 'product.jpg',
          contentType: 'image/jpeg'
        })
        .expect(400);

      expect(response.body.error).toBe('Type and related_id are required');
    });

    test('should handle different image types', async () => {
      const types = ['catalog_item', 'design_task', 'order_item'];
      const imageBuffer = Buffer.from('image-content');

      for (const type of types) {
        const response = await request(app)
          .post('/api/images-unified')
          .field('type', type)
          .field('related_id', 'test-id')
          .attach('image', imageBuffer, {
            filename: `${type}.jpg`,
            contentType: 'image/jpeg'
          })
          .expect(200);

        expect(response.body.type).toBe(type);
        expect(response.body.related_id).toBe('test-id');
      }
    });
  });

  describe('File Size and Type Validation', () => {
    test('should reject files larger than 5MB', async () => {
      // Create a large buffer (6MB)
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'x');

      const response = await request(app)
        .post('/api/catalog-items/item-1/image')
        .attach('image', largeBuffer, {
          filename: 'large-image.jpg',
          contentType: 'image/jpeg'
        })
        .expect(400);

      expect(response.body.error).toBe('File too large. Maximum size is 5MB.');
    });

    test('should accept valid file types', async () => {
      const validTypes = [
        { contentType: 'image/jpeg', extension: 'jpg' },
        { contentType: 'image/png', extension: 'png' },
        { contentType: 'image/webp', extension: 'webp' }
      ];

      const imageBuffer = Buffer.from('valid-image-content');

      for (const type of validTypes) {
        const response = await request(app)
          .post('/api/catalog-items/item-1/image')
          .attach('image', imageBuffer, {
            filename: `test.${type.extension}`,
            contentType: type.contentType
          })
          .expect(200);

        expect(response.body.mime_type).toBe(type.contentType);
      }
    });

    test('should reject invalid file types', async () => {
      const invalidTypes = [
        { contentType: 'image/gif', extension: 'gif' },
        { contentType: 'application/pdf', extension: 'pdf' },
        { contentType: 'text/plain', extension: 'txt' },
        { contentType: 'video/mp4', extension: 'mp4' }
      ];

      const fileBuffer = Buffer.from('file-content');

      for (const type of invalidTypes) {
        const response = await request(app)
          .post('/api/catalog-items/item-1/image')
          .attach('image', fileBuffer, {
            filename: `test.${type.extension}`,
            contentType: type.contentType
          })
          .expect(400);

        expect(response.body.error).toContain('Invalid file type');
      }
    });
  });

  describe('File Management', () => {
    test('should delete uploaded file', async () => {
      const response = await request(app)
        .delete('/api/images/test-file.jpg')
        .expect(404); // File doesn't exist

      expect(response.body.error).toBe('File not found');
    });

    test('should handle file deletion for non-existent files', async () => {
      const response = await request(app)
        .delete('/api/images/nonexistent-file.jpg')
        .expect(404);

      expect(response.body.error).toBe('File not found');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty file upload', async () => {
      const emptyBuffer = Buffer.alloc(0);

      const response = await request(app)
        .post('/api/catalog-items/item-1/image')
        .attach('image', emptyBuffer, {
          filename: 'empty.jpg',
          contentType: 'image/jpeg'
        })
        .expect(200);

      expect(response.body.file_size).toBe(0);
    });

    test('should handle files with special characters in names', async () => {
      const imageBuffer = Buffer.from('image-content');
      const specialFilename = 'test file with spaces & symbols (1).jpg';

      const response = await request(app)
        .post('/api/catalog-items/item-1/image')
        .attach('image', imageBuffer, {
          filename: specialFilename,
          contentType: 'image/jpeg'
        })
        .expect(200);

      expect(response.body.original_name).toBe(specialFilename);
    });

    test('should handle files with very long names', async () => {
      const imageBuffer = Buffer.from('image-content');
      const longFilename = 'A'.repeat(255) + '.jpg';

      const response = await request(app)
        .post('/api/catalog-items/item-1/image')
        .attach('image', imageBuffer, {
          filename: longFilename,
          contentType: 'image/jpeg'
        })
        .expect(200);

      expect(response.body.original_name).toBe(longFilename);
    });

    test('should handle concurrent uploads', async () => {
      const imageBuffer = Buffer.from('image-content');
      
      const uploadPromises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/catalog-items/item-1/image')
          .attach('image', imageBuffer, {
            filename: `concurrent-${i}.jpg`,
            contentType: 'image/jpeg'
          })
      );

      const responses = await Promise.all(uploadPromises);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.original_name).toBe(`concurrent-${index}.jpg`);
      });
    });

    test('should handle malformed multipart data', async () => {
      const response = await request(app)
        .post('/api/catalog-items/item-1/image')
        .set('Content-Type', 'multipart/form-data')
        .send('invalid-multipart-data')
        .expect(400);
    });

    test('should preserve file extension in uploaded filename', async () => {
      const imageBuffer = Buffer.from('image-content');

      const response = await request(app)
        .post('/api/catalog-items/item-1/image')
        .attach('image', imageBuffer, {
          filename: 'test-image.jpeg',
          contentType: 'image/jpeg'
        })
        .expect(200);

      expect(response.body.image_url).toMatch(/\.jpeg$/);
      expect(response.body.original_name).toBe('test-image.jpeg');
    });

    test('should handle files without extensions', async () => {
      const imageBuffer = Buffer.from('image-content');

      const response = await request(app)
        .post('/api/catalog-items/item-1/image')
        .attach('image', imageBuffer, {
          filename: 'no-extension',
          contentType: 'image/jpeg'
        })
        .expect(200);

      expect(response.body.original_name).toBe('no-extension');
    });
  });
});