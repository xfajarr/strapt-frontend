import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { initDataServices, refreshAllData } from '@/services/DataService';
import { useDynamicWallet } from '@/hooks/use-dynamic-wallet';
import { useLocation } from 'react-router-dom';

// Import the context from a separate file instead of creating it here
import { DataContext } from './DataContext';

// Export the useDataContext hook
export { useDataContext } from './useDataContext';

/**
 * Provider component that initializes data services
 * and provides methods to refresh data
 */
export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const { isLoggedIn, address } = useDynamicWallet();
  const location = useLocation();

  // Use refs to track previous values and prevent unnecessary refreshes
  const prevAddressRef = useRef<string | undefined>();
  const prevPathRef = useRef<string>();

  // Initialize data services when wallet is logged in
  useEffect(() => {
    if (isLoggedIn && address && !isInitialized) {
      console.log('Initializing data services with wallet:', address);
      try {
        initDataServices();
        setIsInitialized(true);
        prevAddressRef.current = address;
        prevPathRef.current = location.pathname;
      } catch (error) {
        console.error('Error initializing data services:', error);
      }
    }
  }, [isLoggedIn, address, isInitialized, location.pathname]);

  // Refresh all data when wallet changes or route changes (but only if actually changed)
  useEffect(() => {
    if (isLoggedIn && address && isInitialized) {
      const addressChanged = prevAddressRef.current !== address;
      const pathChanged = prevPathRef.current !== location.pathname;

      if (addressChanged || pathChanged) {
        console.log('Wallet or route changed, refreshing all data');
        try {
          refreshAllData();
          prevAddressRef.current = address;
          prevPathRef.current = location.pathname;
        } catch (error) {
          console.error('Error refreshing data:', error);
        }
      }
    }
  }, [address, isLoggedIn, isInitialized, location.pathname]);

  // Set up window focus event listener
  useEffect(() => {
    const handleFocus = () => {
      if (isInitialized && isLoggedIn && address) {
        console.log('Window focused, refreshing all data');
        try {
          refreshAllData();
        } catch (error) {
          console.error('Error refreshing data on window focus:', error);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [isInitialized, isLoggedIn, address]);

  // Set up online event listener
  useEffect(() => {
    const handleOnline = () => {
      if (isInitialized && isLoggedIn && address) {
        console.log('Back online, refreshing all data');
        try {
          refreshAllData();
        } catch (error) {
          console.error('Error refreshing data on coming back online:', error);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [isInitialized, isLoggedIn, address]);

  return (
    <DataContext.Provider value={{ isInitialized, refreshAllData }}>
      {children}
    </DataContext.Provider>
  );
};