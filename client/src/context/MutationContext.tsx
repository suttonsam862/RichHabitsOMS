import React, { createContext, useContext, useState, useCallback } from 'react';

interface MutationContextType {
  activeMutations: Set<string>;
  isAnyMutationPending: boolean;
  registerMutation: (id: string) => void;
  unregisterMutation: (id: string) => void;
}

const MutationContext = createContext<MutationContextType | undefined>(undefined);

export function useMutationTracker() {
  const context = useContext(MutationContext);
  if (context === undefined) {
    throw new Error('useMutationTracker must be used within a MutationProvider');
  }
  return context;
}

interface MutationProviderProps {
  children: React.ReactNode;
}

export function MutationProvider({ children }: MutationProviderProps) {
  const [activeMutations, setActiveMutations] = useState<Set<string>>(new Set());

  const registerMutation = useCallback((id: string) => {
    setActiveMutations(prev => new Set(prev).add(id));
  }, []);

  const unregisterMutation = useCallback((id: string) => {
    setActiveMutations(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const isAnyMutationPending = activeMutations.size > 0;

  const value = {
    activeMutations,
    isAnyMutationPending,
    registerMutation,
    unregisterMutation,
  };

  return (
    <MutationContext.Provider value={value}>
      {children}
    </MutationContext.Provider>
  );
}