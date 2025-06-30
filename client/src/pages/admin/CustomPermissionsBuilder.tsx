
<file_path>client/src/pages/admin/CustomPermissionsBuilder.tsx</file_path>
<line_number>1</line_number>

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Settings, Plus, Edit, Trash2, Copy, Download, Upload, Save,
  Workflow, GitBranch, Clock, Map, Shield, AlertTriangle,
  Eye, EyeOff, Lock, Unlock, Target, Filter, Zap, Code,
  CheckCircle2, XCircle, AlertCircle, Users, Database
} from 'lucide-react';

// Permission template schema
const permissionTemplateSchema = z.object({
  name: z.string().min(3, "Template name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.enum(['role-based', 'attribute-based', 'rule-based', 'hybrid']),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'in', 'not_in']),
    value: z.any(),
    logicalOperator: z.enum(['AND', 'OR']).optional()
  })),
  actions: z.array(z.object({
    type: z.enum(['allow', 'deny', 'conditional']),
    resource: z.string(),
    permission: z.string(),
    conditions: z.array(z.any()).optional()
  })),
  priority: z.number().min(1).max(100),
  isActive: z.boolean().default(true)
});

type PermissionTemplate = z.infer<typeof permissionTemplateSchema>;

// Workflow node types for visual permission builder
interface WorkflowNode {
  id: string;
  type: 'condition' | 'action' | 'decision' | 'trigger';
  position: { x: number; y: number };
  data: {
    label: string;
    config: any;
  };
  connections?: string[];
}

