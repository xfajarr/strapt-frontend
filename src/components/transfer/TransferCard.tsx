import { useState } from 'react';
import { RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle, Copy, QrCode, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LinkTransfer, TransferStatus } from '@/hooks/use-link-transfer';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface TransferCardProps {
  transfer: LinkTransfer;
  isRefunding?: boolean;
  canRefund?: boolean;
  isExpired?: boolean;
  onRefund?: (transfer: LinkTransfer) => void;
  onInstantRefund?: (transfer: LinkTransfer) => void;
  showActions?: boolean;
  showQRCode?: boolean;
  onShowQR?: (transfer: LinkTransfer) => void;
}

const TransferCard = ({
  transfer,
  isRefunding = false,
  canRefund = false,
  isExpired = false,
  onRefund,
  onInstantRefund,
  showActions = true,
  showQRCode = false,
  onShowQR
}: TransferCardProps) => {
  const { toast } = useToast();
  const [showTransferId, setShowTransferId] = useState(false);

  // Get status info for display
  const getStatusInfo = () => {
    switch (transfer.status) {
      case TransferStatus.Pending:
        if (isExpired) {
          return {
            label: 'Expired',
            color: 'destructive' as const,
            icon: <XCircle className="h-3 w-3" />
          };
        }
        return {
          label: 'Pending',
          color: 'secondary' as const,
          icon: <Clock className="h-3 w-3" />
        };
      case TransferStatus.Claimed:
        return {
          label: 'Claimed',
          color: 'default' as const,
          icon: <CheckCircle className="h-3 w-3" />
        };
      case TransferStatus.Refunded:
        return {
          label: 'Refunded',
          color: 'outline' as const,
          icon: <RefreshCw className="h-3 w-3" />
        };
      default:
        return {
          label: 'Unknown',
          color: 'outline' as const,
          icon: <AlertTriangle className="h-3 w-3" />
        };
    }
  };

  const statusInfo = getStatusInfo();

  // Copy transfer ID to clipboard
  const copyTransferId = async () => {
    try {
      await navigator.clipboard.writeText(transfer.id);
      toast({
        title: "Copied!",
        description: "Transfer ID copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy transfer ID:', error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy transfer ID",
        variant: "destructive"
      });
    }
  };

  // Generate transfer link for sharing
  const getTransferLink = () => {
    return `${window.location.origin}/claim/${transfer.id}`;
  };

  // Copy transfer link to clipboard
  const copyTransferLink = async () => {
    try {
      const link = getTransferLink();
      await navigator.clipboard.writeText(link);
      toast({
        title: "Link Copied!",
        description: "Transfer link copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy transfer link:', error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy transfer link",
        variant: "destructive"
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              {/* Amount and Status */}
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-semibold text-lg">
                  {transfer.amount} {transfer.tokenSymbol}
                </h3>
                <Badge variant={statusInfo.color} className="flex items-center gap-1">
                  {statusInfo.icon}
                  {statusInfo.label}
                </Badge>
                {transfer.hasPassword && (
                  <Badge variant="outline" className="text-xs">
                    Password Protected
                  </Badge>
                )}
              </div>

              {/* Transfer Details */}
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>Transfer ID:</span>
                  <div className="flex items-center gap-1">
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {showTransferId 
                        ? transfer.id 
                        : `${transfer.id.slice(0, 10)}...${transfer.id.slice(-8)}`
                      }
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setShowTransferId(!showTransferId)}
                    >
                      {showTransferId ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={copyTransferId}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p>
                  Expires: {formatDistanceToNow(new Date(transfer.expiry * 1000), { addSuffix: true })}
                </p>
                <p>
                  Created: {formatDistanceToNow(new Date(transfer.createdAt), { addSuffix: true })}
                </p>
              </div>

              {/* Action Buttons for Pending Transfers */}
              {transfer.status === TransferStatus.Pending && showActions && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyTransferLink}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                  
                  {showQRCode && onShowQR && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onShowQR(transfer)}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Show QR
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            {/* Refund Actions */}
            {showActions && canRefund && onRefund && (
              <div className="flex flex-col gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRefund(transfer)}
                  disabled={isRefunding}
                  className="min-w-[100px]"
                >
                  {isRefunding ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Refunding...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refund
                    </>
                  )}
                </Button>
                
                {/* Show instant refund for non-expired transfers if available */}
                {!isExpired && onInstantRefund && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onInstantRefund(transfer)}
                    disabled={isRefunding}
                    className="min-w-[100px] text-xs"
                  >
                    Instant Refund
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TransferCard;
