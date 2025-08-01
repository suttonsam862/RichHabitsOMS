/**
 * Salesperson Form Component
 * Handles creation and editing of salesperson records
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, User, DollarSign, FileText, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Storage service for file uploads
const uploadFile = async (folder: string, fileName: string, file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  formData.append('fileName', fileName);

  const response = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  const data = await response.json();
  return data.url;
};

interface Salesperson {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  employee_id?: string;
  position_title?: string;
  hire_date?: string;
  employment_status: string;
  base_salary?: number;
  commission_rate?: number;
  sales_quota?: number;
  current_year_sales?: number;
  customer_count?: number;
  performance_rating?: number;
  profile_image_url?: string;
  payroll_file_url?: string;
  is_active: boolean;
  manager_id?: string;
}

interface SalespersonFormProps {
  formData: Partial<Salesperson>;
  setFormData: (data: Partial<Salesperson>) => void;
  onSubmit: () => void;
  isLoading: boolean;
  submitLabel: string;
  isEdit?: boolean;
}

export default function SalespersonForm({
  formData,
  setFormData,
  onSubmit,
  isLoading,
  submitLabel,
  isEdit = false,
}: SalespersonFormProps) {
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [payrollFile, setPayrollFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: keyof Salesperson, value: any) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleFileSelect = async (file: File, type: 'profile' | 'payroll') => {
    if (!formData.id && !isEdit) {
      // Store file for upload after creation
      if (type === 'profile') {
        setProfileImageFile(file);
      } else {
        setPayrollFile(file);
      }
      return;
    }

    try {
      setUploading(true);
      const folder = type === 'profile' ? 'salesperson_profiles' : 'payroll_files';
      const fileName = `${formData.id || 'new'}_${type}_${Date.now()}_${file.name}`;
      
      const url = await uploadFile(folder, fileName, file);
      
      if (type === 'profile') {
        handleInputChange('profile_image_url', url);
        setProfileImageFile(null);
      } else {
        handleInputChange('payroll_file_url', url);
        setPayrollFile(null);
      }

      toast({
        title: 'File Uploaded',
        description: `${type === 'profile' ? 'Profile image' : 'Payroll file'} uploaded successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Upload Error',
        description: `Failed to upload ${type === 'profile' ? 'profile image' : 'payroll file'}.`,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Upload pending files before submission
    if (profileImageFile && formData.id) {
      await handleFileSelect(profileImageFile, 'profile');
    }
    if (payrollFile && formData.id) {
      await handleFileSelect(payrollFile, 'payroll');
    }

    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-glass-panel">
          <TabsTrigger value="basic" className="data-[state=active]:bg-neon-blue/20">
            <User className="w-4 h-4 mr-2" />
            Basic Info
          </TabsTrigger>
          <TabsTrigger value="employment" className="data-[state=active]:bg-neon-blue/20">
            <FileText className="w-4 h-4 mr-2" />
            Employment
          </TabsTrigger>
          <TabsTrigger value="compensation" className="data-[state=active]:bg-neon-blue/20">
            <DollarSign className="w-4 h-4 mr-2" />
            Compensation
          </TabsTrigger>
          <TabsTrigger value="files" className="data-[state=active]:bg-neon-blue/20">
            <Upload className="w-4 h-4 mr-2" />
            Files
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-6">
          <Card className="glass-panel border-glass-border">
            <CardHeader>
              <CardTitle className="text-white">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name" className="text-white">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name || ''}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    required
                    className="glass-input text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="last_name" className="text-white">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name || ''}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    required
                    className="glass-input text-white"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-white">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  className="glass-input text-white"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-white">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="glass-input text-white"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employment" className="space-y-4 mt-6">
          <Card className="glass-panel border-glass-border">
            <CardHeader>
              <CardTitle className="text-white">Employment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employee_id" className="text-white">Employee ID</Label>
                  <Input
                    id="employee_id"
                    value={formData.employee_id || ''}
                    onChange={(e) => handleInputChange('employee_id', e.target.value)}
                    className="glass-input text-white"
                    placeholder="Auto-generated if empty"
                  />
                </div>

                <div>
                  <Label htmlFor="position_title" className="text-white">Position Title</Label>
                  <Input
                    id="position_title"
                    value={formData.position_title || ''}
                    onChange={(e) => handleInputChange('position_title', e.target.value)}
                    className="glass-input text-white"
                    placeholder="e.g., Senior Sales Representative"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hire_date" className="text-white">Hire Date</Label>
                  <Input
                    id="hire_date"
                    type="date"
                    value={formData.hire_date || ''}
                    onChange={(e) => handleInputChange('hire_date', e.target.value)}
                    className="glass-input text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="employment_status" className="text-white">Status *</Label>
                  <Select 
                    value={formData.employment_status || ''} 
                    onValueChange={(value) => handleInputChange('employment_status', value)}
                  >
                    <SelectTrigger className="glass-input text-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="glass-panel border-glass-border">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active ?? true}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="is_active" className="text-white">Active User</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compensation" className="space-y-4 mt-6">
          <Card className="glass-panel border-glass-border">
            <CardHeader>
              <CardTitle className="text-white">Compensation & Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="base_salary" className="text-white">Base Salary</Label>
                  <Input
                    id="base_salary"
                    type="number"
                    step="0.01"
                    value={formData.base_salary || ''}
                    onChange={(e) => handleInputChange('base_salary', parseFloat(e.target.value) || 0)}
                    className="glass-input text-white"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="commission_rate" className="text-white">Commission Rate</Label>
                  <Input
                    id="commission_rate"
                    type="number"
                    step="0.001"
                    min="0"
                    max="1"
                    value={formData.commission_rate || ''}
                    onChange={(e) => handleInputChange('commission_rate', parseFloat(e.target.value) || 0)}
                    className="glass-input text-white"
                    placeholder="0.05 (5%)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sales_quota" className="text-white">Sales Quota</Label>
                  <Input
                    id="sales_quota"
                    type="number"
                    step="0.01"
                    value={formData.sales_quota || ''}
                    onChange={(e) => handleInputChange('sales_quota', parseFloat(e.target.value) || 0)}
                    className="glass-input text-white"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="performance_rating" className="text-white">Performance Rating</Label>
                  <Input
                    id="performance_rating"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={formData.performance_rating || ''}
                    onChange={(e) => handleInputChange('performance_rating', parseFloat(e.target.value) || 0)}
                    className="glass-input text-white"
                    placeholder="0.0 - 5.0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-4 mt-6">
          <Card className="glass-panel border-glass-border">
            <CardHeader>
              <CardTitle className="text-white">File Uploads</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-white">Profile Image</Label>
                <div className="mt-2">
                  {formData.profile_image_url ? (
                    <div className="flex items-center space-x-4">
                      <img 
                        src={formData.profile_image_url} 
                        alt="Profile" 
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleInputChange('profile_image_url', '')}
                        className="text-red-400 border-red-400 hover:bg-red-400/10"
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-glass-border rounded-lg p-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(file, 'profile');
                        }}
                        className="hidden"
                        id="profile_image"
                      />
                      <label htmlFor="profile_image" className="cursor-pointer">
                        <div className="text-center">
                          <Camera className="w-8 h-8 mx-auto mb-2 text-white/50" />
                          <p className="text-white/70">Click to upload profile image</p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-white">Payroll File</Label>
                <div className="mt-2">
                  {formData.payroll_file_url ? (
                    <div className="flex items-center space-x-4">
                      <FileText className="w-8 h-8 text-neon-blue" />
                      <span className="text-white">Payroll file uploaded</span>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleInputChange('payroll_file_url', '')}
                        className="text-red-400 border-red-400 hover:bg-red-400/10"
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-glass-border rounded-lg p-4">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.xlsx,.xls"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(file, 'payroll');
                        }}
                        className="hidden"
                        id="payroll_file"
                      />
                      <label htmlFor="payroll_file" className="cursor-pointer">
                        <div className="text-center">
                          <Upload className="w-8 h-8 mx-auto mb-2 text-white/50" />
                          <p className="text-white/70">Click to upload payroll file</p>
                          <p className="text-xs text-white/50">PDF, DOC, DOCX, XLS, XLSX</p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-3 pt-4 border-t border-glass-border">
        <Button
          type="submit"
          disabled={isLoading || uploading}
          className="bg-gradient-to-r from-neon-blue to-neon-green text-black hover:opacity-90"
        >
          {isLoading || uploading ? 'Processing...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}