export default function CustomPermissionsBuilder() {
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<PermissionTemplate | null>(null);
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNode[]>([]);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const templateForm = useForm<PermissionTemplate>({
    resolver: zodResolver(permissionTemplateSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'role-based',
      conditions: [],
      actions: [],
      priority: 50,
      isActive: true
    }
  });

  // Fetch permission templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['admin', 'permission-templates'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/permission-templates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    }
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (template: PermissionTemplate) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/permission-templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(template)
      });
      if (!response.ok) throw new Error('Failed to create template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'permission-templates'] });
      setIsTemplateDialogOpen(false);
      templateForm.reset();
      toast({
        title: 'Success',
        description: 'Permission template created successfully'
      });
    }
  });

  // Visual workflow builder functions
  const addWorkflowNode = useCallback((type: WorkflowNode['type']) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      position: { x: Math.random() * 400, y: Math.random() * 300 },
      data: {
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
        config: {}
      }
    };
    setWorkflowNodes(prev => [...prev, newNode]);
  }, []);

  const removeWorkflowNode = useCallback((nodeId: string) => {
    setWorkflowNodes(prev => prev.filter(node => node.id !== nodeId));
  }, []);

  // Permission validation engine
  const validatePermissionLogic = useCallback((template: PermissionTemplate) => {
    const errors: string[] = [];

    // Check for conflicting conditions
    const conditions = template.conditions;
    for (let i = 0; i < conditions.length; i++) {
      for (let j = i + 1; j < conditions.length; j++) {
        if (conditions[i].field === conditions[j].field) {
          if (conditions[i].operator === 'equals' && conditions[j].operator === 'not_equals') {
            if (conditions[i].value === conditions[j].value) {
              errors.push(`Conflicting conditions on field ${conditions[i].field}`);
            }
          }
        }
      }
    }

    // Check for circular dependencies
    const actions = template.actions;
    const allowActions = actions.filter(a => a.type === 'allow');
    const denyActions = actions.filter(a => a.type === 'deny');
    
    for (const allow of allowActions) {
      for (const deny of denyActions) {
        if (allow.resource === deny.resource && allow.permission === deny.permission) {
          errors.push(`Conflicting allow/deny actions for ${allow.resource}.${allow.permission}`);
        }
      }
    }

    // Check priority conflicts
    if (template.priority < 1 || template.priority > 100) {
      errors.push('Priority must be between 1 and 100');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, []);

  // Template testing simulator
  const testPermissionTemplate = useCallback(async (template: PermissionTemplate, testScenario: any) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/permission-templates/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ template, scenario: testScenario })
      });
      
      if (!response.ok) throw new Error('Test failed');
      const result = await response.json();
      
      toast({
        title: 'Test Results',
        description: `Permission ${result.allowed ? 'granted' : 'denied'} - ${result.reason}`,
        variant: result.allowed ? 'default' : 'destructive'
      });
      
      return result;
    } catch (error) {
      toast({
        title: 'Test Error',
        description: 'Failed to test permission template',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Pre-built permission templates
  const predefinedTemplates = [
    {
      name: 'Department Manager',
      description: 'Full access within department, read-only outside',
      category: 'attribute-based' as const,
      conditions: [
        { field: 'user.department', operator: 'equals' as const, value: 'target.department' }
      ],
      actions: [
        { type: 'allow' as const, resource: 'orders', permission: 'read' },
        { type: 'conditional' as const, resource: 'orders', permission: 'write' }
      ],
      priority: 70,
      isActive: true
    },
    {
      name: 'Regional Sales Rep',
      description: 'Access limited to assigned geographic region',
      category: 'rule-based' as const,
      conditions: [
        { field: 'user.assignedRegion', operator: 'contains' as const, value: 'target.location' }
      ],
      actions: [
        { type: 'allow' as const, resource: 'customers', permission: 'read' },
        { type: 'allow' as const, resource: 'orders', permission: 'create' }
      ],
      priority: 60,
      isActive: true
    },
    {
      name: 'Time-Restricted Designer',
      description: 'Design access only during business hours',
      category: 'hybrid' as const,
      conditions: [
        { field: 'current.time', operator: 'greater_than' as const, value: '09:00' },
        { field: 'current.time', operator: 'less_than' as const, value: '17:00', logicalOperator: 'AND' }
      ],
      actions: [
        { type: 'allow' as const, resource: 'designs', permission: 'read' },
        { type: 'conditional' as const, resource: 'designs', permission: 'write' }
      ],
      priority: 40,
      isActive: true
    }
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-neon-blue">Custom Permissions Builder</h1>
          <p className="subtitle text-neon-green text-sm mt-2">
            Design sophisticated permission systems with visual workflow builder and rule engine
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
            {previewMode ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {previewMode ? 'Edit Mode' : 'Preview Mode'}
          </Button>
          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary">
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Advanced Permission Template Builder</DialogTitle>
                <DialogDescription>
                  Create sophisticated permission rules with conditions, actions, and validation
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={templateForm.handleSubmit((data) => {
                if (validatePermissionLogic(data)) {
                  createTemplateMutation.mutate(data);
                }
              })} className="space-y-6">
                {/* Template basic info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Template Name</label>
                    <Input {...templateForm.register('name')} placeholder="e.g., Department Manager" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Select onValueChange={(value) => templateForm.setValue('category', value as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="role-based">Role-Based</SelectItem>
                        <SelectItem value="attribute-based">Attribute-Based</SelectItem>
                        <SelectItem value="rule-based">Rule-Based</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea {...templateForm.register('description')} placeholder="Detailed description of the permission template" />
                </div>

                {/* Validation errors display */}
                {validationErrors.length > 0 && (
                  <div className="p-4 border border-red-500 rounded-lg bg-red-50">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-red-700">Validation Errors:</span>
                    </div>
                    {validationErrors.map((error, index) => (
                      <p key={index} className="text-sm text-red-600">• {error}</p>
                    ))}
                  </div>
                )}

                {/* Conditions builder */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Conditions</h3>
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm">
                        <Plus className="mr-1 h-3 w-3" />
                        Add Condition
                      </Button>
                      <Badge variant="secondary">IF conditions</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Define when this permission template should be evaluated
                    </p>
                  </div>
                </div>

                {/* Actions builder */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Actions</h3>
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm">
                        <Plus className="mr-1 h-3 w-3" />
                        Add Action
                      </Button>
                      <Badge variant="secondary">THEN actions</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Define what permissions to grant or deny when conditions are met
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Priority (1-100)</label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="100" 
                      {...templateForm.register('priority', { valueAsNumber: true })} 
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox {...templateForm.register('isActive')} />
                    <label className="text-sm font-medium">Active Template</label>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      const data = templateForm.getValues();
                      testPermissionTemplate(data, { userId: 'test-user', resource: 'orders' });
                    }}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Test Template
                  </Button>
                  <Button type="submit" disabled={createTemplateMutation.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    Create Template
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates">
            <Settings className="mr-2 h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="visual-builder">
            <Workflow className="mr-2 h-4 w-4" />
            Visual Builder
          </TabsTrigger>
          <TabsTrigger value="rule-engine">
            <Code className="mr-2 h-4 w-4" />
            Rule Engine
          </TabsTrigger>
          <TabsTrigger value="testing">
            <Target className="mr-2 h-4 w-4" />
            Testing Suite
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Pre-built Templates</span>
                  <Badge variant="secondary">{predefinedTemplates.length} available</Badge>
                </CardTitle>
                <CardDescription>
                  Start with proven permission patterns and customize as needed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {predefinedTemplates.map((template, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{template.name}</h4>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">Priority: {template.priority}</Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Custom Templates</CardTitle>
                <CardDescription>Your organization's custom permission templates</CardDescription>
              </CardHeader>
              <CardContent>
                {templates?.length > 0 ? (
                  <div className="space-y-2">
                    {templates.map((template: any) => (
                      <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={template.isActive ? 'default' : 'secondary'}>
                            {template.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No custom templates created yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="visual-builder" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Visual Workflow Builder</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => addWorkflowNode('condition')}>
                    <Plus className="mr-1 h-3 w-3" />
                    Condition
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addWorkflowNode('action')}>
                    <Plus className="mr-1 h-3 w-3" />
                    Action
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addWorkflowNode('decision')}>
                    <Plus className="mr-1 h-3 w-3" />
                    Decision
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Drag and drop to build complex permission workflows visually
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg h-96 p-4 relative">
                {workflowNodes.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <Workflow className="mx-auto h-12 w-12 mb-4" />
                      <p>Start building your permission workflow</p>
                      <p className="text-sm">Add conditions and actions to get started</p>
                    </div>
                  </div>
                ) : (
                  workflowNodes.map((node) => (
                    <div
                      key={node.id}
                      className="absolute border rounded-lg p-3 bg-white shadow-sm"
                      style={{
                        left: node.position.x,
                        top: node.position.y
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{node.data.label}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeWorkflowNode(node.id)}
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {node.type}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rule-engine" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Code className="mr-2 h-5 w-5" />
                Advanced Rule Engine
              </CardTitle>
              <CardDescription>
                Write complex permission logic using our domain-specific language
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Rule Syntax Examples:</h4>
                <div className="space-y-2 text-sm font-mono bg-gray-50 p-3 rounded">
                  <div>IF user.role == "manager" AND user.department == resource.department</div>
                  <div>THEN ALLOW read, write ON orders</div>
                  <div className="mt-2">IF time.hour BETWEEN 9 AND 17 AND user.location IN ["US", "CA"]</div>
                  <div>THEN ALLOW * ON designs</div>
                  <div>ELSE DENY write ON designs</div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Custom Rule</label>
                <Textarea 
                  placeholder="Write your custom permission rule..."
                  className="font-mono"
                  rows={6}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Validate Syntax
                </Button>
                <Button variant="outline">
                  <Zap className="mr-2 h-4 w-4" />
                  Test Rule
                </Button>
                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  Save Rule
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="mr-2 h-5 w-5" />
                Permission Testing Suite
              </CardTitle>
              <CardDescription>
                Test your permission configurations against various scenarios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Test User</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select test user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Department Manager</SelectItem>
                      <SelectItem value="sales">Sales Rep</SelectItem>
                      <SelectItem value="designer">Designer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Test Resource</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select resource" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="orders">Orders</SelectItem>
                      <SelectItem value="customers">Customers</SelectItem>
                      <SelectItem value="designs">Designs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <Button variant="outline" className="flex items-center justify-center">
                  <Shield className="mr-2 h-4 w-4" />
                  Test Read
                </Button>
                <Button variant="outline" className="flex items-center justify-center">
                  <Edit className="mr-2 h-4 w-4" />
                  Test Write
                </Button>
                <Button variant="outline" className="flex items-center justify-center">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Test Delete
                </Button>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-2">Test Results</h4>
                <p className="text-sm text-muted-foreground">
                  Run permission tests to see results here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
