import { useState, useCallback, useMemo } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, keccak256, toBytes, decodeEventLog } from 'viem';
import { toast } from 'sonner';
import { writeContract, waitForTransactionReceipt, simulateContract, readContract } from 'wagmi/actions';
import { config } from '@/providers/DynamicProvider';
import LinkTransferABI from '@/contracts/LinkTransfer.json';
import contractConfig from '@/contracts/contract-config.json';
import { useTokenUtils } from './useTokenUtils';
import { useTransactionState } from './useTransactionState';
import { useErrorHandler } from './useErrorHandler';
import { useClaimCodeUtils } from './useClaimCodeUtils';
import { useCommonLoading } from './use-unified-loading';

// Token types
export type TokenType = 'USDC' | 'USDT';

// Transfer status enum
export enum TransferStatus {
  Pending = 0,
  Claimed = 1,
  Refunded = 2
}

// Transfer interface
export interface LinkTransfer {
  id: string;
  sender: string;
  tokenAddress: string;
  tokenSymbol: string;
  amount: string;
  expiry: number;
  status: TransferStatus;
  hasPassword: boolean;
  createdAt: number;
}

/**
 * Hook for LinkTransfer contract interactions
 * Replaces the deprecated ProtectedTransferV2 functionality
 */
export function useLinkTransfer() {
  // Use utility hooks
  const {
    getTokenAddress,
    parseTokenAmount,
    formatTokenAmount,
    getTokenABI,
    USDC_ADDRESS,
    USDT_ADDRESS
  } = useTokenUtils();

  const {
    isLoading,
    setIsLoading,
    isConfirmed,
    isPending,
    isConfirming,
    setCurrentId: setCurrentTransferId
  } = useTransactionState();

  const { handleError } = useErrorHandler();
  const { generateClaimCode, hashClaimCode } = useClaimCodeUtils();

  // Use unified loading system for better UX
  const loadingSystem = useCommonLoading();

  // Get contract configuration
  const linkTransferConfig = contractConfig.LinkTransfer;
  const LINK_TRANSFER_ADDRESS = linkTransferConfig.address as `0x${string}`;

  // Account information
  const { address: account } = useAccount();

  // Contract write hooks
  const { writeContract: writeContractHook, isPending: isWritePending, data: hash } = useWriteContract();
  const { isLoading: isWaitingForReceipt, isSuccess: isReceiptConfirmed } = useWaitForTransactionReceipt({ hash });

  // Get expiry timestamp (24 hours from now)
  const getExpiryTimestamp = useCallback((): number => {
    return Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours
  }, []);

  // Validate contract parameters
  const verifyContractParameters = (functionName: string, args: any[], expectedTypes: string[]): boolean => {
    if (args.length !== expectedTypes.length) {
      console.error(`Parameter count mismatch for ${functionName}: expected ${expectedTypes.length}, got ${args.length}`);
      return false;
    }

    for (let i = 0; i < args.length; i++) {
      const param = args[i];
      const expectedType = expectedTypes[i];

      // Check for address
      if (expectedType === 'address' && typeof param === 'string') {
        if (!param.startsWith('0x') || param.length !== 42) {
          console.error(`Invalid address format for parameter ${i}: ${param}`);
          return false;
        }
      }

      // Check for uint128/uint256
      if ((expectedType === 'uint128' || expectedType === 'uint256') && typeof param === 'bigint') {
        if (param <= 0n) {
          console.error(`Invalid amount for parameter ${i}: ${param}`);
          return false;
        }
      }

      // Check for uint64
      if (expectedType === 'uint64' && typeof param === 'bigint') {
        if (param <= 0n) {
          console.error(`Invalid timestamp for parameter ${i}: ${param}`);
          return false;
        }
      }

      // Check for bool
      if (expectedType === 'bool' && typeof param !== 'boolean') {
        console.error(`Invalid boolean for parameter ${i}: ${param}`);
        return false;
      }

      // Check for bytes32
      if (expectedType === 'bytes32' && typeof param === 'string') {
        if (!param.startsWith('0x') || param.length !== 66) {
          console.error(`Invalid bytes32 format for parameter ${i}: ${param}`);
          return false;
        }
      }
    }

    console.log(`All parameters for ${functionName} verified successfully`);
    return true;
  };

  // Create a link transfer
  const createLinkTransfer = async (
    tokenType: TokenType,
    amount: string,
    expiryTimestamp: number,
    withPassword: boolean = false,
    customPassword: string | null = null,
  ) => {
    try {
      setIsLoading(true);

      if (!account) {
        throw new Error('No wallet connected');
      }

      // For password-protected transfers, ensure we use the custom password if provided
      let claimCode = '';
      let claimCodeHash = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

      if (withPassword) {
        // If custom password is provided, use it, otherwise generate a random one
        claimCode = customPassword ? customPassword.trim() : generateClaimCode();

        // Log for debugging
        console.log('Using claim code for protected transfer:', claimCode);
        console.log('Claim code length:', claimCode.length);

        if (!claimCode || claimCode.length === 0) {
          throw new Error('Claim code cannot be empty for password-protected transfers');
        }

        // Hash the claim code
        claimCodeHash = hashClaimCode(claimCode);
        console.log('Generated claim code hash:', claimCodeHash);
      }

      // Get token address and parse amount
      const tokenAddress = getTokenAddress(tokenType);
      const parsedAmount = parseTokenAmount(amount, tokenType);

      // Validate expiry timestamp
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const validExpiryTimestamp = expiryTimestamp || getExpiryTimestamp();

      if (validExpiryTimestamp <= currentTimestamp) {
        throw new Error('Expiry timestamp must be in the future');
      }

      console.log('Creating link transfer with parameters:', {
        tokenAddress,
        amount: parsedAmount.toString(),
        expiry: validExpiryTimestamp,
        hasPassword: withPassword,
        claimCodeHash
      });

      // Verify parameters match contract expectations
      const args = [
        tokenAddress,
        parsedAmount,
        BigInt(validExpiryTimestamp),
        withPassword,
        claimCodeHash
      ];

      const expectedTypes = [
        'address',
        'uint128',
        'uint64',
        'bool',
        'bytes32'
      ];

      if (!verifyContractParameters('createLinkTransfer', args, expectedTypes)) {
        throw new Error('Contract parameter validation failed. Check console for details.');
      }

      // Simulate the transaction first
      const { request } = await simulateContract(config, {
        abi: LinkTransferABI,
        address: LINK_TRANSFER_ADDRESS,
        functionName: 'createLinkTransfer',
        args: args,
        account: account,
      });

      console.log('Simulation successful, executing transaction...');

      // Execute the transaction
      const txHash = await writeContract(config, request);
      console.log('Transaction submitted:', txHash);

      // Wait for confirmation
      const receipt = await waitForTransactionReceipt(config, {
        hash: txHash,
        confirmations: 1,
      });

      console.log('Transaction confirmed:', receipt);

      // Extract transfer ID from logs
      let transferId: `0x${string}` | null = null;

      if (receipt.logs && receipt.logs.length > 0) {
        try {
          // Look for TransferCreated event
          for (const log of receipt.logs) {
            if (log.address.toLowerCase() === LINK_TRANSFER_ADDRESS.toLowerCase()) {
              try {
                const decodedLog = decodeEventLog({
                  abi: LinkTransferABI,
                  data: log.data,
                  topics: log.topics,
                });

                if (decodedLog.eventName === 'TransferCreated') {
                  transferId = decodedLog.args.transferId as `0x${string}`;
                  console.log('Found TransferCreated event with ID:', transferId);
                  break;
                }
              } catch (decodeError) {
                console.warn('Failed to decode log:', decodeError);
              }
            }
          }

          // If we still don't have a transfer ID, try a different approach
          if (!transferId && receipt.logs.length > 0) {
            // Try to find any log from our contract
            const contractLogs = receipt.logs.filter(
              (log: { address: string; topics: string[] }) =>
                log.address.toLowerCase() === LINK_TRANSFER_ADDRESS.toLowerCase()
            );

            if (contractLogs.length > 0 && contractLogs[0].topics.length > 1) {
              transferId = contractLogs[0].topics[1] as `0x${string}`;
              console.log('Using first topic as transfer ID:', transferId);
            }
          }
        } catch (logError) {
          console.warn('Error processing transaction logs:', logError);
        }
      }

      // Set the current transfer ID
      if (transferId) {
        setCurrentTransferId(transferId);
      }

      // Return claim code and transfer ID
      return {
        claimCode: withPassword ? claimCode : '',
        transferId: transferId || null,
        withPassword
      };

    } catch (error) {
      console.error('Error creating link transfer:', error);
      handleError(error, 'Failed to create link transfer');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Create a direct transfer (non-link)
  const createDirectTransfer = async (
    tokenType: TokenType,
    amount: string,
    recipient: string
  ) => {
    try {
      setIsLoading(true);

      if (!account) {
        throw new Error('No wallet connected');
      }

      // Get token address and ABI
      const tokenAddress = getTokenAddress(tokenType);
      const tokenABI = getTokenABI(tokenType);

      // Parse amount with correct decimals
      const parsedAmount = parseTokenAmount(amount, tokenType);

      console.log('Creating direct transfer:', {
        tokenAddress,
        recipient,
        amount: parsedAmount.toString()
      });

      // Execute direct ERC20 transfer
      const txHash = await writeContract(config, {
        abi: tokenABI,
        functionName: 'transfer',
        args: [recipient as `0x${string}`, parsedAmount],
        address: tokenAddress,
        account: account,
      });

      console.log('Direct transfer transaction submitted:', txHash);

      // Wait for confirmation
      const receipt = await waitForTransactionReceipt(config, {
        hash: txHash,
        confirmations: 1,
      });

      console.log('Direct transfer confirmed:', receipt);

      return {
        txHash,
        receipt
      };

    } catch (error) {
      console.error('Error creating direct transfer:', error);
      handleError(error, 'Failed to create direct transfer');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Claim a link transfer
  const claimTransfer = async (
    transferId: string,
    claimCode: string = ''
  ) => {
    try {
      setIsLoading(true);

      if (!account) {
        throw new Error('No wallet connected');
      }

      console.log('Claiming transfer:', { transferId, claimCode });

      // Simulate the transaction first
      const { request } = await simulateContract(config, {
        abi: LinkTransferABI,
        address: LINK_TRANSFER_ADDRESS,
        functionName: 'claimTransfer',
        args: [transferId as `0x${string}`, claimCode],
        account: account,
      });

      console.log('Claim simulation successful, executing transaction...');

      // Execute the transaction
      const txHash = await writeContract(config, request);
      console.log('Claim transaction submitted:', txHash);

      // Wait for confirmation
      const receipt = await waitForTransactionReceipt(config, {
        hash: txHash,
        confirmations: 1,
      });

      console.log('Claim transaction confirmed:', receipt);

      return {
        txHash,
        receipt
      };

    } catch (error) {
      console.error('Error claiming transfer:', error);
      handleError(error, 'Failed to claim transfer');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Refund a link transfer
  const refundTransfer = async (transferId: string) => {
    try {
      setIsLoading(true);

      if (!account) {
        throw new Error('No wallet connected');
      }

      console.log('Refunding transfer:', transferId);

      // Simulate the transaction first
      const { request } = await simulateContract(config, {
        abi: LinkTransferABI,
        address: LINK_TRANSFER_ADDRESS,
        functionName: 'refundTransfer',
        args: [transferId as `0x${string}`],
        account: account,
      });

      console.log('Refund simulation successful, executing transaction...');

      // Execute the transaction
      const txHash = await writeContract(config, request);
      console.log('Refund transaction submitted:', txHash);

      // Wait for confirmation
      const receipt = await waitForTransactionReceipt(config, {
        hash: txHash,
        confirmations: 1,
      });

      console.log('Refund transaction confirmed:', receipt);

      return {
        txHash,
        receipt
      };

    } catch (error) {
      console.error('Error refunding transfer:', error);
      handleError(error, 'Failed to refund transfer');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Instant refund a link transfer (any pending transfer, regardless of expiry)
  const instantRefund = async (transferId: string) => {
    try {
      setIsLoading(true);

      if (!account) {
        throw new Error('No wallet connected');
      }

      console.log('Instant refunding transfer:', transferId);

      // For LinkTransferOptimized, we only have refundTransfer which requires expiry
      // So we'll use the same function but provide better error handling
      const { request } = await simulateContract(config, {
        abi: LinkTransferABI,
        address: LINK_TRANSFER_ADDRESS,
        functionName: 'refundTransfer',
        args: [transferId as `0x${string}`],
        account: account,
      });

      console.log('Instant refund simulation successful, executing transaction...');

      // Execute the transaction
      const txHash = await writeContract(config, request);
      console.log('Instant refund transaction submitted:', txHash);

      // Wait for confirmation
      const receipt = await waitForTransactionReceipt(config, {
        hash: txHash,
        confirmations: 1,
      });

      console.log('Instant refund transaction confirmed:', receipt);

      return {
        txHash,
        receipt
      };

    } catch (error) {
      console.error('Error instant refunding transfer:', error);

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('TransferNotExpired')) {
          throw new Error('Transfer has not expired yet. You can only refund expired transfers.');
        } else if (error.message.includes('TransferNotRefundable')) {
          throw new Error('Transfer cannot be refunded. It may have already been claimed or refunded.');
        } else if (error.message.includes('NotSender')) {
          throw new Error('Only the sender can refund this transfer.');
        }
      }

      handleError(error, 'Failed to refund transfer');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Get transfers by sender (for transfer management)
  const getTransfersBySender = async (senderAddress: string): Promise<string[]> => {
    try {
      const result = await readContract(config, {
        abi: LinkTransferABI,
        address: LINK_TRANSFER_ADDRESS,
        functionName: 'getTransfersBySender',
        args: [senderAddress as `0x${string}`],
      });
      return result as string[];
    } catch (error) {
      console.error('Error getting transfers by sender:', error);
      return [];
    }
  };

  // Check if transfer is expired
  const isTransferExpired = (expiry: number): boolean => {
    return Date.now() / 1000 > expiry;
  };

  // Check if transfer is password protected
  const isPasswordProtected = async (transferId: string): Promise<number> => {
    try {
      const result = await readContract(config, {
        abi: LinkTransferABI,
        address: LINK_TRANSFER_ADDRESS,
        functionName: 'isPasswordProtected',
        args: [transferId as `0x${string}`],
      });
      return result as number;
    } catch (error) {
      console.error('Error checking password protection:', error);
      return 0;
    }
  };

  // Check if transfer is claimable
  const isTransferClaimable = async (transferId: string): Promise<boolean> => {
    try {
      const result = await readContract(config, {
        abi: LinkTransferABI,
        address: LINK_TRANSFER_ADDRESS,
        functionName: 'isTransferClaimable',
        args: [transferId as `0x${string}`],
      });
      return result as boolean;
    } catch (error) {
      console.error('Error checking if transfer is claimable:', error);
      return false;
    }
  };

  // Get transfer details
  const getTransferDetails = async (transferId: string): Promise<LinkTransfer | null> => {
    try {
      const result = await readContract(config, {
        abi: LinkTransferABI,
        address: LINK_TRANSFER_ADDRESS,
        functionName: 'getTransfer',
        args: [transferId as `0x${string}`],
      });

      const [sender, tokenAddress, amount, expiry, status, hasPassword] = result as [string, string, bigint, bigint, number, boolean];

      // Determine token symbol from address
      let tokenSymbol = 'UNKNOWN';
      if (tokenAddress.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
        tokenSymbol = 'USDC';
      } else if (tokenAddress.toLowerCase() === USDT_ADDRESS.toLowerCase()) {
        tokenSymbol = 'USDT';
      }

      return {
        id: transferId,
        sender,
        tokenAddress,
        tokenSymbol,
        amount: formatTokenAmount(amount, tokenSymbol as TokenType),
        expiry: Number(expiry),
        status: status as TransferStatus,
        hasPassword,
        createdAt: Date.now(), // This would need to be retrieved from events in a real implementation
      };
    } catch (error) {
      console.error('Error getting transfer details:', error);
      return null;
    }
  };

  // Check allowance for a token
  const checkAllowance = async (tokenType: TokenType, amount: string): Promise<boolean> => {
    try {
      if (!account) {
        return false;
      }

      const tokenAddress = getTokenAddress(tokenType);
      const tokenABI = getTokenABI(tokenType);
      const parsedAmount = parseTokenAmount(amount, tokenType);

      const allowance = await readContract(config, {
        abi: tokenABI,
        address: tokenAddress,
        functionName: 'allowance',
        args: [account, LINK_TRANSFER_ADDRESS],
      });

      return (allowance as bigint) >= parsedAmount;
    } catch (error) {
      console.error('Error checking allowance:', error);
      return false;
    }
  };

  // Return all the functions and values
  return {
    isLoading: isLoading || isWritePending || isWaitingForReceipt,
    isConfirmed: isReceiptConfirmed,
    createDirectTransfer,
    createLinkTransfer,
    claimTransfer,
    refundTransfer,
    instantRefund,
    isPasswordProtected,
    isTransferClaimable,
    getTransferDetails,
    getTransfersBySender,
    isTransferExpired,
    generateClaimCode,
    hashClaimCode,
    checkAllowance,
    USDC_ADDRESS,
    USDT_ADDRESS,
    LINK_TRANSFER_ADDRESS,
  };
}
