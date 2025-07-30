import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  User, 
  FileText, 
  UserCheck, 
  Package, 
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  History
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AuditEntry {
  id: string;
  orderId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  fieldName: string | null;
  oldValue: any;
  newValue: any;
  changesSummary: string | null;
  metadata: any;
  timestamp: string;
  createdAt: string;
}

interface OrderAuditHistoryProps {
  orderId: string;
  className?: string;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'ORDER_CREATED':
      return <ShoppingCart className="h-4 w-4" />;
    case 'STATUS_CHANGED':
      return <RefreshCw className="h-4 w-4" />;
    case 'DESIGNER_ASSIGNED':
    case 'MANUFACTURER_ASSIGNED':
    case 'SALESPERSON_ASSIGNED':
      return <UserCheck className="h-4 w-4" />;
    case 'ITEM_ADDED':
    case 'ITEM_UPDATED':
    case 'ITEM_REMOVED':
      return <Package className="h-4 w-4" />;
    case 'ORDER_UPDATED':
      return <FileText className="h-4 w-4" />;
    case 'PRODUCTION_STARTED':
    case 'PRODUCTION_COMPLETED':
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'ORDER_CREATED':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'STATUS_CHANGED':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'DESIGNER_ASSIGNED':
    case 'MANUFACTURER_ASSIGNED':
    case 'SALESPERSON_ASSIGNED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'ITEM_ADDED':
    case 'ITEM_UPDATED':
    case 'ITEM_REMOVED':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'ORDER_UPDATED':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'PRODUCTION_STARTED':
    case 'PRODUCTION_COMPLETED':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
};

const formatActionName = (action: string) => {
  return action
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

export default function OrderAuditHistory({ orderId, className = '' }: OrderAuditHistoryProps) {
  const [limit, setLimit] = useState(50);

  const { 
    data: auditHistory, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['audit-history', orderId, limit],
    queryFn: async () => {
      const response = await fetch(`/api/audit/orders/${orderId}/history?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit history');
      }

      const result = await response.json();
      return result.data as AuditEntry[];
    },
    enabled: !!orderId
  });

  const { data: auditStats } = useQuery({
    queryKey: ['audit-stats', orderId],
    queryFn: async () => {
      const response = await fetch(`/api/audit/orders/${orderId}/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit stats');
      }

      const result = await response.json();
      return result.data;
    },
    enabled: !!orderId
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Order History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Order History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load audit history</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Order History
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
        
        {auditStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{auditStats.totalChanges}</div>
              <div className="text-sm text-gray-600">Total Changes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{auditStats.statusChanges}</div>
              <div className="text-sm text-gray-600">Status Changes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{auditStats.assignments}</div>
              <div className="text-sm text-gray-600">Assignments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{auditStats.itemChanges}</div>
              <div className="text-sm text-gray-600">Item Changes</div>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-96">
          {!auditHistory || auditHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit history found for this order.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {auditHistory.map((entry, index) => (
                <div key={entry.id} className="relative">
                  {index < auditHistory.length - 1 && (
                    <div className="absolute left-4 top-10 w-0.5 h-8 bg-gray-200"></div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getActionColor(entry.action)}`}>
                      {getActionIcon(entry.action)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={getActionColor(entry.action)}>
                          {formatActionName(entry.action)}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      
                      {entry.changesSummary && (
                        <p className="text-sm text-gray-700 mb-2">
                          {entry.changesSummary}
                        </p>
                      )}
                      
                      {entry.fieldName && (entry.oldValue !== null || entry.newValue !== null) && (
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          <div className="font-medium mb-1">Field: {entry.fieldName}</div>
                          {entry.oldValue !== null && (
                            <div>Old: <code className="bg-red-100 px-1 rounded">{JSON.stringify(entry.oldValue)}</code></div>
                          )}
                          {entry.newValue !== null && (
                            <div>New: <code className="bg-green-100 px-1 rounded">{JSON.stringify(entry.newValue)}</code></div>
                          )}
                        </div>
                      )}
                      
                      {entry.userId && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                          <User className="h-3 w-3" />
                          User ID: {entry.userId}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {index < auditHistory.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
              
              {auditHistory.length >= limit && (
                <div className="text-center pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setLimit(prev => prev + 50)}
                  >
                    Load More History
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}