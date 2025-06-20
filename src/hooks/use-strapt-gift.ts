import { useState, useCallback } from 'react';
import { parseUnits, decodeEventLog } from 'viem';
import { toast } from 'sonner';
import { readContract, simulateContract, writeContract, waitForTransactionReceipt, getAccount } from 'wagmi/actions';
import { config } from '@/providers/DynamicProvider';
import StraptGiftABI from '@/contracts/StraptDrop.json';
import contractConfig from '@/contracts/contract-config.json';
import USDCABI from '@/contracts/MockUSDC.json';
import USDTABI from '@/contracts/MockUSDT.json';
import { useDynamicWallet } from './use-dynamic-wallet';
import { useTokenBalances } from './use-token-balances';

// Contract addresses from config
const STRAPT_GIFT_ADDRESS = contractConfig.StraptGift.address as `0x${string}`;
const USDC_ADDRESS = contractConfig.StraptGift.supportedTokens.USDC as `0x${string}`;
const USDT_ADDRESS = contractConfig.StraptGift.supportedTokens.USDT as `0x${string}`;

// Token types
export type TokenType = 'USDC' | 'USDT';

// Gift info type
export interface GiftInfo {
  creator: `0x${string}`;
  tokenAddress: `0x${string}`;
  totalAmount: bigint;
  remainingAmount: bigint;
  claimedCount: bigint;
  totalRecipients: bigint;
  amountPerRecipient: bigint;
  isRandom: boolean;
  expiryTime: bigint;
  message: string;
  isActive: boolean;
}

// Keep DropInfo as alias for backward compatibility
export type DropInfo = GiftInfo;

// Define interfaces for event args
interface EventArgs {
  [key: string]: unknown;
}

interface GiftCreatedArgs extends EventArgs {
  dropId: `0x${string}`;
  creator: `0x${string}`;
  tokenAddress: `0x${string}`;
  totalAmount: bigint;
  totalRecipients: bigint;
  isRandom: boolean;
  message: string;
}

interface GiftClaimedArgs extends EventArgs {
  dropId: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
}

