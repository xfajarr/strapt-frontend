import { useCallback } from 'react';
import { keccak256, toBytes, encodePacked } from 'viem';

/**
 * Hook for claim code utilities
 * Provides functions for generating and hashing claim codes
 */
export function useClaimCodeUtils() {
  /**
   * Generate a random claim code
   * @param length Length of the claim code (default: 6)
   * @returns Random claim code string
   */
  const generateClaimCode = useCallback((length: number = 6) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }, []);

  /**
   * Hash a claim code for on-chain storage
   * @param claimCode The claim code to hash
   * @returns Hashed claim code as bytes32
   */
  const hashClaimCode = useCallback((claimCode: string): `0x${string}` => {
    // Trim whitespace but keep original case to match contract behavior
    const normalizedCode = claimCode.trim();

    // Hash the claim code using keccak256 with abi.encodePacked equivalent
    // This matches the contract's: keccak256(abi.encodePacked(claimCode))
    // Use encodePacked to match Solidity's abi.encodePacked behavior
    return keccak256(encodePacked(['string'], [normalizedCode]));
  }, []);

  /**
   * Generate a transfer link with the given parameters
   * @param transferId The transfer ID
   * @param claimCode Optional claim code
   * @param baseUrl Base URL (defaults to current origin)
   * @returns Full transfer link URL
   */
  const generateTransferLink = useCallback((
    transferId: string,
    claimCode?: string,
    baseUrl?: string
  ): string => {
    const url = baseUrl || window.location.origin;

    if (claimCode) {
      return `${url}/app/claims?id=${transferId}&code=${claimCode}`;
    }

    return `${url}/app/claims?id=${transferId}`;
  }, []);

  /**
   * Generate a QR code data URL for a transfer
   * @param transferId The transfer ID
   * @param claimCode Optional claim code
   * @returns Data for QR code generation
   */
  const generateQRCodeData = useCallback((
    transferId: string,
    claimCode?: string
  ): string => {
    const link = generateTransferLink(transferId, claimCode);
    return link;
  }, [generateTransferLink]);

  /**
   * Validate a claim code format
   * @param claimCode The claim code to validate
   * @returns True if valid, false otherwise
   */
  const validateClaimCode = useCallback((claimCode: string): boolean => {
    // Claim code should be alphanumeric, allow both upper and lower case
    const trimmed = claimCode.trim();
    const regex = /^[A-Za-z0-9]+$/;
    return regex.test(trimmed) && trimmed.length >= 3 && trimmed.length <= 20;
  }, []);

  return {
    generateClaimCode,
    hashClaimCode,
    generateTransferLink,
    generateQRCodeData,
    validateClaimCode,
  };
}
