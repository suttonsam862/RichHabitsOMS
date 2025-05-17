import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { UploadCloud, Download, CheckCircle, AlertCircle, EyeIcon, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

// File type validation
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = [
  'image/png', 
  'image/jpeg', 
  'image/jpg', 
  'application/pdf',
  'image/svg+xml'
];

// Schema for file upload
const uploadSchema = z.object({
  file: z.instanceof(FileList)
    .refine(files => files.length > 0, "File is required")
    .refine(files => files[0].size <= MAX_FILE_SIZE, "File size must be less than 10MB")
    .refine(
      files => ACCEPTED_FILE_TYPES.includes(files[0].type),
      "File must be PNG, JPEG, PDF, or SVG"
    ),
  notes: z.string().optional(),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

export default function DesignTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [previewFile, setPreviewFile] = useState<{url: string, type: string} | null>(null);

  // Form for file upload
  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      notes: '',
    },
  });

  // Fetch design tasks
  const { data: designTasks = [], isLoading } = useQuery({
    queryKey: ['/api/design-tasks'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  // Filter tasks based on status
  const filteredTasks = designTasks.filter((task: any) => {
    if (activeTab === 'all') return true;
    return task.status === activeTab;
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (data: { taskId: number, formData: FormData }) => {
      setIsUploading(true);
      setUploadProgress(0);
      
      try {
        // Custom implementation with upload progress
        const xhr = new XMLHttpRequest();
        
        const promise = new Promise((resolve, reject) => {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(percentComplete);
            }
          });
          
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };
          
          xhr.onerror = () => {
            reject(new Error('Network error occurred during upload'));
          };
          
          xhr.open('POST', `/api/design-tasks/${data.taskId}/upload`);
          xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
          xhr.send(data.formData);
        });
        
        const result = await promise;
        return result;
      } catch (error) {
        console.error('Upload error:', error);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/design-tasks'] });
      toast({
        title: 'Success',
        description: 'Design file uploaded successfully',
      });
      form.reset();
      setSelectedTaskId(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Upload Failed',
        description: error.message || 'An error occurred during upload',
      });
    },
  });

  // Update task status mutation
  const updateTaskStatusMutation = useMutation({
    mutationFn: (data: { taskId: number, status: string }) => {
      return apiRequest('PUT', `/api/design-tasks/${data.taskId}`, {
        status: data.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/design-tasks'] });
      toast({
        title: 'Status Updated',
        description: 'Task status has been updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update task status',
      });
    },
  });

  // Handle file upload
  const handleUpload = (data: UploadFormValues) => {
    if (!selectedTaskId) return;
    
    const file = data.file[0];
    const formData = new FormData();
    formData.append('file', file);
    
    if (data.notes) {
      formData.append('notes', data.notes);
    }
    
    uploadFileMutation.mutate({ taskId: selectedTaskId, formData });
  };

  // Preview image/pdf
  const handlePreview = (file: any) => {
    setPreviewFile({
      url: file.filePath,
      type: file.fileType
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Design Tasks</h1>
        <p className="text-muted-foreground">
          View and manage design tasks assigned to you
        </p>
      </div>

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="submitted">Submitted</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="all">All Tasks</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>{getStatusLabel(activeTab)} Design Tasks</CardTitle>
              <CardDescription>
                {activeTab === 'pending' 
                  ? 'Tasks that need your attention and design work'
                  : activeTab === 'submitted' 
                  ? 'Tasks you have submitted for review'
                  : activeTab === 'approved'
                  ? 'Tasks that have been approved by the client'
                  : 'All design tasks assigned to you'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No design tasks found</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Files</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTasks.map((task: any) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.order?.orderNumber}</TableCell>
                          <TableCell>{task.description}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(task.status)}>
                              {getStatusLabel(task.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{task.dueDate ? formatDate(task.dueDate) : 'Not set'}</TableCell>
                          <TableCell>
                            {task.files && task.files.length > 0 ? (
                              <div className="flex flex-col space-y-1">
                                {task.files.map((file: any) => (
                                  <div key={file.id} className="flex items-center text-sm">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handlePreview(file)}
                                      className="p-0 h-6"
                                    >
                                      <EyeIcon className="h-4 w-4 mr-1" />
                                      {file.filename}
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">No files uploaded</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {task.status === 'pending' && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => setSelectedTaskId(task.id)}
                                    >
                                      <UploadCloud className="h-4 w-4 mr-1" />
                                      Upload
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Upload Design File</DialogTitle>
                                      <DialogDescription>
                                        Upload your design file for order #{task.order?.orderNumber}
                                      </DialogDescription>
                                    </DialogHeader>
                                    
                                    <form onSubmit={form.handleSubmit(handleUpload)} className="space-y-4">
                                      <div className="grid w-full max-w-sm items-center gap-1.5">
                                        <label htmlFor="file" className="text-sm font-medium">
                                          Design File
                                        </label>
                                        <div className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                                          <Input
                                            id="file"
                                            type="file"
                                            className="hidden"
                                            accept=".png,.jpg,.jpeg,.pdf,.svg"
                                            {...form.register('file')}
                                          />
                                          <label htmlFor="file" className="cursor-pointer flex flex-col items-center">
                                            <UploadCloud className="h-8 w-8 mb-2 text-muted-foreground" />
                                            <span className="text-sm font-medium">
                                              Click to select a file
                                            </span>
                                            <span className="text-xs text-muted-foreground mt-1">
                                              PNG, JPG, PDF, SVG (Max 10MB)
                                            </span>
                                          </label>
                                        </div>
                                        {form.formState.errors.file && (
                                          <p className="text-sm text-destructive">
                                            {form.formState.errors.file.message?.toString()}
                                          </p>
                                        )}
                                        
                                        {form.watch('file') && form.watch('file')[0] && (
                                          <div className="flex items-center justify-between bg-muted p-2 rounded-md mt-2">
                                            <span className="text-sm truncate">
                                              {form.watch('file')[0].name}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                              {Math.round(form.watch('file')[0].size / 1024)} KB
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="grid w-full gap-1.5">
                                        <label htmlFor="notes" className="text-sm font-medium">
                                          Notes (Optional)
                                        </label>
                                        <Textarea
                                          id="notes"
                                          placeholder="Add any notes about this design"
                                          {...form.register('notes')}
                                        />
                                      </div>
                                      
                                      {isUploading && (
                                        <div className="space-y-2">
                                          <Progress value={uploadProgress} className="h-2" />
                                          <p className="text-xs text-center text-muted-foreground">
                                            Uploading: {uploadProgress}%
                                          </p>
                                        </div>
                                      )}
                                      
                                      <DialogFooter>
                                        <DialogClose asChild>
                                          <Button variant="outline" type="button" disabled={isUploading}>
                                            Cancel
                                          </Button>
                                        </DialogClose>
                                        <Button type="submit" disabled={isUploading}>
                                          {isUploading ? (
                                            <>
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                              Uploading...
                                            </>
                                          ) : (
                                            <>
                                              <UploadCloud className="mr-2 h-4 w-4" />
                                              Upload Design
                                            </>
                                          )}
                                        </Button>
                                      </DialogFooter>
                                    </form>
                                  </DialogContent>
                                </Dialog>
                              )}
                              
                              {task.status === 'submitted' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  disabled
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Awaiting Review
                                </Button>
                              )}
                              
                              {task.files && task.files.length > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(task.files[0].filePath, '_blank')}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* File Preview Dialog */}
      {previewFile && (
        <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>File Preview</DialogTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2"
                onClick={() => setPreviewFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>
            <div className="overflow-auto max-h-[80vh]">
              {previewFile.type.includes('image') ? (
                <img 
                  src={previewFile.url} 
                  alt="Preview" 
                  className="max-w-full h-auto rounded-md"
                />
              ) : previewFile.type.includes('pdf') ? (
                <iframe 
                  src={previewFile.url} 
                  title="PDF Preview" 
                  className="w-full h-[70vh] rounded-md"
                />
              ) : (
                <div className="text-center py-12">
                  <p>This file type cannot be previewed</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => window.open(previewFile.url, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}