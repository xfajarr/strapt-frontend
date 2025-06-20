import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useDynamicWallet } from '@/hooks/use-dynamic-wallet';
import { useStraptGift } from '@/hooks/use-strapt-gift';
import { Loading } from '@/components/ui/loading';
import { Gift, RefreshCcw, AlertTriangle, ChevronLeft, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import QRCode from '@/components/QRCode';
import InfoTooltip from '@/components/InfoTooltip';
import { Card, CardContent } from '@/components/ui/card';
import { generateGiftClaimLink } from '@/utils/qr-code-utils';

const OptimizedMyGifts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isLoggedIn, address } = useDynamicWallet();
  const {
    getUserCreatedGifts,
    refundExpiredGift,
    isRefunding,
    isLoadingUserGifts,
  } = useStraptGift();

  const [userGifts, setUserGifts] = useState<any[]>([]);
  const [refundingGifts, setRefundingGifts] = useState<{[key: string]: boolean}>({});
  const [showQR, setShowQR] = useState(false);
  const [currentQRLink, setCurrentQRLink] = useState('');

  // Load user's gifts
  useEffect(() => {
    if (isLoggedIn && address) {
      loadUserGifts();
    }
  }, [isLoggedIn, address]);

  // Load user's gifts
  const loadUserGifts = async () => {
    if (!isLoggedIn || !address) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to view your gifts'
      });
      return;
    }

    try {
      const gifts = await getUserCreatedGifts();
      setUserGifts(gifts);
    } catch (error) {
      console.error('Error loading user gifts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your gifts'
      });
    }
  };

  // Handle refund
  const handleRefund = useCallback(async (giftId: string) => {
    if (!isLoggedIn) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to refund this gift'
      });
      return;
    }

    try {
      setRefundingGifts(prev => ({ ...prev, [giftId]: true }));

      await refundExpiredGift(giftId);

      toast({
        title: 'Success',
        description: 'Successfully refunded gift'
      });

      // Reload gifts after refund
      await loadUserGifts();
    } catch (error) {
      console.error('Error refunding gift:', error);

      if (error instanceof Error) {
        if (error.message.includes('NotExpiredYet')) {
          toast({
            title: 'Error',
            description: 'This gift has not expired yet'
          });
        } else if (error.message.includes('NotCreator')) {
          toast({
            title: 'Error',
            description: 'Only the creator can refund this gift'
          });
        } else if (error.message.includes('GiftNotActive')) {
          toast({
            title: 'Error',
            description: 'This gift is not active'
          });
        } else if (error.message.includes('GiftNotFound')) {
          toast({
            title: 'Error',
            description: 'This gift does not exist'
          });
          // Reload gifts to remove the non-existent gift from the list
          await loadUserGifts();
        } else {
          toast({
            title: 'Error',
            description: `Error refunding gift: ${error.message}`
          });
        }
      } else {
        toast({
          title: 'Error',
          description: 'An unknown error occurred while refunding the gift'
        });
      }
    } finally {
      setRefundingGifts(prev => ({ ...prev, [giftId]: false }));
    }
  }, [isLoggedIn, refundExpiredGift, toast, loadUserGifts]);

  // Handle showing QR code
  const handleShowQR = useCallback((link: string) => {
    setCurrentQRLink(link);
    setShowQR(true);
  }, []);

  return (
    <div className="container max-w-4xl mx-auto py-4 px-4 sm:px-6 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/strapt-gift')}
            className="mr-1 p-2"
            aria-label="Back to STRAPT Gift"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">My STRAPT Gifts</h1>
          <InfoTooltip
            content={
              <div>
                <p className="font-medium mb-1">About My STRAPT Gifts</p>
                <p className="mb-1">View and manage your created STRAPT Gifts.</p>
                <ul className="list-disc pl-4 text-xs space-y-1">
                  <li>See all gifts you've created</li>
                  <li>Refund expired gifts that haven't been fully claimed</li>
                  <li>Track claim status of your gifts</li>
                </ul>
              </div>
            }
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadUserGifts}
            disabled={isLoadingUserGifts}
            className="flex-1 sm:flex-none"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/app/strapt-gift')}
            className="flex-1 sm:flex-none"
          >
            <Gift className="h-4 w-4 mr-2" />
            Create New Gift
          </Button>
        </div>
      </div>

      {!isLoggedIn ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-2 border-muted">
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-10 px-4 sm:px-6 text-center">
              <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4 sm:mb-6" />
              <p className="text-lg sm:text-xl font-medium mb-2">Wallet Not Connected</p>
              <p className="text-sm sm:text-base text-muted-foreground mb-6">Please connect your wallet to view your STRAPT Gifts</p>
              <Button size="lg" className="px-8">
                Connect Wallet
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : isLoadingUserGifts ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 sm:py-20"
        >
          <Loading size="lg" />
          <p className="mt-4 text-muted-foreground animate-pulse">Loading your STRAPT Gifts...</p>
        </motion.div>
      ) : userGifts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-2 border-muted">
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-10 px-4 sm:px-6 text-center">
              <Gift className="h-12 w-12 sm:h-16 sm:w-16 text-primary/70 mb-4 sm:mb-6" />
              <p className="text-lg sm:text-xl font-medium mb-2">No STRAPT Gifts Found</p>
              <p className="text-sm sm:text-base text-muted-foreground mb-6">You haven't created any STRAPT Gifts yet</p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => navigate('/app/strapt-gift')}
                  size="lg"
                  className="px-8"
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Create Your First Gift
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          <AnimatePresence>
            {userGifts.map((gift, index) => (
              <Card key={gift.id} className="border border-primary/20 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">STRAPT Gift</h3>
                    <Gift className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Gift ID: {gift.id.slice(0, 10)}...
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleShowQR(generateGiftClaimLink(gift.id))}
                    >
                      Share
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRefund(gift.id)}
                      disabled={refundingGifts[gift.id]}
                    >
                      {refundingGifts[gift.id] ? 'Refunding...' : 'Refund'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>STRAPT Gift QR Code</DialogTitle>
            <DialogDescription>
              Share this QR code to let recipients claim tokens from your STRAPT Gift
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <QRCode value={currentQRLink} size={250} />
          </div>
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setShowQR(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(currentQRLink);
                toast({
                  title: 'Success',
                  description: 'Link copied to clipboard'
                });
              }}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OptimizedMyGifts;
