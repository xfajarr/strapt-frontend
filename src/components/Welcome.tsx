import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CircleDollarSign, Wallet, ArrowRight, Clock, Shield, Link2, QrCode, Milestone } from 'lucide-react';
import { useDynamicWallet } from '@/hooks/use-dynamic-wallet';

/**
 * Welcome component that provides an introduction to the app for new users
 */
const Welcome: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const { isLoggedIn, connectWallet } = useDynamicWallet();

  // Check if user has seen the welcome screen before
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (hasSeenWelcome === 'true') {
      setShowWelcome(false);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setShowWelcome(false);
  };

  if (!showWelcome) {
    return null;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto mb-8 border-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <CircleDollarSign className="h-6 w-6 text-primary" />
          Welcome to STRAPT
        </CardTitle>
        <CardDescription>
          Your platform for secure token transfers and payment streams
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Secure Token Transfers
                </h3>
                <p className="text-sm text-muted-foreground">
                  Send tokens securely with optional password protection and expiry times.
                </p>
                <ul className="text-sm space-y-2 mt-2">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>Direct transfers to any wallet address</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Link2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>Create shareable links for recipients</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <QrCode className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>Generate QR codes for easy claiming</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>Add password protection for extra security</span>
                  </li>
                </ul>
              </div>
              <div className="bg-secondary/30 rounded-lg p-4">
                <h4 className="font-medium mb-2">How to use Protected Transfers:</h4>
                <ol className="text-sm space-y-2 list-decimal pl-5">
                  <li>Connect your wallet</li>
                  <li>Go to the Transfers page</li>
                  <li>Enter recipient address or generate a link/QR</li>
                  <li>Set amount and optional password protection</li>
                  <li>Approve and confirm the transaction</li>
                  <li>Share the link or QR code with your recipient</li>
                </ol>
              </div>
            </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleDismiss}>
          Don't show again
        </Button>
        {!isLoggedIn ? (
          <Button onClick={() => connectWallet()}>
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet to Start
          </Button>
        ) : (
          <Button onClick={handleDismiss}>
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default Welcome;
