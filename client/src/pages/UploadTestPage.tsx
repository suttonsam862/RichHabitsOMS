/**
 * UPLOAD TEST PAGE
 * Test page for demonstrating real-time upload progress functionality
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressiveFileUpload } from '@/components/ui/ProgressiveFileUpload';
import { UploadProgressPanel } from '@/components/ui/UploadProgressPanel';
import { useUploadProgress } from '@/hooks/useUploadProgress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, TestTube, FileImage } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function UploadTestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const { toast } = useToast();
  
  const {
    uploads,
    clearCompleted,
    clearAll,
    cancelUpload
  } = useUploadProgress();

  const handleUploadComplete = (files: { id: string; url: string; filename: string; path: string }[]) => {
    console.log('Upload completed:', files);
    const message = `Successfully uploaded ${files.length} file${files.length !== 1 ? 's' : ''}`;
    setTestResults(prev => [...prev, message]);
    toast({
      title: "Upload Success",
      description: message,
    });
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    setTestResults(prev => [...prev, `Error: ${error}`]);
    toast({
      title: "Upload Error",
      description: error,
      variant: "destructive"
    });
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <TestTube className="h-8 w-8 text-blue-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Upload Progress Test</h1>
          <p className="text-gray-600">Test real-time upload progress tracking functionality</p>
        </div>
      </div>

      <Tabs defaultValue="progressive" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="progressive" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Progressive Upload
          </TabsTrigger>
          <TabsTrigger value="progress-panel" className="flex items-center gap-2">
            <FileImage className="h-4 w-4" />
            Progress Panel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="progressive">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Progressive File Upload with Real-time Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressiveFileUpload
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                acceptedFileTypes={['image/*', 'application/pdf', 'text/*']}
                maxFileSize={20 * 1024 * 1024} // 20MB
                maxFiles={5}
                multiple={true}
                pathPrefix="test-uploads"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress-panel">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileImage className="h-5 w-5" />
                  Upload Progress Panel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UploadProgressPanel
                  uploads={uploads}
                  onCancel={cancelUpload}
                  onClearCompleted={clearCompleted}
                  onClearAll={clearAll}
                  defaultOpen={true}
                />
                
                {uploads.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No active uploads. Use the Progressive Upload tab to start uploading files.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upload Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {uploads.filter(u => u.status === 'uploading').length}
                    </div>
                    <div className="text-sm text-blue-800">Active</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {uploads.filter(u => u.status === 'completed').length}
                    </div>
                    <div className="text-sm text-green-800">Completed</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {uploads.filter(u => u.status === 'error').length}
                    </div>
                    <div className="text-sm text-red-800">Failed</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">
                      {uploads.length}
                    </div>
                    <div className="text-sm text-gray-800">Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Test Results</CardTitle>
              <Button variant="outline" size="sm" onClick={clearTestResults}>
                Clear Results
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`p-2 rounded text-sm ${
                    result.startsWith('Error:') 
                      ? 'bg-red-50 text-red-700 border border-red-200' 
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}
                >
                  <span className="text-xs text-gray-500 mr-2">
                    {new Date().toLocaleTimeString()}:
                  </span>
                  {result}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Progressive Upload Features:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Drag & drop multiple files</li>
                <li>• Real-time progress bars</li>
                <li>• Upload speed tracking</li>
                <li>• Time remaining estimates</li>
                <li>• File validation and error handling</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Progress Panel Features:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Collapsible upload overview</li>
                <li>• Individual upload tracking</li>
                <li>• Bulk operations (clear, cancel)</li>
                <li>• Upload statistics</li>
                <li>• Status indicators and badges</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}