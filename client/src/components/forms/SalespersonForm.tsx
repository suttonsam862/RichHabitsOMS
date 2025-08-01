
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, Upload, FileText, DollarSign } from 'lucide-react';
import { Salesperson } from '@shared/types';

interface SalespersonFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Salesperson>) => void;
  initialValues?: Partial<Salesperson>;
  isEditing?: boolean;
}

// TODO: use shadcn/ui Dialog and Form components
export function SalespersonForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialValues,
  isEditing = false 
}: SalespersonFormProps) {
  const [formData, setFormData] = useState<Partial<Salesperson>>(
    initialValues || {
      first_name: '',
      last_name: '',
      email: '',
      commission_rate: 0,
      status: 'active'
    }
  );

  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [payrollFile, setPayrollFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: validate form data
    // TODO: handle file uploads
    onSubmit(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-rich-black/90 backdrop-blur-md border border-glass-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-neon-blue flex items-center">
            <User className="mr-2 h-5 w-5" />
            {isEditing ? 'Edit Salesperson' : 'Add New Salesperson'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="glass-panel border-glass-border">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Basic Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  {/* TODO: First Name input with validation */}
                  <Input
                    id="first_name"
                    name="first_name"
                    value={formData.first_name || ''}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                    className="glass-input"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  {/* TODO: Last Name input with validation */}
                  <Input
                    id="last_name"
                    name="last_name"
                    value={formData.last_name || ''}
                    onChange={handleInputChange}
                    placeholder="Enter last name"
                    className="glass-input"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                {/* TODO: Email input with validation */}
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                  className="glass-input"
                  required
                />
              </div>

              <div>
                <Label htmlFor="commission_rate">Commission Rate (%)</Label>
                {/* TODO: Commission Rate input with validation */}
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="commission_rate"
                    name="commission_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.commission_rate || 0}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="glass-input pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Image Upload */}
          <Card className="glass-panel border-glass-border">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Profile Image</h3>
              
              {/* TODO: Profile Image Upload component */}
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={formData.profile_image_url} />
                  <AvatarFallback>
                    {formData.first_name?.[0]}{formData.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProfileImageFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="profile-image-upload"
                  />
                  <Label htmlFor="profile-image-upload" asChild>
                    <Button variant="outline" type="button" className="glass-button">
                      <Upload className="mr-2 h-4 w-4" />
                      Choose Profile Image
                    </Button>
                  </Label>
                  {profileImageFile && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selected: {profileImageFile.name}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payroll File Upload */}
          <Card className="glass-panel border-glass-border">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Payroll Information</h3>
              
              {/* TODO: Payroll File Upload component */}
              <div>
                <Label>Payroll File (Optional)</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => setPayrollFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="payroll-file-upload"
                  />
                  <Label htmlFor="payroll-file-upload" asChild>
                    <Button variant="outline" type="button" className="glass-button">
                      <FileText className="mr-2 h-4 w-4" />
                      Choose Payroll File
                    </Button>
                  </Label>
                  {payrollFile && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selected: {payrollFile.name}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-glass-border">
            {/* TODO: Submit & Cancel buttons */}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="glass-button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-neon-blue hover:bg-neon-blue/80 text-rich-black font-semibold"
            >
              {isEditing ? 'Update Salesperson' : 'Create Salesperson'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default SalespersonForm;
