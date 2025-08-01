import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UndoableDeleteOptions {
  entityName: string; // e.g., 'customer', 'order', 'catalog item'
  deleteEndpoint: string; // API endpoint for deletion
  restoreEndpoint?: string; // API endpoint for restoration (if different)
  onDeleteSuccess?: () => void;
  onRestoreSuccess?: () => void;
  invalidateQueries?: string[]; // Query keys to invalidate after delete/restore
  undoTimeoutMs?: number; // How long to show undo option (default 5000ms)
  requiresConfirmation?: boolean; // Whether to show confirmation modal before delete
  confirmationItemType?: 'catalog-item' | 'order' | 'customer' | 'organization' | 'generic';
  requiresTyping?: boolean; // Whether to require typing item name for high-risk deletions
}

interface PendingDelete {
  id: string;
  data: any;
  timeoutId: NodeJS.Timeout;
  entityName: string;
}

export function useUndoableDelete({
  entityName,
  deleteEndpoint,
  restoreEndpoint,
  onDeleteSuccess,
  onRestoreSuccess,
  invalidateQueries = [],
  undoTimeoutMs = 5000,
  requiresConfirmation = false,
  confirmationItemType = 'generic',
  requiresTyping = false
}: UndoableDeleteOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingDeletes, setPendingDeletes] = useState<Map<string, PendingDelete>>(new Map());
  const toastRef = useRef<{ dismiss: () => void } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{id: string; itemData: any; itemDisplayName?: string} | null>(null);

  // Mutation for actual deletion
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${deleteEndpoint}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to delete ${entityName}`);
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries after successful deletion
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });
      onDeleteSuccess?.();
    }
  });

  // Mutation for restoration
  const restoreMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const endpoint = restoreEndpoint || deleteEndpoint;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...data, id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to restore ${entityName}`);
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries after successful restoration
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });
      onRestoreSuccess?.();
    }
  });

  // Handle undo action
  const handleUndo = useCallback((id: string) => {
    const pendingDelete = pendingDeletes.get(id);
    if (!pendingDelete) return;

    // Clear the timeout
    clearTimeout(pendingDelete.timeoutId);

    // Remove from pending deletes
    setPendingDeletes(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });

    // Dismiss the toast
    toastRef.current?.dismiss();

    // Restore the item
    restoreMutation.mutate(
      { id, data: pendingDelete.data },
      {
        onSuccess: () => {
          toast({
            title: "Restored",
            description: `${pendingDelete.entityName} has been restored successfully.`,
            variant: "default"
          });
        },
        onError: (error: any) => {
          toast({
            title: "Restore failed",
            description: error.message || `Failed to restore ${pendingDelete.entityName}`,
            variant: "destructive"
          });
        }
      }
    );
  }, [pendingDeletes, restoreMutation, toast]);

  // Execute the actual soft delete (after confirmation if required)
  const executeSoftDelete = useCallback((id: string, itemData: any, itemDisplayName?: string) => {
    // Create timeout for actual deletion
    const timeoutId = setTimeout(() => {
      // Remove from pending deletes
      setPendingDeletes(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });

      // Perform actual deletion
      deleteMutation.mutate(id, {
        onError: (error: any) => {
          toast({
            title: "Delete failed",
            description: error.message || `Failed to delete ${entityName}`,
            variant: "destructive"
          });
        }
      });
    }, undoTimeoutMs);

    // Add to pending deletes
    const pendingDelete: PendingDelete = {
      id,
      data: itemData,
      timeoutId,
      entityName: itemDisplayName || entityName
    };

    setPendingDeletes(prev => {
      const newMap = new Map(prev);
      newMap.set(id, pendingDelete);
      return newMap;
    });

    // Show undo toast with custom JSX for the action button
    const toastResult = toast({
      title: "Deleted",
      description: `${pendingDelete.entityName} will be permanently deleted in ${undoTimeoutMs / 1000} seconds.`,
      variant: "default"
    });

    // Add undo functionality via a simple toast (removing problematic action object)
    setTimeout(() => {
      toast({
        title: "Undo Available",
        description: `${pendingDelete.entityName} will be deleted. Refresh to cancel or wait for permanent deletion.`,
        variant: "default"
      });
    }, 100);

    toastRef.current = toastResult;

    // Optimistically remove from UI
    invalidateQueries.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    });

  }, [deleteMutation, toast, handleUndo, entityName, undoTimeoutMs, invalidateQueries, queryClient]);

  // Soft delete function with optional confirmation modal
  const softDelete = useCallback((id: string, itemData: any, itemDisplayName?: string) => {
    if (requiresConfirmation) {
      setConfirmationData({ id, itemData, itemDisplayName });
      setShowConfirmation(true);
    } else {
      executeSoftDelete(id, itemData, itemDisplayName);
    }
  }, [requiresConfirmation, executeSoftDelete]);

  // Handle confirmation modal
  const handleConfirmDelete = useCallback(() => {
    if (confirmationData) {
      setShowConfirmation(false);
      executeSoftDelete(confirmationData.id, confirmationData.itemData, confirmationData.itemDisplayName);
      setConfirmationData(null);
    }
  }, [confirmationData, executeSoftDelete]);

  const handleCancelConfirmation = useCallback(() => {
    setShowConfirmation(false);
    setConfirmationData(null);
  }, []);

  // Cancel all pending deletes (useful for cleanup)
  const cancelAllPendingDeletes = useCallback(() => {
    pendingDeletes.forEach(pendingDelete => {
      clearTimeout(pendingDelete.timeoutId);
    });
    setPendingDeletes(new Map());
  }, [pendingDeletes]);

  // Check if an item is pending deletion
  const isPendingDelete = useCallback((id: string) => {
    return pendingDeletes.has(id);
  }, [pendingDeletes]);

  return {
    softDelete,
    handleUndo,
    cancelAllPendingDeletes,
    isPendingDelete,
    isDeleting: deleteMutation.isPending,
    isRestoring: restoreMutation.isPending,
    pendingDeleteCount: pendingDeletes.size,
    // Confirmation modal state
    showConfirmation,
    confirmationData,
    handleConfirmDelete,
    handleCancelConfirmation,
    confirmationItemType,
    requiresTyping
  };
}