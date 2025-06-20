import {
  ArrowDown,
  ArrowUp,
  PlusCircle,
  QrCode,
  UserPlus,
  Copy,
  Droplets,
  CreditCard,
} from "lucide-react";

import QuickAction from "@/components/QuickAction";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import EnhancedUsernameRegistration from "@/components/EnhancedUsernameRegistration";
import QRCode from "@/components/QRCode";
import QRCodeScanner from "@/components/QRCodeScanner";
import { useDynamicWallet } from "@/hooks/use-dynamic-wallet";
import { useTokenBalances } from "@/hooks/use-token-balances";

import BalanceSkeleton from "@/components/skeletons/BalanceSkeleton";

import { useUSDCFaucet } from "@/hooks/use-usdc-faucet";
import toast from "@/utils/toast-deduplication";

const Home = () => {
  const { isLoggedIn, address } = useDynamicWallet();
  const [prices, setPrices] = useState<{ [key: string]: number }>({
    'usdc': 1.0, // USDC is pegged to USD
    'usdt': 1.0 // USDT is pegged to USD
  });

  // Get token balances
  const { tokens, isLoading } = useTokenBalances();

  // Fetch token prices - simplified for demo
  useEffect(() => {
    // For a real app, you would fetch prices from an API
    // For this demo, we'll use hardcoded prices
    setPrices({
      'usdc': 1.0, // USDC is pegged to USD
      'usdt': 1.0 // USDT is pegged to USD
    });
  }, []);

  // Calculate USD value
  const getUSDValue = (balance: number, symbol: string): number => {
    const tokenSymbol = symbol.toLowerCase();
    const price = prices[tokenSymbol] || 0;
    return balance * price;
  };


  const [showQR, setShowQR] = useState(false);
  const [showUsernameReg, setShowUsernameReg] = useState(false);

  // Request funds state
  const [requestAmount, setRequestAmount] = useState('');
  const [requestToken, setRequestToken] = useState('USDT');
  const [requestMessage, setRequestMessage] = useState('');

  // USDC Faucet functionality
  const { claimTokens, isClaiming, userClaimInfo } = useUSDCFaucet();

  const handleCompleteRegistration = () => {
    setShowUsernameReg(false);
  };

  const handleTopup = async () => {
    try {
      const success = await claimTokens();
      if (success) {
        // Token balances will be automatically refreshed
        toast.success("USDC claimed successfully!", {
          description: "Your balance will be updated shortly"
        });
      }
    } catch (error) {
      console.error("Error claiming USDC:", error);
      toast.error("Failed to claim USDC", {
        description: "Please try again later"
      });
    }
  };

  const handleOnramp = () => {
    // Placeholder for onramp functionality
    toast.success("Onramp feature coming soon!", {
      description: "This will integrate with payment providers"
    });
  };

  const generateRequestQR = () => {
    const requestData = {
      type: 'request',
      address,
      amount: requestAmount,
      token: requestToken,
      message: requestMessage,
      timestamp: new Date().toISOString(),
    };
    return JSON.stringify(requestData);
  };

  return (
    <div className="space-y-6">
      {/* Wallet Balance */}
      {isLoading ? (
        <BalanceSkeleton />
      ) : (
        <Card className="overflow-hidden dark:border-primary/20 border-primary/30">
          <CardContent className="p-4">
            <div className="text-center">
              {!isLoggedIn ? (
                <div className="text-sm text-muted-foreground">
                  Connect wallet to view balance
                </div>
              ) : tokens.length > 0 ? (
                <div className="space-y-2">
                  {/* Total Combined Balance */}
                  <div>
                    <div className="text-2xl font-bold">
                      ${tokens
                        .filter(token => token.symbol === 'USDT' || token.symbol === 'USDC')
                        .reduce((total, token) => total + getUSDValue(token.balance, token.symbol), 0)
                        .toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Balance
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No tokens found
                </div>
              )}
            </div>
            <div className="flex justify-center gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-1"
                onClick={() => setShowQR(true)}
              >
                <QrCode className="h-3 w-3" /> Receive
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-1"
                onClick={handleTopup}
                disabled={isClaiming || !userClaimInfo.canClaim}
              >
                <Droplets className="h-3 w-3" />
                {isClaiming ? "Claiming..." : "Topup"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-1"
                onClick={handleOnramp}
              >
                <CreditCard className="h-3 w-3" />
                Onramp
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <QuickAction
            icon={ArrowUp}
            label="Send"
            to="/app/transfer"
            color="bg-gradient-to-br from-primary to-accent"
          />
          <QuickAction
            icon={ArrowDown}
            label="Claims"
            to="/app/claims"
            color="bg-gradient-to-br from-blue-500 to-cyan-400"
          />
          <QuickAction
            icon={UserPlus}
            label="Set your STRAPT ID"
            onClick={() => setShowUsernameReg(true)}
            color="bg-gradient-to-br from-emerald-500 to-green-400"
          />
        </div>
      </div>

      {/* Stablecoin Balances */}
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Stablecoin Balances</h2>
        <Card className="dark:border-primary/20 border-primary/30">
          <CardContent className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-secondary rounded-full animate-pulse" />
                    <div className="space-y-1">
                      <div className="w-16 h-4 bg-secondary rounded animate-pulse" />
                      <div className="w-24 h-3 bg-secondary rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="w-20 h-6 bg-secondary rounded animate-pulse" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-secondary rounded-full animate-pulse" />
                    <div className="space-y-1">
                      <div className="w-16 h-4 bg-secondary rounded animate-pulse" />
                      <div className="w-24 h-3 bg-secondary rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="w-20 h-6 bg-secondary rounded animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {tokens.filter(token => token.symbol === 'USDT' || token.symbol === 'USDC').map((token) => (
                  <div key={token.symbol} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={token.icon}
                        alt={token.symbol}
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div>
                        <p className="font-medium">{token.symbol}</p>
                        <p className="text-sm text-muted-foreground">{token.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {token.balance.toFixed(2)} {token.symbol}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/*
      Commented out sections - preserved for future use

      Received Stats:
      {isLoading || isLoadingHistory ? (
        <ReceivedStatsSkeleton />
      ) : (
        <ReceivedStats
          totalReceived={totalReceived}
          recentActivity={recentActivity}
        />
      )}

      Recent Activity:
      {isLoading || isLoadingHistory ? (
        <ActivitySkeleton />
      ) : (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Recent Activity</h2>
          <Card className="dark:border-primary/20 border-primary/30">
            <CardContent className="p-0">
              {transactions.length > 0 ? (
                <>
                  {transactions.map((transaction) => (
                    <ActivityItem
                      key={transaction.id}
                      type={transaction.type === 'received' || transaction.type === 'stream_received' ? 'received' :
                            transaction.status === 'pending' ? 'pending' : 'sent'}
                      title={transaction.title}
                      amount={`${transaction.amount} ${transaction.tokenSymbol}`}
                      date={transaction.date.toLocaleDateString()}
                      recipient={transaction.recipient}
                      hash={transaction.hash}
                    />
                  ))}
                  {hasMore && (
                    <div className="p-3 border-t border-border">
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={loadMore}
                        disabled={isLoadingHistory}
                      >
                        {isLoadingHistory ? "Loading..." : "Load More"}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  <p>No recent activity</p>
                  <p className="text-sm">Your transactions will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      */}

      {/* Enhanced Receive Dialog with Request Funds */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Receive Funds</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="receive" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="receive">Receive</TabsTrigger>
              <TabsTrigger value="request">Request</TabsTrigger>
            </TabsList>

            <TabsContent value="receive" className="space-y-4">
              <div className="flex flex-col items-center justify-center space-y-4">
                <QRCode value={address || ''} size={200} />
                <p className="text-sm font-medium">Your Wallet Address</p>
                <p className="text-xs text-muted-foreground text-center">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
                </p>
                <div className="flex flex-col w-full gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (address) {
                        navigator.clipboard.writeText(address);
                        toast.success("Address copied to clipboard");
                      }
                    }}
                    disabled={!address}
                  >
                    <Copy className="h-4 w-4 mr-1" /> Copy Address
                  </Button>
                  <QRCodeScanner
                    buttonVariant="outline"
                    buttonText="Scan QR Code to Claim"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="request" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={requestAmount}
                    onChange={(e) => setRequestAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="token">Token</Label>
                  <Select value={requestToken} onValueChange={setRequestToken}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USDT">USDT</SelectItem>
                      <SelectItem value="USDC">USDC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message (Optional)</Label>
                  <Input
                    id="message"
                    placeholder="What's this for?"
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                  />
                </div>

                {requestAmount && (
                  <div className="flex flex-col items-center justify-center space-y-4 pt-4">
                    <QRCode value={generateRequestQR()} size={200} />
                    <p className="text-sm font-medium">Request: {requestAmount} {requestToken}</p>
                    {requestMessage && (
                      <p className="text-xs text-muted-foreground text-center">"{requestMessage}"</p>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(generateRequestQR());
                        toast.success("Request link copied to clipboard");
                      }}
                      className="w-full"
                    >
                      <Copy className="h-4 w-4 mr-1" /> Copy Request Link
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Username Registration Dialog */}
      <Dialog open={showUsernameReg} onOpenChange={setShowUsernameReg}>
        <DialogContent className="p-0 overflow-hidden max-w-md">
          <EnhancedUsernameRegistration onComplete={handleCompleteRegistration} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;
