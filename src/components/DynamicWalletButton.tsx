import React from 'react';
import { Button } from '@/components/ui/button';
import { useDynamicWallet } from '@/hooks/use-dynamic-wallet';
import { Loader2, Wallet } from 'lucide-react';

interface DynamicWalletButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

const DynamicWalletButton: React.FC<DynamicWalletButtonProps> = ({
  variant = 'default',
  size = 'default',
  className = '',
  children,
}) => {
  const {
    isLoggedIn,
    isLoading,
    disconnectWallet,
    connectWallet,
    address,
    sdkHasLoaded,
  } = useDynamicWallet();

  const [isActionLoading, setIsActionLoading] = React.useState(false);

  // Format the address for display
  const displayAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';

  // Handle connection/disconnection
  const handleClick = async () => {
    setIsActionLoading(true);
    try {
      if (isLoggedIn) {
        await disconnectWallet();
      } else {
        await connectWallet();
      }
    } catch (error) {
      console.error("Wallet operation error:", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Show loading state if SDK is not loaded or action is in progress
  if (!sdkHasLoaded || isLoading || isActionLoading) {
    return (
      <Button
        variant="outline"
        size={size}
        className={className}
        disabled
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {!sdkHasLoaded ? 'Loading SDK...' : isLoading ? 'Connecting...' : 'Loading...'}
      </Button>
    );
  }

  return (
    <Button
      variant={isLoggedIn ? 'outline' : variant}
      size={size}
      className={className}
      onClick={handleClick}
    >
      {isLoggedIn ? (
        displayAddress
      ) : (
        <>
          {children || (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </>
          )}
        </>
      )}
    </Button>
  );
};

export default DynamicWalletButton;
