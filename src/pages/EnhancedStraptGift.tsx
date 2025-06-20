import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useDynamicWallet } from '@/hooks/use-dynamic-wallet';
import { useStraptGift } from '@/hooks/use-strapt-gift';
import type { TokenType } from '@/hooks/use-strapt-gift';
import { useTokenBalances } from '@/hooks/use-token-balances';
import { useConfetti } from '@/hooks/use-confetti';
import { Loading } from '@/components/ui/loading';
import { Gift, AlertTriangle, Check, Share2, QrCode, Shuffle, Coins, Clock, ChevronLeft, Copy, PartyPopper } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import QRCode from '@/components/QRCode';
import { generateGiftClaimLink } from '@/utils/qr-code-utils';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TokenSelect from '@/components/TokenSelect';

const EnhancedStraptGift = () => {
  const navigate = useNavigate();
  const { isLoggedIn, address } = useDynamicWallet();
  const { createGift, isLoading, isApproving, isCreating, currentGiftId } = useStraptGift();
  const { tokens } = useTokenBalances();
  const { triggerCelebrationConfetti } = useConfetti();

  // Form state
  const [tokenType, setTokenType] = useState<TokenType>('USDC');
  const [amount, setAmount] = useState('');
  const [recipients, setRecipients] = useState('10');
  const [isRandomDistribution, setIsRandomDistribution] = useState(false);
  // Fixed expiry time at 24 hours
  const expiryHours = 24;

  // Find selected token from tokens list
  const selectedToken = tokens.find(token => token.symbol === tokenType) || tokens[0];

  // UI state
  const [showSuccess, setShowSuccess] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [giftLink, setGiftLink] = useState('');

  // Validation
  const [errors, setErrors] = useState<{
    amount?: string;
    recipients?: string;
  }>({});

  // Reset form when navigating away
  useEffect(() => {
    return () => {
      setShowSuccess(false);
      setShowQR(false);
    };
  }, []);

  // Show success dialog when gift is created
  useEffect(() => {
    if (currentGiftId) {
      const link = generateGiftClaimLink(currentGiftId);
      setGiftLink(link);
      setShowSuccess(true);

      // Trigger celebration confetti animation
      setTimeout(() => {
        triggerCelebrationConfetti();
      }, 300); // Small delay to let dialog appear first
    }
  }, [currentGiftId, triggerCelebrationConfetti]);

  const validateForm = () => {
    const newErrors: {
      amount?: string;
      recipients?: string;
    } = {};

    // Validate amount
    if (!amount) {
      newErrors.amount = 'Amount is required';
    } else if (Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    } else if (selectedToken && selectedToken.balance !== undefined && Number(amount) > selectedToken.balance) {
      newErrors.amount = 'Amount exceeds your balance';
    }

    // Validate recipients
    if (!recipients) {
      newErrors.recipients = 'Number of recipients is required';
    } else if (Number.isNaN(Number(recipients)) || Number(recipients) <= 0 || !Number.isInteger(Number(recipients))) {
      newErrors.recipients = 'Recipients must be a positive integer';
    } else if (Number(recipients) > 100) {
      newErrors.recipients = 'Maximum 100 recipients allowed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateGift = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const result = await createGift(
        tokenType,
        amount,
        Number.parseInt(recipients),
        isRandomDistribution,
        expiryHours,
        "" // Empty message
      );

      // Show success toast with celebration
      if (result) {
        toast.success('🎉 STRAPT Gift Created Successfully!', {
          description: `${amount} ${tokenType} distributed to ${recipients} recipients`,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error creating gift:', error);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(giftLink);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="container max-w-3xl mx-auto py-4 px-4 sm:px-6 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app')}
            className="mr-1"
            aria-label="Back to App"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">Create STRAPT Gift</h1>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/app/strapt-gift/my-gifts')}
          className="w-full sm:w-auto"
        >
          View My Gifts
        </Button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-primary/20 shadow-md overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Gift className="h-5 w-5 text-primary" />
                Create New STRAPT Gift
              </CardTitle>
              <CardDescription>
                Distribute tokens to multiple recipients with a single transaction
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 pt-5">
              {/* Token Selection */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="token-type" className="text-sm font-medium">Token</Label>
                </div>
                <TokenSelect
                  tokens={tokens.map(token => ({
                    symbol: token.symbol,
                    name: token.name || token.symbol,
                    balance: token.balance,
                    icon: token.symbol === 'USDC'
                      ? '/usd-coin-usdc-logo.svg'
                      : token.symbol === 'USDT'
                        ? '/assets/tether-usdt-seeklogo.svg'
                        : token.symbol === 'IDRX'
                          ? '/IDRX BLUE COIN.svg'
                          : undefined
                  }))}
                  selectedToken={{
                    symbol: selectedToken.symbol,
                    name: selectedToken.name || selectedToken.symbol,
                    balance: selectedToken.balance,
                    icon: selectedToken.symbol === 'USDC'
                      ? '/usd-coin-usdc-logo.svg'
                      : selectedToken.symbol === 'USDT'
                        ? '/assets/tether-usdt-seeklogo.svg'
                        : selectedToken.symbol === 'IDRX'
                          ? '/IDRX BLUE COIN.svg'
                          : undefined
                  }}
                  onTokenChange={(token) => setTokenType(token.symbol as TokenType)}
                  className="w-full"
                />
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="amount" className="text-sm font-medium">Total Amount</Label>
                  {selectedToken && selectedToken.balance !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      Balance: {selectedToken.balance.toLocaleString()} {selectedToken.symbol}
                    </span>
                  )}
                </div>
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={errors.amount ? 'border-destructive' : ''}
                />
                {errors.amount && (
                  <p className="text-xs text-destructive">{errors.amount}</p>
                )}
              </div>

              {/* Recipients Input */}
              <div className="space-y-2">
                <Label htmlFor="recipients" className="text-sm font-medium">Number of Recipients</Label>
                <Input
                  id="recipients"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="Enter number of recipients"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  className={errors.recipients ? 'border-destructive' : ''}
                />
                {errors.recipients && (
                  <p className="text-xs text-destructive">{errors.recipients}</p>
                )}
              </div>

              {/* Distribution Type */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="distribution-type" className="text-sm font-medium">Random Distribution</Label>
                  <Switch
                    id="distribution-type"
                    checked={isRandomDistribution}
                    onCheckedChange={setIsRandomDistribution}
                  />
                </div>

                <div className={cn(
                  "p-3 rounded-lg border",
                  isRandomDistribution
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-blue-500/10 border-blue-500/30"
                )}>
                  {isRandomDistribution ? (
                    <div className="flex items-start gap-3">
                      <Shuffle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Random Distribution</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Recipients will receive random amounts between 1% and 200% of the average amount.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <Coins className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Fixed Distribution</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Each recipient will receive exactly {amount && recipients ? (Number(amount) / Number(recipients)).toLocaleString() : '0'} {selectedToken?.symbol}.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Expiry Time */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Expiry Time</Label>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-muted">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">24 Hours</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Unclaimed tokens can be refunded after 24 hours.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-end pt-2 pb-6 px-6 border-t border-border">
              <motion.div
                whileHover={!isLoading && !isApproving && !isCreating ? { scale: 1.02 } : {}}
                whileTap={!isLoading && !isApproving && !isCreating ? { scale: 0.98 } : {}}
                className="relative"
              >
                <Button
                  onClick={handleCreateGift}
                  disabled={isLoading || isApproving || isCreating}
                  className={cn(
                    "min-w-32 relative overflow-hidden transition-all duration-300",
                    (isLoading || isApproving || isCreating) && "cursor-not-allowed"
                  )}
                >
                  {/* Loading Background Animation */}
                  <AnimatePresence>
                    {(isApproving || isCreating) && (
                      <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        exit={{ x: "100%" }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      />
                    )}
                  </AnimatePresence>

                  {/* Button Content */}
                  <div className="relative z-10 flex items-center">
                    {isApproving ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                          className="mr-2"
                        >
                          <Loading size="sm" />
                        </motion.div>
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          Approving...
                        </motion.span>
                      </>
                    ) : isCreating ? (
                      <>
                        <motion.div
                          animate={{
                            rotate: 360,
                            scale: [1, 1.1, 1]
                          }}
                          transition={{
                            rotate: {
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear"
                            },
                            scale: {
                              duration: 0.8,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }
                          }}
                          className="mr-2"
                        >
                          <Loading size="sm" />
                        </motion.div>
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                          className="relative"
                        >
                          Creating
                          <motion.span
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            ...
                          </motion.span>
                        </motion.span>
                      </>
                    ) : (
                      <>
                        <motion.div
                          whileHover={{
                            rotate: [0, -10, 10, 0],
                            scale: [1, 1.1, 1]
                          }}
                          transition={{ duration: 0.3 }}
                          className="mr-2"
                        >
                          <Gift className="h-4 w-4" />
                        </motion.div>
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          Create Gift
                        </motion.span>
                      </>
                    )}
                  </div>

                  {/* Pulse Effect for Loading States */}
                  <AnimatePresence>
                    {(isApproving || isCreating) && (
                      <motion.div
                        initial={{ scale: 1, opacity: 0.5 }}
                        animate={{
                          scale: [1, 1.05, 1],
                          opacity: [0.5, 0.8, 0.5]
                        }}
                        exit={{ scale: 1, opacity: 0 }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="absolute inset-0 bg-primary/10 rounded-md"
                      />
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="flex items-center gap-3 text-xl">
                <motion.div
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 flex items-center justify-center"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                  >
                    <Check className="h-6 w-6 text-green-500" />
                  </motion.div>
                </motion.div>
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="flex items-center gap-2"
                >
                  STRAPT Gift Created!
                  <motion.div
                    animate={{
                      rotate: [0, 10, -10, 10, 0],
                      scale: [1, 1.1, 1, 1.1, 1]
                    }}
                    transition={{
                      delay: 0.6,
                      duration: 0.6,
                      ease: "easeInOut"
                    }}
                  >
                    <PartyPopper className="h-5 w-5 text-amber-500" />
                  </motion.div>
                </motion.div>
              </DialogTitle>
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <DialogDescription className="text-base pt-2">
                  Your STRAPT Gift has been created successfully. Share the link with recipients.
                </DialogDescription>
              </motion.div>
            </DialogHeader>
          </motion.div>

          <motion.div
            className="px-6 py-4 space-y-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.4 }}
          >
            <motion.div
              className="flex items-center space-x-2"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.3 }}
            >
              <Input
                readOnly
                value={giftLink}
                className="flex-1 text-sm"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={handleCopyLink}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy link</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>

            <motion.div
              className="flex justify-center"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.3 }}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  onClick={() => setShowQR(true)}
                  className="w-full sm:w-auto"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Show QR Code
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.4 }}
          >
            <DialogFooter className="px-6 py-4 border-t border-border">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:justify-between">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSuccess(false);
                      navigate('/app/strapt-gift/my-gifts');
                    }}
                    className="w-full"
                  >
                    View My Gifts
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto order-1 sm:order-2"
                >
                  <Button
                    onClick={() => {
                      setShowSuccess(false);
                      setTokenType('USDC');
                      setAmount('');
                      setRecipients('10');
                      setIsRandomDistribution(false);
                    }}
                    className="w-full"
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Create Another Gift
                  </Button>
                </motion.div>
              </div>
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              STRAPT Gift QR Code
            </DialogTitle>
            <DialogDescription>
              Scan this QR code to claim tokens from the STRAPT Gift
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center py-6">
            <QRCode value={giftLink} size={250} />
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border">
            <Button
              onClick={() => setShowQR(false)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedStraptGift;
