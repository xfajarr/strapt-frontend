import { useState, useCallback, useRef } from 'react';

export interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
}

export interface LoadingOperation {
  id: string;
  message: string;
  progress?: number;
}

/**
 * Unified loading state management hook
 * Handles multiple concurrent loading operations with progress tracking
 */
export function useUnifiedLoading() {
  const [operations, setOperations] = useState<Map<string, LoadingOperation>>(new Map());
  const operationCounter = useRef(0);

  // Start a new loading operation
  const startLoading = useCallback((message: string, id?: string): string => {
    const operationId = id || `operation-${++operationCounter.current}`;
    
    setOperations(prev => {
      const newOperations = new Map(prev);
      newOperations.set(operationId, {
        id: operationId,
        message,
        progress: 0
      });
      return newOperations;
    });

    return operationId;
  }, []);

  // Update progress for an operation
  const updateProgress = useCallback((operationId: string, progress: number, message?: string) => {
    setOperations(prev => {
      const newOperations = new Map(prev);
      const operation = newOperations.get(operationId);
      if (operation) {
        newOperations.set(operationId, {
          ...operation,
          progress: Math.max(0, Math.min(100, progress)),
          message: message || operation.message
        });
      }
      return newOperations;
    });
  }, []);

  // Complete a loading operation
  const completeLoading = useCallback((operationId: string) => {
    setOperations(prev => {
      const newOperations = new Map(prev);
      newOperations.delete(operationId);
      return newOperations;
    });
  }, []);

  // Clear all loading operations
  const clearAll = useCallback(() => {
    setOperations(new Map());
  }, []);

  // Get current loading state
  const getLoadingState = useCallback((): LoadingState => {
    const operationsArray = Array.from(operations.values());
    
    if (operationsArray.length === 0) {
      return { isLoading: false };
    }

    // If multiple operations, show the first one's message
    const primaryOperation = operationsArray[0];
    const averageProgress = operationsArray.reduce((sum, op) => sum + (op.progress || 0), 0) / operationsArray.length;

    return {
      isLoading: true,
      loadingMessage: operationsArray.length > 1 
        ? `${primaryOperation.message} (${operationsArray.length} operations)`
        : primaryOperation.message,
      progress: averageProgress > 0 ? averageProgress : undefined
    };
  }, [operations]);

  // Get all current operations
  const getAllOperations = useCallback(() => {
    return Array.from(operations.values());
  }, [operations]);

  // Check if a specific operation is running
  const isOperationRunning = useCallback((operationId: string) => {
    return operations.has(operationId);
  }, [operations]);

  // Wrapper for async operations with automatic loading management
  const withLoading = useCallback(async <T>(
    operation: () => Promise<T>,
    message: string,
    operationId?: string
  ): Promise<T> => {
    const id = startLoading(message, operationId);
    
    try {
      updateProgress(id, 10, message);
      const result = await operation();
      updateProgress(id, 100, 'Completed');
      
      // Small delay to show completion
      setTimeout(() => completeLoading(id), 500);
      
      return result;
    } catch (error) {
      completeLoading(id);
      throw error;
    }
  }, [startLoading, updateProgress, completeLoading]);

  // Wrapper for operations with custom progress tracking
  const withProgressTracking = useCallback(async <T>(
    operation: (updateProgress: (progress: number, message?: string) => void) => Promise<T>,
    initialMessage: string,
    operationId?: string
  ): Promise<T> => {
    const id = startLoading(initialMessage, operationId);
    
    try {
      const progressUpdater = (progress: number, message?: string) => {
        updateProgress(id, progress, message);
      };
      
      const result = await operation(progressUpdater);
      updateProgress(id, 100, 'Completed');
      
      // Small delay to show completion
      setTimeout(() => completeLoading(id), 500);
      
      return result;
    } catch (error) {
      completeLoading(id);
      throw error;
    }
  }, [startLoading, updateProgress, completeLoading]);

  return {
    // State getters
    getLoadingState,
    getAllOperations,
    isOperationRunning,
    
    // Operation management
    startLoading,
    updateProgress,
    completeLoading,
    clearAll,
    
    // Convenience wrappers
    withLoading,
    withProgressTracking,
    
    // Computed values
    isLoading: operations.size > 0,
    operationCount: operations.size,
    currentOperations: Array.from(operations.values())
  };
}

/**
 * Hook for managing loading states with predefined operation types
 */
export function useTypedLoading<T extends string>() {
  const {
    startLoading,
    completeLoading,
    updateProgress,
    isOperationRunning,
    getLoadingState,
    withLoading,
    withProgressTracking
  } = useUnifiedLoading();

  const startTypedLoading = useCallback((type: T, message: string) => {
    return startLoading(message, type);
  }, [startLoading]);

  const completeTypedLoading = useCallback((type: T) => {
    completeLoading(type);
  }, [completeLoading]);

  const updateTypedProgress = useCallback((type: T, progress: number, message?: string) => {
    updateProgress(type, progress, message);
  }, [updateProgress]);

  const isTypeLoading = useCallback((type: T) => {
    return isOperationRunning(type);
  }, [isOperationRunning]);

  const withTypedLoading = useCallback(async <R>(
    type: T,
    operation: () => Promise<R>,
    message: string
  ): Promise<R> => {
    return withLoading(operation, message, type);
  }, [withLoading]);

  return {
    startLoading: startTypedLoading,
    completeLoading: completeTypedLoading,
    updateProgress: updateTypedProgress,
    isLoading: isTypeLoading,
    withLoading: withTypedLoading,
    withProgressTracking: (
      type: T,
      operation: (updateProgress: (progress: number, message?: string) => void) => Promise<any>,
      initialMessage: string
    ) => withProgressTracking(operation, initialMessage, type),
    getLoadingState,
  };
}

// Common loading operation types
export type CommonLoadingTypes = 
  | 'transfer'
  | 'claim'
  | 'refund'
  | 'approve'
  | 'fetch'
  | 'wallet'
  | 'transaction';

// Pre-configured hook for common operations
export const useCommonLoading = () => useTypedLoading<CommonLoadingTypes>();
