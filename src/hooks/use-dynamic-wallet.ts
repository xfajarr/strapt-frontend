import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDynamicContext, useIsLoggedIn } from '@dynamic-labs/sdk-react-core';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';

export function useDynamicWallet() {
  const {
    primaryWallet,
    user,
    userWithMissingInfo,
    setShowAuthFlow,
    handleLogOut,
    sdkHasLoaded
  } = useDynamicContext();

  // Use the dedicated hook for login status
  const isLoggedIn = useIsLoggedIn();

  const { address } = useAccount();
  const navigate = useNavigate();

  // Use ref to track if navigation has already been attempted
  const hasNavigatedRef = useRef(false);

  // Auto-navigate to app after successful login
  useEffect(() => {
    // Only navigate if SDK has loaded and user is fully logged in
    if (sdkHasLoaded && isLoggedIn && user && primaryWallet && !hasNavigatedRef.current) {
      // Check if we're on the landing page and navigate if needed
      if (window.location.pathname === '/') {
        hasNavigatedRef.current = true;
        // Use a small delay to prevent infinite loops
        const timer = setTimeout(() => {
          navigate('/app');
        }, 100);
        return () => clearTimeout(timer);
      }
    }

    // Reset navigation flag when user logs out
    if (!isLoggedIn) {
      hasNavigatedRef.current = false;
    }
  }, [sdkHasLoaded, isLoggedIn, user, primaryWallet, navigate]);

  // Function to handle wallet connection
  const connectWallet = useCallback(async () => {
    try {
      console.log('connectWallet called, SDK loaded:', sdkHasLoaded);

      if (!sdkHasLoaded) {
        toast.error('Wallet SDK is still loading. Please try again in a moment.');
        return false;
      }

      // Open Dynamic auth flow
      setShowAuthFlow(true);
      return true;
    } catch (error) {
      console.error("Dynamic wallet connection error:", error);
      toast.error('Failed to connect wallet. Please try again.');
      return false;
    }
  }, [setShowAuthFlow, sdkHasLoaded]);

  // Function to disconnect wallet using Dynamic's handleLogOut
  const disconnectWallet = useCallback(async () => {
    try {
      // Use Dynamic's built-in logout function
      await handleLogOut();
      navigate('/');
      toast.success('Successfully disconnected wallet');
      return true;
    } catch (error) {
      console.error("Dynamic wallet disconnection error:", error);
      toast.error('Failed to disconnect wallet. Please try again.');
      return false;
    }
  }, [handleLogOut, navigate]);

  // Get wallet balance
  const getBalance = useCallback(async () => {
    if (!primaryWallet) {
      return null;
    }

    try {
      const balance = await primaryWallet.getBalance();
      return balance;
    } catch (error) {
      console.error("Error getting wallet balance:", error);
      return null;
    }
  }, [primaryWallet]);

  // Get connected accounts
  const getConnectedAccounts = useCallback(async () => {
    if (!primaryWallet?.connector) {
      return [];
    }

    try {
      const accounts = await primaryWallet.connector.getConnectedAccounts();
      return accounts;
    } catch (error) {
      console.error("Error getting connected accounts:", error);
      return [];
    }
  }, [primaryWallet]);

  // Return the necessary wallet functions and state
  return {
    // Connection state - use Dynamic's isLoggedIn for proper authentication status
    isConnected: Boolean(isLoggedIn && primaryWallet),
    isAuthenticated: isLoggedIn, // Use Dynamic's isLoggedIn hook
    isLoading: !sdkHasLoaded, // Include SDK loading state
    sdkHasLoaded,

    // Wallet info
    address: address || primaryWallet?.address || null,
    primaryWallet,
    user,
    userWithMissingInfo, // User who is authenticated but hasn't finished onboarding

    // Actions
    connectWallet,
    disconnectWallet,
    getBalance,
    getConnectedAccounts,

    // UI controls
    setShowAuthFlow,

    // Additional Dynamic-specific properties
    isLoggedIn, // Expose the raw isLoggedIn for components that need it
  };
}