export function useStraptGift() {
  const { isLoggedIn, address } = useDynamicWallet();
  const { tokens } = useTokenBalances();

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [isLoadingUserGifts, setIsLoadingUserGifts] = useState(false);

  // Current gift ID for tracking
  const [currentGiftId, setCurrentGiftId] = useState<string>('');

  // Helper function to get token address from token type
  const getTokenAddress = useCallback((tokenType: TokenType): `0x${string}` => {
    switch (tokenType) {
      case 'USDC':
        return USDC_ADDRESS;
      case 'USDT':
        return USDT_ADDRESS;
      default:
        throw new Error(`Unsupported token type: ${tokenType}`);
    }
  }, []);

  // Helper function to get token decimals
  const getTokenDecimals = useCallback((tokenType: TokenType): number => {
    switch (tokenType) {
      case 'USDC':
      case 'USDT':
        return 6;
      default:
        return 18;
    }
  }, []);

  // Create a new STRAPT Gift
  const createGift = async (
    tokenType: TokenType,
    amount: string,
    recipients: number,
    isRandom: boolean,
    expiryHours: number,
    message: string
  ) => {
    try {
      setIsLoading(true);

      if (!isLoggedIn || !address) {
        console.error("No wallet connected");
        toast.error("Please connect your wallet");
        throw new Error("No wallet connected");
      }

      const tokenAddress = getTokenAddress(tokenType);
      const tokenDecimals = getTokenDecimals(tokenType);

      // Convert amount to token units
      const amountInUnits = parseUnits(amount, tokenDecimals);

      // Calculate expiry time (current time + hours)
      const expiryTime = BigInt(Math.floor(Date.now() / 1000) + (expiryHours * 3600));

      // First approve the token transfer
      const tokenABI = tokenType === 'USDT' ? USDTABI.abi : USDCABI.abi;

      // Check allowance
      console.log('Checking allowance...');
      const allowance = await readContract(config, {
        address: tokenAddress,
        abi: tokenABI,
        functionName: 'allowance',
        args: [address, STRAPT_GIFT_ADDRESS],
      }) as bigint;

      console.log('Current allowance:', allowance.toString());
      console.log('Required amount:', amountInUnits.toString());

      // Approve if needed
      if (allowance < amountInUnits) {
        setIsApproving(true);
        toast.info('Approving token transfer...');

        const account = getAccount(config);
        if (!account || !account.address) {
          throw new Error("No wallet connected");
        }

        // Simulate the approval transaction
        const { request: approveRequest } = await simulateContract(config, {
          address: tokenAddress,
          abi: tokenABI,
          functionName: 'approve',
          args: [STRAPT_GIFT_ADDRESS, amountInUnits],
          account: account.address,
        });

        // Send the approval transaction
        console.log('Sending approval transaction...');
        const approveHash = await writeContract(config, approveRequest);
        console.log('Approval transaction sent with hash:', approveHash);

        // Wait for approval transaction to be confirmed
        console.log('Waiting for approval transaction to be confirmed...');
        const approveReceipt = await waitForTransactionReceipt(config, { hash: approveHash });
        console.log('Approval transaction confirmed:', approveReceipt);

        toast.success(`Approved ${tokenType} for transfer`);
        setIsApproving(false);
      }

      // Now create the gift
      setIsCreating(true);
      toast.info('Creating STRAPT Gift...');

      const account = getAccount(config);
      if (!account || !account.address) {
        throw new Error("No wallet connected");
      }

      // Simulate the create gift transaction
      const { request: createRequest } = await simulateContract(config, {
        address: STRAPT_GIFT_ADDRESS,
        abi: StraptGiftABI,
        functionName: 'createDrop',
        args: [tokenAddress, amountInUnits, BigInt(recipients), isRandom, expiryTime, message],
        account: account.address,
      });

      // Send the create gift transaction
      console.log('Sending create gift transaction...');
      const createHash = await writeContract(config, createRequest);
      console.log('Create gift transaction sent with hash:', createHash);

      // Wait for create gift transaction to be confirmed
      console.log('Waiting for create gift transaction to be confirmed...');
      const createReceipt = await waitForTransactionReceipt(config, { hash: createHash });
      console.log('Create gift transaction confirmed:', createReceipt);

      // Find the DropCreated event to get the drop ID
      let dropId: `0x${string}` | null = null;

      const logs = createReceipt.logs || [];
      console.log('Parsing transaction logs for DropCreated event...');
      console.log('Total logs found:', logs.length);

      for (const log of logs) {
        try {
          const event = decodeEventLog({
            abi: StraptGiftABI,
            data: log.data,
            topics: log.topics,
          });

          console.log('Decoded event:', event.eventName, event.args);

          if (event.eventName === 'DropCreated') {
            const args = event.args as unknown as GiftCreatedArgs;
            dropId = args.dropId;
            console.log('Found DropCreated event with dropId:', dropId);
            break;
          }
        } catch (e) {
          // Skip logs that can't be decoded
          console.log('Could not decode log:', e);
        }
      }

      if (!dropId) {
        console.error('Could not find DropCreated event in transaction logs');
        console.error('Available logs:', logs.map(log => ({ address: log.address, topics: log.topics })));
        throw new Error('Failed to extract drop ID from transaction. The gift may not have been created successfully.');
      }

      setCurrentGiftId(dropId);
      toast.success('STRAPT Gift created successfully!');

      return { giftId: dropId, transactionHash: createHash };
    } catch (error) {
      console.error('Error creating gift:', error);
      toast.error('Failed to create STRAPT Gift');
      throw error;
    } finally {
      setIsLoading(false);
      setIsApproving(false);
      setIsCreating(false);
    }
  };

  // Claim tokens from a STRAPT Gift
  const claimGift = async (dropId: string) => {
    try {
      setIsLoading(true);
      setIsClaiming(true);

      // Validate drop ID format
      if (!dropId || !dropId.startsWith('0x') || dropId.length !== 66) {
        throw new Error(`Invalid drop ID format: ${dropId}. Expected a 66-character hex string starting with 0x.`);
      }

      if (!isLoggedIn || !address) {
        console.error("No wallet connected");
        toast.error("Please connect your wallet");
        throw new Error("No wallet connected");
      }

      toast.info('Claiming tokens from STRAPT Gift...');

      const account = getAccount(config);
      if (!account || !account.address) {
        throw new Error("No wallet connected");
      }

      // Simulate the claim transaction
      const { request: claimRequest } = await simulateContract(config, {
        address: STRAPT_GIFT_ADDRESS,
        abi: StraptGiftABI,
        functionName: 'claimDrop',
        args: [dropId as `0x${string}`],
        account: account.address,
      });

      // Send the claim transaction
      console.log('Sending claim transaction...');
      const claimHash = await writeContract(config, claimRequest);
      console.log('Claim transaction sent with hash:', claimHash);

      // Wait for claim transaction to be confirmed
      console.log('Waiting for claim transaction to be confirmed...');
      const claimReceipt = await waitForTransactionReceipt(config, { hash: claimHash });
      console.log('Claim transaction confirmed:', claimReceipt);

      // Find the DropClaimed event to get the claimed amount
      let claimedAmount: bigint = BigInt(0);

      console.log('Parsing claim transaction logs for DropClaimed event...');
      for (const log of claimReceipt.logs) {
        try {
          const event = decodeEventLog({
            abi: StraptGiftABI,
            data: log.data,
            topics: log.topics,
          });

          console.log('Decoded claim event:', event.eventName, event.args);

          if (event.eventName === 'DropClaimed') {
            const args = event.args as unknown as GiftClaimedArgs;
            claimedAmount = args.amount;
            console.log('Found DropClaimed event with amount:', claimedAmount.toString());
            break;
          }
        } catch (e) {
          // Skip logs that can't be decoded
          console.log('Could not decode claim log:', e);
        }
      }

      toast.success('Successfully claimed tokens from STRAPT Gift!', {
        description: `Transaction: ${claimHash}`,
      });

      return claimedAmount;
    } catch (error) {
      console.error('Error claiming gift:', error);

      // Handle specific error messages
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('DropNotFound()')) {
        toast.error('Gift not found. This gift may have been created on a previous version of the contract.');
      } else if (errorMessage.includes('DropNotActive()')) {
        toast.error('This gift is no longer active.');
      } else if (errorMessage.includes('DropExpired()')) {
        toast.error('This gift has expired.');
      } else if (errorMessage.includes('AlreadyClaimed()')) {
        toast.error('You have already claimed from this gift.');
      } else if (errorMessage.includes('AllClaimsTaken()')) {
        toast.error('All claims from this gift have been taken.');
      } else if (errorMessage.includes('Failed to fetch dynamically imported module')) {
        toast.error('Development server error. Please restart the server and try again.');
      } else {
        toast.error('Failed to claim STRAPT Gift');
      }
      throw error;
    } finally {
      setIsLoading(false);
      setIsClaiming(false);
    }
  };

  // Get gift information
  const getGiftInfo = async (dropId: string): Promise<GiftInfo | null> => {
    try {
      if (!dropId || !dropId.startsWith('0x') || dropId.length !== 66) {
        throw new Error(`Invalid drop ID format: ${dropId}`);
      }

      console.log('Getting gift info for dropId:', dropId);
      console.log('Contract address:', STRAPT_GIFT_ADDRESS);
      console.log('ABI type:', typeof StraptGiftABI, Array.isArray(StraptGiftABI));

      // First, let's try to check if the contract exists by calling a simple function
      try {
        // Try to call a simple view function first to test connectivity
        const feePercentage = await readContract(config, {
          address: STRAPT_GIFT_ADDRESS,
          abi: StraptGiftABI,
          functionName: 'feePercentage',
          args: [],
        });
        console.log('Contract connectivity test successful, fee percentage:', feePercentage);
      } catch (connectivityError) {
        console.error('Contract connectivity test failed:', connectivityError);
        throw new Error('Contract not found or not accessible at the specified address');
      }

      const result = await readContract(config, {
        address: STRAPT_GIFT_ADDRESS,
        abi: StraptGiftABI,
        functionName: 'getDropInfo',
        args: [dropId as `0x${string}`],
      });

      console.log('Contract call result:', result);

      const [creator, tokenAddress, totalAmount, remainingAmount, claimedCount, totalRecipients, isRandom, expiryTime, message, isActive] = result as [
        `0x${string}`,
        `0x${string}`,
        bigint,
        bigint,
        bigint,
        bigint,
        boolean,
        bigint,
        string,
        boolean
      ];

      // Calculate amount per recipient for non-random gifts
      const amountPerRecipient = isRandom ? BigInt(0) : totalAmount / totalRecipients;

      return {
        creator,
        tokenAddress,
        totalAmount,
        remainingAmount,
        claimedCount,
        totalRecipients,
        amountPerRecipient,
        isRandom,
        expiryTime,
        message,
        isActive,
      };
    } catch (error) {
      console.error('Error getting gift info:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        cause: error instanceof Error ? error.cause : undefined,
        stack: error instanceof Error ? error.stack : undefined
      });

      // Handle specific contract errors
      if (error instanceof Error) {
        const errorMessage = error.message;

        // Check for DropNotFound error
        if (errorMessage.includes('DropNotFound()')) {
          console.error('Gift not found in contract. This could be because:');
          console.error('1. The gift ID is invalid or malformed');
          console.error('2. The gift was created on a different contract');
          console.error('3. The gift has been deleted or never existed');
          throw new Error('Gift not found. This gift may have been created on a previous version of the contract or the ID is invalid.');
        }

        // Check for module loading error
        if (errorMessage.includes('Failed to fetch dynamically imported module')) {
          console.error('This appears to be a Vite development server issue. Try:');
          console.error('1. Restart the development server');
          console.error('2. Clear the browser cache');
          console.error('3. Delete node_modules/.vite and restart');
          throw new Error('Development server module loading error. Please restart the server.');
        }

        // Check for network/connectivity issues
        if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        }
      }

      return null;
    }
  };

  // Check if an address has already claimed from a gift
  const hasAddressClaimed = async (dropId: string, userAddress?: string): Promise<boolean> => {
    try {
      if (!dropId || !dropId.startsWith('0x') || dropId.length !== 66) {
        return false;
      }

      const addressToCheck = userAddress || address;
      if (!addressToCheck) {
        return false;
      }

      const hasClaimed = await readContract(config, {
        address: STRAPT_GIFT_ADDRESS,
        abi: StraptGiftABI,
        functionName: 'hasAddressClaimed',
        args: [dropId as `0x${string}`, addressToCheck as `0x${string}`],
      }) as boolean;

      return hasClaimed;
    } catch (error) {
      console.error('Error checking if address has claimed:', error);
      return false;
    }
  };

  // Refund an expired gift
  const refundExpiredGift = async (dropId: string) => {
    try {
      setIsLoading(true);
      setIsRefunding(true);

      if (!dropId || !dropId.startsWith('0x') || dropId.length !== 66) {
        throw new Error(`Invalid drop ID format: ${dropId}`);
      }

      if (!isLoggedIn || !address) {
        console.error("No wallet connected");
        toast.error("Please connect your wallet");
        throw new Error("No wallet connected");
      }

      toast.info('Refunding expired STRAPT Gift...');

      const account = getAccount(config);
      if (!account || !account.address) {
        throw new Error("No wallet connected");
      }

      // Simulate the refund transaction
      const { request: refundRequest } = await simulateContract(config, {
        address: STRAPT_GIFT_ADDRESS,
        abi: StraptGiftABI,
        functionName: 'refundExpiredDrop',
        args: [dropId as `0x${string}`],
        account: account.address,
      });

      // Send the refund transaction
      console.log('Sending refund transaction...');
      const refundHash = await writeContract(config, refundRequest);
      console.log('Refund transaction sent with hash:', refundHash);

      // Wait for refund transaction to be confirmed
      console.log('Waiting for refund transaction to be confirmed...');
      const refundReceipt = await waitForTransactionReceipt(config, { hash: refundHash });
      console.log('Refund transaction confirmed:', refundReceipt);

      toast.success('Successfully refunded expired STRAPT Gift');
      return refundReceipt;
    } catch (error) {
      console.error('Error refunding gift:', error);
      toast.error('Failed to refund STRAPT Gift');
      throw error;
    } finally {
      setIsLoading(false);
      setIsRefunding(false);
    }
  };

  // Get user created gifts (mock implementation for now)
  const getUserCreatedGifts = async () => {
    try {
      setIsLoadingUserGifts(true);
      // This would need to be implemented based on events or a mapping in the contract
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error getting user created gifts:', error);
      return [];
    } finally {
      setIsLoadingUserGifts(false);
    }
  };

  return {
    createGift,
    claimGift,
    getGiftInfo,
    hasAddressClaimed,
    refundExpiredGift,
    getUserCreatedGifts,
    currentGiftId,
    isLoading,
    isApproving,
    isCreating,
    isClaiming,
    isRefunding,
    isLoadingUserGifts,
    tokens,
    // Backward compatibility aliases
    createDrop: createGift,
    claimDrop: claimGift,
    getDropInfo: getGiftInfo,
    refundExpiredDrop: refundExpiredGift,
    getUserCreatedDrops: getUserCreatedGifts,
    currentDropId: currentGiftId,
  };
}

// Keep the old export for backward compatibility
export const useStraptDrop = useStraptGift;
