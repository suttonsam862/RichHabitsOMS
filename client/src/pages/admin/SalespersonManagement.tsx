
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Users, DollarSign, FileText } from 'lucide-react';
// TODO: import UI components, hooks, forms
// import { useSalespeople } from '@/hooks/useSalespeople';
// import { SalespersonForm } from '@/components/forms/SalespersonForm';

export default function SalespersonManagement() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  // TODO: use actual hooks
  // const { data: salespeople, isLoading, error } = useSalespeople();

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Salesperson Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage sales team members, commissions, and customer assignments
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Salesperson
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Salespeople</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {/* TODO: show actual count */}
              0
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Commission Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {/* TODO: calculate average commission */}
              0%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {/* TODO: count customer assignments */}
              0
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Team</CardTitle>
        </CardHeader>
        <CardContent>
          {/* TODO: add table/list of salespeople */}
          <div className="text-center py-8 text-muted-foreground">
            <Users className="mx-auto h-12 w-12 mb-4" />
            <p>No salespeople found. Add your first salesperson to get started.</p>
          </div>
          
          {/* TODO: Replace with actual table showing:
              - Profile photo
              - Name & email
              - Commission rate
              - Assigned customers count
              - Status
              - Actions (edit, delete, view assignments)
          */}
        </CardContent>
      </Card>

      {/* TODO: add SalespersonForm modal */}
      {/* {isFormOpen && (
        <SalespersonForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={(data) => {
            // TODO: handle form submission
            setIsFormOpen(false);
          }}
        />
      )} */}
    </div>
  );
}
