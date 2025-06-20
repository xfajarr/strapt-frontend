import { updateData } from './DataSubscriptionService';
import { LinkTransfer } from '@/hooks/use-link-transfer';
import { useEffect, useState, useCallback } from 'react';
import { useDynamicWallet } from '@/hooks/use-dynamic-wallet';

// Cache for transfers data
let sentTransfersCache: LinkTransfer[] = [];
let receivedTransfersCache: LinkTransfer[] = [];
let lastFetchTime = 0;
const FETCH_INTERVAL = 60000; // 1 minute

/**
 * Initialize the transfers data service
 */
export const initTransfersDataService = () => {
  console.log('Initializing transfers data service');

  // Start the background refresh process
  startBackgroundRefresh();
};

/**
 * Start background refresh for transfers data
 */
const startBackgroundRefresh = () => {
  // Set up interval to fetch transfers data
  setInterval(() => {
    fetchTransfersData();
  }, FETCH_INTERVAL);
};

/**
 * Fetch transfers data
 */
export const fetchTransfersData = async () => {
  try {
    // Skip if we've fetched recently
    const now = Date.now();
    if (now - lastFetchTime < FETCH_INTERVAL) {
      return;
    }

    // Update timestamp
    lastFetchTime = now;

    // The actual fetching will happen in the hook
    // We'll just notify subscribers that they should refresh
    updateData('transfers', {
      sent: sentTransfersCache,
      received: receivedTransfersCache
    });

    console.log('Transfers data updated');
  } catch (error) {
    console.error('Error fetching transfers data:', error);
  }
};

/**
 * Hook to use sent transfers with automatic updates
 * Note: LinkTransfer contract doesn't have built-in transfer tracking.
 * This would need to be implemented using event logs or a subgraph.
 */
export const useSentTransfersData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { address } = useDynamicWallet();
  const [transfers, setTransfers] = useState<LinkTransfer[]>([]);

  // Fetch sent transfers
  const fetchSentTransfers = useCallback(async () => {
    if (!address) return;

    try {
      setIsLoading(true);
      // TODO: Implement event log parsing or subgraph integration
      // For now, return empty array
      const result: LinkTransfer[] = [];
      setTransfers(result);
      sentTransfersCache = result;
      updateData('transfers', {
        sent: result,
        received: receivedTransfersCache
      });
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsLoading(false);
    }
  }, [address]);

  // Fetch on mount and when address changes
  useEffect(() => {
    fetchSentTransfers();
  }, [fetchSentTransfers]);

  return { transfers, isLoading, error, refresh: fetchSentTransfers };
};

/**
 * Hook to use received transfers with automatic updates
 * Note: LinkTransfer contract doesn't have built-in transfer tracking.
 * This would need to be implemented using event logs or a subgraph.
 */
export const useReceivedTransfersData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { address } = useDynamicWallet();
  const [transfers, setTransfers] = useState<LinkTransfer[]>([]);

  // Fetch received transfers
  const fetchReceivedTransfers = useCallback(async () => {
    if (!address) return;

    try {
      setIsLoading(true);
      // TODO: Implement event log parsing or subgraph integration
      // For now, return empty array
      const result: LinkTransfer[] = [];
      setTransfers(result);
      receivedTransfersCache = result;
      updateData('transfers', {
        sent: sentTransfersCache,
        received: result
      });
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsLoading(false);
    }
  }, [address]);

  // Fetch on mount and when address changes
  useEffect(() => {
    fetchReceivedTransfers();
  }, [fetchReceivedTransfers]);

  return { transfers, isLoading, error, refresh: fetchReceivedTransfers };
};
