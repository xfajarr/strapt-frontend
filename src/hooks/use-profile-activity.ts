import { useState, useEffect, useCallback } from 'react';
import { useDynamicWallet } from './use-dynamic-wallet';
import { useSentTransfersData, useReceivedTransfersData } from '@/services/TransfersDataService';

import { useStraptGift } from './use-strapt-gift';

// Define the activity type
export interface ProfileActivity {
  id: string;
  type: 'transfer' | 'claim' | 'pool' | 'drop';
  title: string;
  amount: string;
  status: 'completed' | 'pending' | 'active' | 'failed';
  timestamp: string;
}

/**
 * Hook to get profile activity data
 * Combines data from transfers and drops
 * Optimized for faster loading with reduced initial data
 */
export function useProfileActivity() {
  const [activities, setActivities] = useState<ProfileActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { address } = useDynamicWallet();

  // Get transfers data - limit initial load for performance
  const { transfers: sentTransfers, isLoading: isSentLoading } = useSentTransfersData();
  const { transfers: receivedTransfers, isLoading: isReceivedLoading } = useReceivedTransfersData();



  // Get STRAPT gifts data - lazy load
  const { getUserCreatedGifts, isLoadingUserGifts } = useStraptGift();
  const [gifts, setGifts] = useState<any[]>([]);
  const [giftsLoaded, setGiftsLoaded] = useState(false);

  // Lazy fetch gifts data only when needed
  useEffect(() => {
    const fetchGifts = async () => {
      if (!address || giftsLoaded) return;

      // Only load gifts after other data is loaded to improve initial performance
      if (!isSentLoading && !isReceivedLoading) {
        try {
          const userGifts = await getUserCreatedGifts();
          setGifts(userGifts || []);
          setGiftsLoaded(true);
        } catch (error) {
          console.error('Error fetching user gifts:', error);
          setGifts([]);
          setGiftsLoaded(true);
        }
      }
    };

    fetchGifts();
  }, [address, getUserCreatedGifts, giftsLoaded, isSentLoading, isReceivedLoading]);

  // Combine all activity data
  useEffect(() => {
    const combineActivityData = () => {
      if (!address) {
        setActivities([]);
        setIsLoading(false);
        return;
      }

      // Check if all data is loaded
      if (isSentLoading || isReceivedLoading || isLoadingUserGifts) {
        return;
      }

      const allActivities: ProfileActivity[] = [];

      // Add sent transfers
      if (sentTransfers && sentTransfers.length > 0) {
        sentTransfers.forEach(transfer => {
          allActivities.push({
            id: `transfer-sent-${transfer.id}`,
            type: 'transfer',
            title: `Transfer sent to ${transfer.recipient ? `${transfer.recipient.slice(0, 6)}...${transfer.recipient.slice(-4)}` : 'recipient'}`,
            amount: `${transfer.amount} ${transfer.tokenSymbol || 'tokens'}`,
            status: transfer.status === 'Claimed' ? 'completed' :
                   transfer.status === 'Refunded' ? 'failed' : 'pending',
            timestamp: new Date(Number(transfer.createdAt) * 1000).toISOString(),
          });
        });
      }

      // Add received transfers
      if (receivedTransfers && receivedTransfers.length > 0) {
        receivedTransfers.forEach(transfer => {
          allActivities.push({
            id: `transfer-received-${transfer.id}`,
            type: 'claim',
            title: `Transfer received from ${transfer.sender ? `${transfer.sender.slice(0, 6)}...${transfer.sender.slice(-4)}` : 'sender'}`,
            amount: `${transfer.amount} ${transfer.tokenSymbol || 'tokens'}`,
            status: transfer.status === 'Claimed' ? 'completed' :
                   transfer.status === 'Refunded' ? 'failed' : 'pending',
            timestamp: new Date(Number(transfer.createdAt) * 1000).toISOString(),
          });
        });
      }



      // Add gifts
      if (gifts && gifts.length > 0) {
        gifts.forEach(gift => {
          allActivities.push({
            id: `gift-${gift.id}`,
            type: 'drop',
            title: `STRAPT Gift created`,
            amount: `${Number(gift.info?.totalAmount || 0) / (10 ** 6)} USDC`, // Assuming USDC for now
            status: gift.info?.isActive ? 'active' :
                   gift.info?.remainingAmount === BigInt(0) ? 'completed' : 'pending',
            timestamp: new Date(Number(gift.info?.expiryTime || 0) * 1000 - 86400000).toISOString(), // 24 hours before expiry
          });
        });
      }

      // Sort by timestamp (newest first)
      allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Set activities (empty array if no real data)
      setActivities(allActivities);
      setIsLoading(false);
    };

    combineActivityData();
  }, [
    address,
    sentTransfers,
    receivedTransfers,
    gifts,
    isSentLoading,
    isReceivedLoading,
    isLoadingUserGifts
  ]);

  return { activities, isLoading };
}
