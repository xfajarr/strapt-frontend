import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { formatUnits } from 'viem';
import { TokenOption } from '@/components/TokenSelect';
import USDCABI from '@/contracts/MockUSDC.json';
import USDTABI from '@/contracts/MockUSDT.json';

// Constants
const MANTLE_SEPOLIA_CHAIN_ID = 5003;
const USDC_ADDRESS = USDCABI.address as `0x${string}`;
const USDT_ADDRESS = USDTABI.address as `0x${string}`;
const USDC_DECIMALS = 6;
const USDT_DECIMALS = 6;
const REFETCH_INTERVAL = 10000; // Reduced frequency to 10 seconds

// Validate contract addresses
const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

if (!isValidAddress(USDC_ADDRESS) || !isValidAddress(USDT_ADDRESS)) {
  console.error('Invalid contract addresses found in ABI files');
}

export function useTokenBalances() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const isCorrectNetwork = chainId === MANTLE_SEPOLIA_CHAIN_ID;
  const shouldFetchBalances = isConnected && isCorrectNetwork;

  const [tokens, setTokens] = useState<TokenOption[]>([
    { symbol: 'USDT', name: 'Tether USD', balance: 0, icon: '/assets/tether-usdt-seeklogo.svg' },
    { symbol: 'USDC', name: 'USD Coin', balance: 0, icon: '/usd-coin-usdc-logo.svg' },
  ]);
  const [error, setError] = useState<string | null>(null);

  // Debug log for wallet connection
  useEffect(() => {
    console.log('Wallet Status:', {
      isConnected,
      address,
      chainId,
      expectedChainId: MANTLE_SEPOLIA_CHAIN_ID,
      isCorrectNetwork,
      USDC_ADDRESS,
      USDT_ADDRESS
    });
  }, [isConnected, address, chainId, isCorrectNetwork]);

  // Balance query configuration
  const balanceQueryConfig = useMemo(() => ({
    enabled: shouldFetchBalances,
    refetchInterval: REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: 1000,
  }), [shouldFetchBalances]);

  // Get USDC balance
  const {
    data: usdcBalance,
    isLoading: isLoadingUsdc,
    error: usdcError
  } = useBalance({
    address: address,
    token: USDC_ADDRESS,
    query: balanceQueryConfig,
  });

  // Get USDT balance
  const {
    data: usdtBalance,
    isLoading: isLoadingUsdt,
    error: usdtError
  } = useBalance({
    address: address,
    token: USDT_ADDRESS,
    query: balanceQueryConfig,
  });

  const isLoading = isLoadingUsdc || isLoadingUsdt;

  // Handle errors
  useEffect(() => {
    let errorMessage = null;

    if (usdcError) {
      console.error('USDC Balance Error:', usdcError);
      errorMessage = `Failed to fetch USDC balance: ${usdcError.message}`;
    }

    if (usdtError) {
      console.error('USDT Balance Error:', usdtError);
      errorMessage = errorMessage
        ? `${errorMessage}; Failed to fetch USDT balance: ${usdtError.message}`
        : `Failed to fetch USDT balance: ${usdtError.message}`;
    }

    setError(errorMessage);
  }, [usdcError, usdtError]);

  // Format balance helper
  const formatBalance = useCallback((balance: any, decimals: number): number => {
    if (!balance?.value) return 0;
    return Number(formatUnits(balance.value, decimals));
  }, []);

  // Update tokens when balances change
  useEffect(() => {
    if (!isConnected) {
      setTokens([
        { symbol: 'USDT', name: 'Tether USD', balance: 0, icon: '/assets/tether-usdt-seeklogo.svg' },
        { symbol: 'USDC', name: 'USD Coin', balance: 0, icon: '/usd-coin-usdc-logo.svg' },
      ]);
      setError(null);
      return;
    }

    if (!isCorrectNetwork) {
      setError(`Please switch to Mantle Sepolia network (Chain ID: ${MANTLE_SEPOLIA_CHAIN_ID})`);
      return;
    }

    if (!isLoading && (usdcBalance !== undefined || usdtBalance !== undefined)) {
      const usdtFormatted = formatBalance(usdtBalance, USDT_DECIMALS);
      const usdcFormatted = formatBalance(usdcBalance, USDC_DECIMALS);

      console.log('Formatted Balances:', {
        USDT: { raw: usdtBalance?.value?.toString(), formatted: usdtFormatted },
        USDC: { raw: usdcBalance?.value?.toString(), formatted: usdcFormatted }
      });

      setTokens(prevTokens => {
        const newTokens = [
          {
            symbol: 'USDT',
            name: 'Tether USD',
            balance: usdtFormatted,
            icon: '/assets/tether-usdt-seeklogo.svg'
          },
          {
            symbol: 'USDC',
            name: 'USD Coin',
            balance: usdcFormatted,
            icon: '/usd-coin-usdc-logo.svg'
          },
        ];

        // Only update if balances actually changed
        const hasChanged = prevTokens.some((token, index) =>
          token.balance !== newTokens[index].balance
        );

        return hasChanged ? newTokens : prevTokens;
      });
    }
  }, [
    isConnected,
    isCorrectNetwork,
    isLoading,
    usdcBalance,
    usdtBalance,
    formatBalance
  ]);

  return {
    tokens,
    isLoading,
    error,
    isCorrectNetwork,
    usdcBalance,
    usdtBalance,
  };
}