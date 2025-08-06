# useProductMockups Hook - Integration Demonstration

## 🎯 **Hook Integration in ProductLibrary UI**

### **1. ProductMockupUploader Component**

The `ProductMockupUploader` component demonstrates full hook integration:

```typescript
// File: client/src/components/ProductLibrary/ProductMockupUploader.tsx (lines 66-120)
export function ProductMockupUploader({ productId, onUploadSuccess, maxFiles = 5 }) {
  // HOOK INTEGRATION: Full feature utilization
  const {
    mockups,           // ✓ Fetched mockups data
    isLoading,         // ✓ Loading states
    uploadMockup,      // ✓ Upload function
    isUploading,       // ✓ Upload progress state
    uploads,           // ✓ Unified progress tracking
    currentUpload,     // ✓ Real-time progress
    cancelUpload,      // ✓ User control
    deleteMockup,      // ✓ Complete lifecycle
    isDeleting,        // ✓ Delete state
    refetchMockups     // ✓ Data refresh
  } = useProductMockups(productId, {
    maxSizeMB: 10,           // Custom file size limit
    enableCompression: true   // Automatic optimization
  });
}
```

**Integration Features:**
- **Real-time Progress**: Shows upload speed, progress bar, cancel option
- **File Management**: Drag-and-drop, preview, batch upload
- **Metadata Input**: Mockup type selection, alt text, designer notes
- **Error Handling**: User-friendly error messages and recovery

### **2. ProductLibraryBrowser Component**

The main browser component demonstrates hook usage for product management:

```typescript
// File: client/src/components/ProductLibrary/ProductLibraryBrowser.tsx
function ProductLibraryBrowser() {
  // Product selection triggers mockup management
  const handleProductClick = (product) => {
    setSelectedProduct(product);
    // ProductMockupUploader automatically loads for this product
  };

  return (
    <Dialog>
      <TabsContent value="mockups">
        <ProductMockupUploader 
          productId={selectedProduct.id}
          onUploadSuccess={() => refetch()} // Refresh product data
        />
      </TabsContent>
    </Dialog>
  );
}
```

## 🔄 **Refactoring Achievements**

### **Before vs After Comparison**

**BEFORE (Original Hook):**
```typescript
// Isolated, basic implementation
const [uploadProgress, setUploadProgress] = useState(0);
const uploadMockup = async (file) => {
  // Basic XMLHttpRequest with local progress
  xhr.upload.addEventListener('progress', (event) => {
    setUploadProgress(Math.round((event.loaded / event.total) * 100));
  });
};
```

**AFTER (Enhanced Hook):**
```typescript
// Unified with existing systems
const { startUpload, updateProgress, completeUpload } = useUploadProgress();
const uploadMockup = async ({ file, data }) => {
  // File validation
  const validation = validateFile(file, { maxSizeMB: options.maxSizeMB });
  
  // Image compression
  if (shouldCompress(file)) {
    const compressed = await compressImage(file);
    fileToUse = compressed.file;
  }
  
  // Unified progress tracking
  startUpload(uploadId, file.name, file.size);
  xhr.upload.addEventListener('progress', (event) => {
    updateProgress(uploadId, event.loaded); // Global progress system
  });
};
```

### **Unification Benefits:**

1. **Memory Efficiency**: Single progress tracking system vs multiple local states
2. **Consistent UX**: All upload components show identical progress patterns
3. **Shared Optimizations**: File compression and validation logic reused
4. **Error Handling**: Centralized error management and user feedback
5. **Maintainability**: Changes to upload logic benefit entire application

## 🚀 **Production-Ready Integration Examples**

### **1. Simple Integration**
```typescript
import { useProductMockups } from '@/hooks/useProductMockups';

function MockupManager({ productId }) {
  const { mockups, uploadMockup, currentUpload } = useProductMockups(productId);
  
  const handleUpload = async (file) => {
    await uploadMockup({ 
      file, 
      data: { image_type: 'mockup', alt_text: 'Product mockup' }
    });
  };

  return (
    <div>
      {mockups.map(mockup => <img key={mockup.id} src={mockup.image_url} />)}
      <input type="file" onChange={e => handleUpload(e.target.files[0])} />
      {currentUpload && <Progress value={currentUpload.progress} />}
    </div>
  );
}
```

### **2. Advanced Integration with Options**
```typescript
function AdvancedMockupUploader({ productId }) {
  const {
    mockups,
    uploadMockup,
    uploads,
    cancelUpload,
    deleteMockup
  } = useProductMockups(productId, {
    maxSizeMB: 15,           // Larger files for high-res mockups
    enableCompression: true  // Automatic optimization
  });

  const handleBatchUpload = async (files) => {
    for (const file of files) {
      await uploadMockup({
        file,
        data: {
          image_type: 'design_proof',
          alt_text: `Design proof for ${file.name}`,
          metadata: JSON.stringify({ batch_id: Date.now() })
        }
      });
    }
  };

  return (
    <div>
      {/* Real-time progress for all uploads */}
      {uploads.map(upload => (
        <div key={upload.id}>
          <Progress value={upload.progress} />
          <Button onClick={() => cancelUpload(upload.id)}>Cancel</Button>
        </div>
      ))}
      
      {/* Existing mockups with delete */}
      {mockups.map(mockup => (
        <div key={mockup.id}>
          <img src={mockup.image_url} alt={mockup.alt_text} />
          <Button onClick={() => deleteMockup(mockup.id)}>Delete</Button>
        </div>
      ))}
    </div>
  );
}
```

## ✅ **Integration Complete - Ready for Production**

The enhanced `useProductMockups` hook provides:

- **Complete Feature Set**: All requested functionality implemented
- **System Integration**: Unified with existing upload infrastructure  
- **Production UI**: Ready-to-use components built and tested
- **Flexible API**: Configurable options for different use cases
- **Performance Optimized**: Proper caching, compression, and progress tracking

The ProductLibrary system is now fully integrated and ready for immediate use in your application.