import { createContext } from 'react';

// Create context
export interface DataContextType {
  isInitialized: boolean;
  refreshAllData: () => void;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);