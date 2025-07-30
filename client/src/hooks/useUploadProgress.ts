/**
 * REAL-TIME UPLOAD PROGRESS HOOK
 * Tracks upload progress with real-time updates for Supabase file uploads
 */

import { useState, useCallback, useRef } from 'react';

export interface UploadProgress {
  id: string;
  filename: string;
  progress: number; // 0-100
  status: 'idle' | 'uploading' | 'completed' | 'error' | 'cancelled';
  uploadedBytes: number;
  totalBytes: number;
  speed: number; // bytes per second
  remainingTime: number; // seconds
  error?: string;
}

export interface UseUploadProgressReturn {
  uploads: UploadProgress[];
  startUpload: (id: string, filename: string, totalBytes: number) => void;
  updateProgress: (id: string, uploadedBytes: number) => void;
  completeUpload: (id: string) => void;
  errorUpload: (id: string, error: string) => void;
  cancelUpload: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  getUpload: (id: string) => UploadProgress | undefined;
}

export const useUploadProgress = (): UseUploadProgressReturn => {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const speedTracker = useRef<Map<string, { lastTime: number; lastBytes: number }>>(new Map());

  const startUpload = useCallback((id: string, filename: string, totalBytes: number) => {
    const newUpload: UploadProgress = {
      id,
      filename,
      progress: 0,
      status: 'uploading',
      uploadedBytes: 0,
      totalBytes,
      speed: 0,
      remainingTime: 0
    };

    speedTracker.current.set(id, {
      lastTime: Date.now(),
      lastBytes: 0
    });

    setUploads(prev => {
      const existing = prev.find(upload => upload.id === id);
      if (existing) {
        return prev.map(upload => 
          upload.id === id ? newUpload : upload
        );
      }
      return [...prev, newUpload];
    });
  }, []);

  const updateProgress = useCallback((id: string, uploadedBytes: number) => {
    setUploads(prev => {
      return prev.map(upload => {
        if (upload.id !== id) return upload;

        const now = Date.now();
        const tracker = speedTracker.current.get(id);
        
        let speed = 0;
        let remainingTime = 0;

        if (tracker) {
          const timeDiff = (now - tracker.lastTime) / 1000; // seconds
          const bytesDiff = uploadedBytes - tracker.lastBytes;
          
          if (timeDiff > 0) {
            speed = bytesDiff / timeDiff; // bytes per second
            
            // Update tracker for next calculation
            speedTracker.current.set(id, {
              lastTime: now,
              lastBytes: uploadedBytes
            });
          }

          // Calculate remaining time
          if (speed > 0) {
            const remainingBytes = upload.totalBytes - uploadedBytes;
            remainingTime = remainingBytes / speed;
          }
        }

        const progress = upload.totalBytes > 0 
          ? Math.round((uploadedBytes / upload.totalBytes) * 100)
          : 0;

        return {
          ...upload,
          progress: Math.min(progress, 100),
          uploadedBytes,
          speed,
          remainingTime: Math.max(remainingTime, 0)
        };
      });
    });
  }, []);

  const completeUpload = useCallback((id: string) => {
    setUploads(prev => 
      prev.map(upload => 
        upload.id === id 
          ? { 
              ...upload, 
              status: 'completed', 
              progress: 100,
              uploadedBytes: upload.totalBytes,
              speed: 0,
              remainingTime: 0
            }
          : upload
      )
    );
    speedTracker.current.delete(id);
  }, []);

  const errorUpload = useCallback((id: string, error: string) => {
    setUploads(prev => 
      prev.map(upload => 
        upload.id === id 
          ? { ...upload, status: 'error', error, speed: 0, remainingTime: 0 }
          : upload
      )
    );
    speedTracker.current.delete(id);
  }, []);

  const cancelUpload = useCallback((id: string) => {
    setUploads(prev => 
      prev.map(upload => 
        upload.id === id 
          ? { ...upload, status: 'cancelled', speed: 0, remainingTime: 0 }
          : upload
      )
    );
    speedTracker.current.delete(id);
  }, []);

  const clearCompleted = useCallback(() => {
    setUploads(prev => prev.filter(upload => 
      upload.status !== 'completed' && upload.status !== 'error' && upload.status !== 'cancelled'
    ));
  }, []);

  const clearAll = useCallback(() => {
    setUploads([]);
    speedTracker.current.clear();
  }, []);

  const getUpload = useCallback((id: string) => {
    return uploads.find(upload => upload.id === id);
  }, [uploads]);

  return {
    uploads,
    startUpload,
    updateProgress,
    completeUpload,
    errorUpload,
    cancelUpload,
    clearCompleted,
    clearAll,
    getUpload
  };
};