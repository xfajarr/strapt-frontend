import { initDataSubscriptionService, setRefreshHandler, type DataType } from './DataSubscriptionService';
import { initTokenBalanceService, fetchTokenBalances } from './TokenBalanceService';
import { initTransfersDataService, fetchTransfersData } from './TransfersDataService';

// Flag to track if the service is initialized
let isInitialized = false;

/**
 * Initialize all data services
 */
export const initDataServices = () => {
  if (isInitialized) return;

  console.log('Initializing all data services');

  // Initialize the data subscription service
  initDataSubscriptionService();

  // Initialize individual data services
  initTokenBalanceService();
  initTransfersDataService();

  // Register refresh handlers
  registerRefreshHandlers();

  isInitialized = true;
};

/**
 * Register refresh handlers for each data type
 */
const registerRefreshHandlers = () => {
  // Instead of monkey patching, we'll use a more TypeScript-friendly approach
  // by updating the DataSubscriptionService directly

  // Set our custom refresh handler
  setRefreshHandler((dataType: DataType) => {
    console.log(`Refreshing data for ${dataType}`);

    switch (dataType) {
      case 'tokens':
        fetchTokenBalances();
        break;
      case 'transfers':
        fetchTransfersData();
        break;
      default:
        console.log(`No specific handler for data type: ${dataType}`);
        break;
    }
  });
};

/**
 * Refresh all data
 */
export const refreshAllData = () => {
  // Only refresh if the service is initialized
  if (!isInitialized) {
    console.warn('Cannot refresh data: data services not initialized');
    return;
  }

  // Refresh all data types with error handling

  try {
    fetchTokenBalances();
  } catch (error) {
    console.error('Error refreshing token balances:', error);
  }

  try {
    fetchTransfersData();
  } catch (error) {
    console.error('Error refreshing transfers data:', error);
  }
};

// Export all the hooks from the individual services
export { useTokenBalancesData } from './TokenBalanceService';
export { useSentTransfersData, useReceivedTransfersData } from './TransfersDataService';
export { useDataSubscription } from './DataSubscriptionService';
