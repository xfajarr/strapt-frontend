import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Clock, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useLinkTransfer, LinkTransfer, TransferStatus } from '@/hooks/use-link-transfer';
import { useAccount } from 'wagmi';
import { AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import TransferCard from '@/components/transfer/TransferCard';

const MyTransfers = () => {
  const { address } = useAccount();
  const { toast } = useToast();
  const {
    getTransfersBySender,
    getTransferDetails,
    refundTransfer,
    instantRefund,
    isTransferExpired,
    isLoading: isTransactionLoading
  } = useLinkTransfer();

  const [transfers, setTransfers] = useState<LinkTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refundingTransfers, setRefundingTransfers] = useState<Set<string>>(new Set());

  // Load user's transfers
  const loadTransfers = useCallback(async () => {
    if (!address) return;

    try {
      setIsLoading(true);
      console.log('Loading transfers for address:', address);

      // Get transfer IDs for this sender
      const transferIds = await getTransfersBySender(address);
      console.log('Found transfer IDs:', transferIds);

      // Get details for each transfer
      const transferDetails = await Promise.all(
        transferIds.map(async (id) => {
          const details = await getTransferDetails(id);
          return details;
        })
      );

      // Filter out null results and sort by creation time (newest first)
      const validTransfers = transferDetails
        .filter((transfer): transfer is LinkTransfer => transfer !== null)
        .sort((a, b) => b.createdAt - a.createdAt);

      setTransfers(validTransfers);
      console.log('Loaded transfers:', validTransfers);

    } catch (error) {
      console.error('Error loading transfers:', error);
      toast({
        title: "Error Loading Transfers",
        description: "Failed to load your transfers. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [address, getTransfersBySender, getTransferDetails, toast]);

  // Handle refund
  const handleRefund = async (transfer: LinkTransfer, isInstant: boolean = false) => {
    try {
      setRefundingTransfers(prev => new Set(prev).add(transfer.id));

      const refundFunction = isInstant ? instantRefund : refundTransfer;
      const result = await refundFunction(transfer.id);

      toast({
        title: "Refund Successful",
        description: `Successfully refunded ${transfer.amount} ${transfer.tokenSymbol}`,
      });

      // Reload transfers to update the list
      await loadTransfers();

    } catch (error) {
      console.error('Error refunding transfer:', error);
      toast({
        title: "Refund Failed",
        description: error instanceof Error ? error.message : "Failed to refund transfer",
        variant: "destructive"
      });
    } finally {
      setRefundingTransfers(prev => {
        const newSet = new Set(prev);
        newSet.delete(transfer.id);
        return newSet;
      });
    }
  };

  // Load transfers on mount and when address changes
  useEffect(() => {
    loadTransfers();
  }, [address, loadTransfers]);

  // Get status info for display
  const getStatusInfo = (transfer: LinkTransfer) => {
    const isExpired = isTransferExpired(transfer.expiry);

    switch (transfer.status) {
      case TransferStatus.Pending:
        if (isExpired) {
          return {
            label: 'Expired',
            color: 'destructive' as const,
            icon: <XCircle className="h-3 w-3" />,
            canRefund: true
          };
        }
        return {
          label: 'Pending',
          color: 'secondary' as const,
          icon: <Clock className="h-3 w-3" />,
          canRefund: false
        };
      case TransferStatus.Claimed:
        return {
          label: 'Claimed',
          color: 'default' as const,
          icon: <CheckCircle className="h-3 w-3" />,
          canRefund: false
        };
      case TransferStatus.Refunded:
        return {
          label: 'Refunded',
          color: 'outline' as const,
          icon: <RefreshCw className="h-3 w-3" />,
          canRefund: false
        };
      default:
        return {
          label: 'Unknown',
          color: 'outline' as const,
          icon: <AlertTriangle className="h-3 w-3" />,
          canRefund: false
        };
    }
  };

  if (!address) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Wallet Not Connected</h3>
            <p className="text-muted-foreground text-center">
              Please connect your wallet to view your transfers.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/profile">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">My Transfers</h1>
            <p className="text-muted-foreground">Manage your sent transfers</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadTransfers}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Transfers List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : transfers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Transfers Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              You haven't created any transfers yet.
            </p>
            <Link to="/app/transfer">
              <Button>Create Transfer</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {transfers.map((transfer) => {
              const statusInfo = getStatusInfo(transfer);
              const isRefunding = refundingTransfers.has(transfer.id);
              const isExpired = isTransferExpired(transfer.expiry);

              return (
                <TransferCard
                  key={transfer.id}
                  transfer={transfer}
                  isRefunding={isRefunding}
                  canRefund={statusInfo.canRefund}
                  isExpired={isExpired}
                  onRefund={() => handleRefund(transfer)}
                  onInstantRefund={() => handleRefund(transfer, true)}
                  showActions={true}
                  showQRCode={true}
                />
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default MyTransfers;
