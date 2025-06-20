# Dynamic Labs Migration Guide

This document outlines the migration from Xellar wallet integration to Dynamic Labs.

## What Changed

### 1. Dependencies
- **Removed**: `@xellar/kit`
- **Added**:
  - `@dynamic-labs/sdk-react-core`
  - `@dynamic-labs/ethereum`
  - `@dynamic-labs/wagmi-connector`

### 2. Provider Changes
- **Old**: `XellarProvider` → **New**: `DynamicProvider`
- **Old**: `useXellarWallet` → **New**: `useDynamicWallet`

### 3. Component Updates
- **Old**: `XellarWalletButton` → **New**: `DynamicWalletButton`
- **Old**: `XellarWalletProfile` → **New**: `DynamicWalletProfile`

## Setup Instructions

### 1. Install Dependencies
```bash
bun add @dynamic-labs/sdk-react-core @dynamic-labs/ethereum @dynamic-labs/wagmi-connector
bun remove @xellar/kit
```

### 2. Environment Variables
Create a `.env.local` file with:
```
VITE_DYNAMIC_ENVIRONMENT_ID=your_dynamic_environment_id_here
```

### 3. Get Dynamic Environment ID
1. Go to [Dynamic Labs Dashboard](https://app.dynamic.xyz/)
2. Create a new project or use existing one
3. Copy the Environment ID from your project settings
4. Add it to your `.env.local` file

## Key Features

### Dynamic Labs Benefits
- **Multi-wallet support**: 300+ wallets including MetaMask, WalletConnect, etc.
- **Social login**: Email, Google, Apple, Discord, Twitter, etc.
- **Embedded wallets**: Built-in wallet creation with TSS-MPC security
- **Better UX**: Seamless onboarding for both Web2 and Web3 users
- **Enterprise ready**: SOC2 compliance and advanced security
- **Proper loading states**: SDK and user state management following Dynamic's best practices

### New Components and Hooks
- **`DynamicLoadingStates`**: Component that handles all Dynamic loading states
- **`useDynamicLoadingState`**: Hook providing detailed loading state information
- **`useDynamicWallet`**: Enhanced wallet hook with proper Dynamic integration
- **Proper wagmi setup**: Following Dynamic's recommended wagmi configuration

### API Compatibility
The new `useDynamicWallet` hook maintains the same interface as `useXellarWallet`:
- `isConnected`: Boolean indicating wallet connection status (for wagmi compatibility)
- `isLoggedIn`: Boolean indicating user authentication status (recommended for UI logic)
- `address`: Connected wallet address
- `connectWallet()`: Function to initiate connection
- `disconnectWallet()`: Function to disconnect wallet (uses Dynamic's handleLogOut)

### Key Authentication Changes
- **Use `isLoggedIn`** instead of `isConnected` for UI logic and authentication checks
- **Use `handleLogOut`** from Dynamic's context for proper logout functionality
- **Use `useIsLoggedIn`** hook for dedicated login status checking
- **Use `sdkHasLoaded`** to ensure SDK is ready before performing operations
- **Handle `userWithMissingInfo`** for users who need to complete onboarding
- The `isConnected` property is maintained for wagmi compatibility but `isLoggedIn` is more accurate for Dynamic's authentication flow

### Loading State Management
- **DynamicLoadingStates component** handles all SDK and user loading states
- **useDynamicLoadingState hook** provides detailed loading state information
- **Proper wagmi integration** with DynamicWagmiConnector following Dynamic's best practices
- **SDK loading detection** prevents operations before Dynamic is ready

## Migration Checklist

- [x] Update package.json dependencies
- [x] Replace XellarProvider with DynamicProvider
- [x] Update useXellarWallet imports to useDynamicWallet
- [x] Update component imports (XellarWalletButton → DynamicWalletButton)
- [x] Update all hook files that import config from XellarProvider
- [x] Update all dynamic imports in hook files
- [x] Set up environment variables
- [x] Create migration documentation
- [x] Update to use useIsLoggedIn hook for proper authentication status
- [x] Update to use handleLogOut function for proper logout functionality
- [x] Update all components to use isLoggedIn instead of isConnected
- [x] Implement proper Dynamic loading states with DynamicLoadingStates component
- [x] Update wagmi integration to follow Dynamic's best practices
- [x] Add proper SDK loading state handling
- [x] Add support for userWithMissingInfo (onboarding completion)
- [x] Fix landing page display (show Index page instead of connect wallet card)
- [x] Update Index page to use Dynamic authentication instead of wagmi
- [ ] Test wallet connection functionality
- [ ] Test all wallet-dependent features
- [ ] Remove old Xellar files (optional)

## Usage Examples

### Using the Loading State Hook
```typescript
import { useDynamicLoadingState } from '@/components/DynamicLoadingStates';

const MyComponent = () => {
  const {
    isReady,
    isLoading,
    isLoggedIn,
    needsOnboarding,
    sdkLoading
  } = useDynamicLoadingState();

  if (sdkLoading) return <div>Loading SDK...</div>;
  if (needsOnboarding) return <div>Complete your profile...</div>;
  if (!isLoggedIn) return <div>Please log in...</div>;
  if (!isReady) return <div>Getting ready...</div>;

  return <div>App content here!</div>;
};
```

### Using the Enhanced Wallet Hook
```typescript
import { useDynamicWallet } from '@/hooks/use-dynamic-wallet';

const WalletComponent = () => {
  const {
    isLoggedIn,
    sdkHasLoaded,
    userWithMissingInfo,
    connectWallet,
    disconnectWallet
  } = useDynamicWallet();

  if (!sdkHasLoaded) return <div>Loading...</div>;
  if (userWithMissingInfo) return <div>Complete setup...</div>;

  return (
    <button onClick={isLoggedIn ? disconnectWallet : connectWallet}>
      {isLoggedIn ? 'Disconnect' : 'Connect'} Wallet
    </button>
  );
};
```

## Testing

After migration, test the following:
1. SDK loading states
2. Wallet connection/disconnection with proper loading states
3. Social login flows
4. Embedded wallet creation
5. Onboarding completion flows
6. Protected transfers
7. Payment streams
8. STRAPT drops
9. Profile functionality
10. Network switching

## Rollback Plan

If issues arise, you can quickly rollback by:
1. Reverting the package.json changes
2. Restoring the XellarProvider files
3. Updating imports back to useXellarWallet

The old files are preserved in git history for easy restoration.
