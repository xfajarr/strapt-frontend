import { useDynamicWallet } from '@/hooks/use-dynamic-wallet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { Network, LogOut, Copy, ExternalLink, Wallet, Check, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { useConfig, useChainId, useSwitchChain, useBalance } from 'wagmi';
import { liskSepolia, baseSepolia } from 'viem/chains';
import InfoTooltip from '@/components/InfoTooltip';

const DynamicWalletProfile = () => {
  const { address, disconnectWallet, connectWallet, user, isLoggedIn } = useDynamicWallet();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Use wagmi hooks
  const chainId = useChainId();
  const config = useConfig();
  const { switchChain } = useSwitchChain();

  // Get balance using the account hook
  const { data: balance } = useBalance({
    address: address as `0x${string}`,
  });

  // Get the current chain information
  const currentChain = config.chains.find(c => c.id === chainId);

  // Available networks
  const networks = [
    { ...liskSepolia, name: 'Lisk Sepolia' },
    { ...baseSepolia, name: 'Base Sepolia' },
  ];

  // If not logged in, show connect button
  if (!isLoggedIn || !address) {
    return (
      <div className="relative group">
        <Button onClick={() => connectWallet()} className="gap-2" size="sm">
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </Button>
        <div className="absolute bottom-full right-0 mb-2 w-64 p-2 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50">
          <p className="font-medium mb-1">Connect Your Wallet</p>
          <p>Connect your wallet to access payment streams, transfers, and other features.</p>
        </div>
      </div>
    );
  }

  // Handle network switching
  const handleNetworkSwitch = async (networkId: number) => {
    try {
      setIsLoading(true);
      await switchChain({ chainId: networkId });
      toast.success(`Switched to ${networks.find(n => n.id === networkId)?.name}`);
    } catch (error) {
      console.error('Network switch error:', error);
      toast.error('Failed to switch network');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle address copy
  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await disconnectWallet();
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to disconnect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (user?.email) return user.email;
    if (user?.username) return user.username;
    if (address) return `${address.slice(0, 6)}...${address.slice(-4)}`;
    return 'Unknown User';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.profileImageUrl || ''} alt="Profile" />
            <AvatarFallback>
              {getUserDisplayName().slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {getUserDisplayName()}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {address && `${address.slice(0, 6)}...${address.slice(-4)}`}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Balance Display */}
        <div className="px-2 py-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Balance:</span>
            <span className="text-sm font-medium">
              {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : 'Loading...'}
            </span>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Network Selection */}
        <div className="px-2 py-2">
          <div className="flex items-center gap-2 mb-2">
            <Network className="h-4 w-4" />
            <span className="text-sm font-medium">Network</span>
            <InfoTooltip content="Switch between different blockchain networks" />
          </div>
          <div className="space-y-1">
            {networks.map((network) => (
              <Button
                key={network.id}
                variant={chainId === network.id ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => handleNetworkSwitch(network.id)}
                disabled={isLoading}
              >
                {chainId === network.id && <Check className="mr-2 h-4 w-4" />}
                {network.name}
              </Button>
            ))}
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Actions */}
        <DropdownMenuItem onClick={handleCopyAddress}>
          <Copy className="mr-2 h-4 w-4" />
          <span>Copy Address</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => window.open(`${currentChain?.blockExplorers?.default?.url}/address/${address}`, '_blank')}>
          <ExternalLink className="mr-2 h-4 w-4" />
          <span>View on Explorer</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleLogout} disabled={isLoading}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DynamicWalletProfile;
