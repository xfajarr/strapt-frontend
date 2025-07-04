import { useState, useEffect, useCallback } from 'react';
import { useDynamicWallet } from './use-dynamic-wallet';
import { useSentTransfersData, useReceivedTransfersData } from '@/services/TransfersDataService';

export interface TransactionHistoryItem {
  id: string;
  type: 'sent' | 'received' | 'drop_created' | 'drop_claimed';
  title: string;
  amount: string;
  tokenSymbol: string;
  date: Date;
  recipient?: string;
  sender?: string;
  hash?: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface TransactionHistoryResult {
  transactions: TransactionHistoryItem[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  totalReceived: number;
  recentActivity: Array<{ amount: number; direction: "in" | "out"; date: Date }>;
}

const ITEMS_PER_PAGE = 5;

export function useTransactionHistory(): TransactionHistoryResult {
  const { address, isLoggedIn } = useDynamicWallet();
  const [currentPage, setCurrentPage] = useState(1);
  const [allTransactions, setAllTransactions] = useState<TransactionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Get transfer data
  const { transfers: sentTransfers, isLoading: isLoadingSent, refresh: refreshSent } = useSentTransfersData();
  const { transfers: receivedTransfers, isLoading: isLoadingReceived, refresh: refreshReceived } = useReceivedTransfersData();

  // Convert transfers to transaction history items
  const convertTransfersToHistory = useCallback(() => {
    const transactions: TransactionHistoryItem[] = [];

    // Add sent transfers
    if (sentTransfers && sentTransfers.length > 0) {
      sentTransfers.forEach(transfer => {
        transactions.push({
          id: transfer.id,
          type: 'sent',
          title: 'Sent Transfer',
          amount: `-${transfer.amount}`,
          tokenSymbol: transfer.tokenSymbol,
          date: new Date(Number(transfer.createdAt) * 1000),
          recipient: transfer.recipient,
          hash: transfer.transactionHash || transfer.id, // Use real transaction hash if available
          status: transfer.status === 'Claimed' ? 'completed' :
                 transfer.status === 'Refunded' ? 'failed' : 'pending'
        });
      });
    }

    // Add received transfers
    if (receivedTransfers && receivedTransfers.length > 0) {
      receivedTransfers.forEach(transfer => {
        transactions.push({
          id: transfer.id,
          type: 'received',
          title: 'Received Transfer',
          amount: `+${transfer.amount}`,
          tokenSymbol: transfer.tokenSymbol,
          date: new Date(Number(transfer.createdAt) * 1000),
          sender: transfer.sender,
          hash: transfer.transactionHash || transfer.id, // Use real transaction hash if available
          status: transfer.status === 'Claimed' ? 'completed' :
                 transfer.status === 'Refunded' ? 'failed' : 'pending'
        });
      });
    }



    // Sort by date (newest first)
    transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

    return transactions;
  }, [sentTransfers, receivedTransfers]);

  // Update transactions when data changes
  useEffect(() => {
    if (!isLoggedIn || !address) {
      setAllTransactions([]);
      setIsLoading(false);
      return;
    }

    const loading = isLoadingSent || isLoadingReceived;
    setIsLoading(loading);

    if (!loading) {
      try {
        const transactions = convertTransfersToHistory();
        setAllTransactions(transactions);
        setError(null);
      } catch (err) {
        console.error('Transaction history error:', err);
        setError(err instanceof Error ? err : new Error('Failed to load transaction history'));
      }
    }
  }, [isLoggedIn, address, isLoadingSent, isLoadingReceived, convertTransfersToHistory]);

  // Calculate pagination
  const totalItems = allTransactions.length;
  const displayedItems = currentPage * ITEMS_PER_PAGE;
  const transactions = allTransactions.slice(0, displayedItems);
  const hasMore = displayedItems < totalItems;

  // Load more function
  const loadMore = useCallback(() => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasMore]);

  // Refresh function
  const refresh = useCallback(() => {
    setCurrentPage(1);
    refreshSent();
    refreshReceived();
  }, [refreshSent, refreshReceived]);

  // Calculate total received and recent activity for ReceivedStats
  const totalReceived = allTransactions
    .filter(tx => tx.type === 'received')
    .reduce((sum, tx) => {
      const amount = Number.parseFloat(tx.amount.replace('+', ''));
      return sum + (Number.isNaN(amount) ? 0 : amount);
    }, 0);

  const recentActivity = allTransactions
    .slice(0, 10) // Get last 10 transactions
    .map(tx => ({
      amount: Math.abs(Number.parseFloat(tx.amount.replace(/[+-]/g, ''))),
      direction: tx.amount.startsWith('+') ? 'in' as const : 'out' as const,
      date: tx.date
    }));

  return {
    transactions,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
    totalReceived,
    recentActivity
  };
}
