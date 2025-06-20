import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useDynamicWallet } from '@/hooks/use-dynamic-wallet';
import { useStraptGift } from '@/hooks/use-strapt-gift';
import type { GiftInfo } from '@/hooks/use-strapt-gift';
import { Loading } from '@/components/ui/loading';
import { Gift, Clock, Users, AlertTriangle, Check, Shuffle, Coins, PartyPopper, QrCode, ChevronLeft, Droplets } from 'lucide-react';
import { formatUnits } from 'viem';
import contractConfig from '@/contracts/contract-config.json';
import QRCodeScanner from '@/components/QRCodeScanner';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import FaucetClaim from '@/components/FaucetClaim';

const EnhancedStraptGiftClaim = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isLoggedIn, address } = useDynamicWallet();
  const { getGiftInfo, claimGift, hasAddressClaimed, isLoading, isClaiming } = useStraptGift();

  // Extract gift ID from URL - handle both path params and query params
  const getGiftIdFromUrl = () => {
    // First try to get from path parameters (e.g., /strapt-gift/claim/0x123...)
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];

    // Check if the last segment is a valid gift ID (starts with 0x and is 66 characters)
    if (lastSegment && lastSegment.startsWith('0x') && lastSegment.length === 66) {
      return lastSegment;
    }

    // If not found in path, try query parameters
    const params = new URLSearchParams(location.search);
    const queryGiftId = params.get('id') || params.get('giftId');

    // Validate query parameter gift ID
    if (queryGiftId && queryGiftId.startsWith('0x') && queryGiftId.length === 66) {
      return queryGiftId;
    }

    return '';
  };

  const giftId = getGiftIdFromUrl();

  // State
  const [giftInfo, setGiftInfo] = useState<GiftInfo | null>(null);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [claimAmount, setClaimAmount] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load gift info
  useEffect(() => {
    const loadGiftInfo = async () => {
      // Validate gift ID before making any calls
      if (!giftId || !giftId.startsWith('0x') || giftId.length !== 66) {
        if (giftId && giftId !== '') {
          console.error('Invalid gift ID format:', giftId);
          setError('Invalid gift ID format');
        }
        return;
      }

      try {
        const info = await getGiftInfo(giftId);
        setGiftInfo(info);

        // Check if user has already claimed
        if (address) {
          const claimed = await hasAddressClaimed(giftId, address);
          setHasClaimed(claimed);
        }
      } catch (error) {
        console.error('Error loading gift info:', error);
        setError('Failed to load gift information');
      }
    };

    loadGiftInfo();
  }, [giftId, address, getGiftInfo, hasAddressClaimed]);

  // Function to trigger confetti
  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Since particles fall down, start a bit higher than random
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: randomInRange(0, 0.2) }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: randomInRange(0, 0.2) }
      });
    }, 250);
  };

  // Check if gift is expired
  const isExpired = (expiryTime: bigint) => {
    return Date.now() / 1000 > Number(expiryTime);
  };

  // Check if creator is within cooldown period (can't claim their own gift within 24 hours)
  const isCreatorWithinCooldown = (info: GiftInfo) => {
    if (!address) return false;
    return address.toLowerCase() === info.creator.toLowerCase();
  };

  // Format token amount
  const formatTokenAmount = (amount: bigint, tokenAddress: string) => {
    const tokenDecimals =
      tokenAddress.toLowerCase() === contractConfig.StraptGift.supportedTokens.USDC.toLowerCase()
        ? 6
        : tokenAddress.toLowerCase() === contractConfig.StraptGift.supportedTokens.USDT.toLowerCase()
          ? 6
          : 18;

    return formatUnits(amount, tokenDecimals);
  };

  // Get token symbol
  const getTokenSymbol = (tokenAddress: string) => {
    if (tokenAddress.toLowerCase() === contractConfig.StraptGift.supportedTokens.USDC.toLowerCase()) {
      return 'USDC';
    }
    if (tokenAddress.toLowerCase() === contractConfig.StraptGift.supportedTokens.USDT.toLowerCase()) {
      return 'USDT';
    }
    return 'Tokens';
  };

  // Handle claim
  const handleClaim = async () => {
    // Validate inputs before proceeding
    if (!giftId || !giftInfo || !isLoggedIn) return;

    // Additional validation for gift ID format
    if (!giftId.startsWith('0x') || giftId.length !== 66) {
      toast({
        title: 'Invalid Gift ID',
        description: 'The gift ID format is invalid',
        variant: 'destructive'
      });
      return;
    }

    try {
      const amount = await claimGift(giftId);
      setClaimAmount(formatTokenAmount(amount, giftInfo.tokenAddress));
      setHasClaimed(true);

      // Show success animation
      setShowSuccessAnimation(true);

      // Trigger confetti
      triggerConfetti();

      // Hide success animation after 5 seconds
      setTimeout(() => {
        setShowSuccessAnimation(false);
      }, 5000);

    } catch (error) {
      console.error('Error claiming gift:', error);

      // Handle specific error messages
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('already claimed')) {
        toast({
          title: 'Already Claimed',
          description: 'You have already claimed tokens from this gift',
          variant: 'destructive'
        });
        setHasClaimed(true);
      } else if (errorMessage.includes('gift is not active')) {
        toast({
          title: 'Gift Inactive',
          description: 'This gift is no longer active',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Claim Failed',
          description: 'Failed to claim tokens. Please try again.',
          variant: 'destructive'
        });
      }
    }
  };

  // Handle QR code scan
  const handleScan = (data: string) => {
    try {
      // Extract gift ID from URL
      const url = new URL(data);
      const pathSegments = url.pathname.split('/');
      const scannedGiftId = pathSegments[pathSegments.length - 1];

      if (scannedGiftId) {
        navigate(`/app/strapt-gift/claim/${scannedGiftId}`);
      }
    } catch (error) {
      console.error('Invalid QR code data:', error);
      toast({
        title: 'Invalid QR Code',
        description: 'The scanned QR code is not a valid STRAPT Gift',
        variant: 'destructive'
      });
    }
  };

  // Calculate progress percentage
  const getClaimProgress = () => {
    if (!giftInfo) return 0;
    return Number(giftInfo.claimedCount) / Number(giftInfo.totalRecipients) * 100;
  };

  return (
    <div className="container max-w-3xl mx-auto py-4 px-4 sm:px-6 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app/strapt-gift')}
            className="mr-1"
            aria-label="Back to STRAPT Gift"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">Claim STRAPT Gift</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowScanner(true)}
          >
            <QrCode className="h-4 w-4 mr-2" />
            Scan QR Code
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/app/strapt-gift')}
          >
            <Gift className="h-4 w-4 mr-2" />
            Create Gift
          </Button>
        </div>
      </div>

      {!giftId ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border border-primary/20 shadow-md overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 sm:px-6 text-center">
              <Gift className="h-16 w-16 text-primary/70 mb-6" />
              <h2 className="text-xl font-medium mb-3">No Gift ID Provided</h2>
              <p className="text-base text-muted-foreground mb-8 max-w-md">
                Please scan a QR code or use a link to claim tokens from a STRAPT Gift
              </p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/app/strapt-gift')}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  size="lg"
                  onClick={() => setShowScanner(true)}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Scan QR Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border border-destructive/20 shadow-md overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 sm:px-6 text-center">
              <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
              <h2 className="text-xl font-medium mb-3">Gift Not Found</h2>
              <p className="text-base text-muted-foreground mb-8 max-w-md">
                The STRAPT Gift you're looking for doesn't exist or has been removed
              </p>
              <Button
                onClick={() => navigate('/app/strapt-gift')}
              >
                Create a New Gift
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : isLoading ? (
        <Card className="border border-primary/20 shadow-md overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 sm:px-6 text-center">
            <Loading text="Loading gift information..." />
          </CardContent>
        </Card>
      ) : giftInfo ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-xl mx-auto"
        >
          <Card className="overflow-hidden border border-primary/20 shadow-lg">
            <CardHeader className="bg-muted/20 border-b border-border pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Gift className="h-6 w-6 text-primary" />
                STRAPT Gift
              </CardTitle>
              <CardDescription>
                Claim your tokens from this STRAPT Gift
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Token Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden">
                    {getTokenSymbol(giftInfo.tokenAddress) === 'USDC' ? (
                      <img src="/usd-coin-usdc-logo.svg" alt="USDC" className="w-full h-full object-cover" />
                    ) : getTokenSymbol(giftInfo.tokenAddress) === 'USDT' ? (
                      <img src="/assets/tether-usdt-seeklogo.svg" alt="USDT" className="w-full h-full object-cover" />
                    ) : (
                      <Coins className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">
                      {getTokenSymbol(giftInfo.tokenAddress)}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {giftInfo.isRandom ? 'Random amount' : formatTokenAmount(giftInfo.amountPerRecipient, giftInfo.tokenAddress)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <h3 className="font-medium">
                    {Number(giftInfo.claimedCount).toLocaleString()} / {Number(giftInfo.totalRecipients).toLocaleString()}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Recipients claimed
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress value={getClaimProgress()} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.round(getClaimProgress())}%</span>
                </div>
              </div>

              {/* Distribution Type */}
              <div className={cn(
                "p-3 rounded-lg border",
                giftInfo.isRandom
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-blue-500/10 border-blue-500/30"
              )}>
                {giftInfo.isRandom ? (
                  <div className="flex items-start gap-3">
                    <Shuffle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Random Distribution</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        You'll receive a random amount between 1% and 200% of the average.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <Coins className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Fixed Distribution</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Each recipient receives exactly {formatTokenAmount(giftInfo.amountPerRecipient, giftInfo.tokenAddress)} {getTokenSymbol(giftInfo.tokenAddress)}.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Expiry Time */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-muted">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {isExpired(giftInfo.expiryTime) ? 'Expired' : 'Expires in'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isExpired(giftInfo.expiryTime)
                      ? 'This gift has expired. Unclaimed tokens can be refunded by the creator.'
                      : `Expires ${new Date(Number(giftInfo.expiryTime) * 1000).toLocaleString()}`
                    }
                  </p>
                </div>
              </div>

              {/* Claimed Amount (if claimed) */}
              <AnimatePresence>
                {hasClaimed && claimAmount && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30"
                  >
                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        Claimed Successfully
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        You received {claimAmount} {getTokenSymbol(giftInfo.tokenAddress)}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>

            <CardFooter className="pt-2 pb-6 px-6 border-t border-border">
              <div className="flex gap-3 w-full">
                <motion.div
                  className="flex-1"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    className={cn(
                      "w-full text-base py-6",
                      hasClaimed && "bg-green-500 hover:bg-green-600"
                    )}
                    size="lg"
                    disabled={
                      isLoading ||
                      isClaiming ||
                      hasClaimed ||
                      !giftInfo.isActive ||
                      isExpired(giftInfo.expiryTime) ||
                      giftInfo.claimedCount >= giftInfo.totalRecipients ||
                      isCreatorWithinCooldown(giftInfo)
                    }
                    onClick={handleClaim}
                  >
                    {isClaiming ? (
                      <>
                        <Loading size="sm" className="mr-2" />
                        Claiming...
                      </>
                    ) : hasClaimed ? (
                      <>
                        <Check className="h-5 w-5 mr-2" />
                        Claimed
                      </>
                    ) : (
                      <>
                        <Gift className="h-5 w-5 mr-2" />
                        Claim Gift
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      ) : null}

      {/* QR Code Scanner Dialog */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan STRAPT Gift QR Code</DialogTitle>
            <DialogDescription>
              Point your camera at a STRAPT Gift QR code to claim tokens
            </DialogDescription>
          </DialogHeader>
          <QRCodeScanner onScan={handleScan} />
        </DialogContent>
      </Dialog>

      {/* Success Animation Overlay */}
      <AnimatePresence>
        {showSuccessAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="bg-background rounded-lg p-8 text-center max-w-sm mx-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <PartyPopper className="h-16 w-16 text-primary mx-auto mb-4" />
              </motion.div>
              <h3 className="text-xl font-bold mb-2">Congratulations!</h3>
              <p className="text-muted-foreground">
                You've successfully claimed your STRAPT Gift!
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-up Modal */}
      <Dialog open={showTopupModal} onOpenChange={setShowTopupModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Need Test Tokens?</DialogTitle>
            <DialogDescription>
              Get free test tokens to interact with STRAPT Gift
            </DialogDescription>
          </DialogHeader>
          <FaucetClaim />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedStraptGiftClaim;
