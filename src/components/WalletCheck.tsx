import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useDynamicLoadingState } from '@/components/DynamicLoadingStates';
import LoadingScreen from './LoadingScreen';
import { useMemo } from 'react';

const WalletCheck = () => {
  const { isReady, isLoading, isLoggedIn } = useDynamicLoadingState();
  const location = useLocation();

  // Memoize the navigation decision to prevent infinite loops
  const shouldNavigateToHome = useMemo(() => {
    return !isLoggedIn || !isReady;
  }, [isLoggedIn, isReady]);

  // If still loading (SDK or verification), show loading screen
  if (isLoading) {
    return <LoadingScreen />;
  }

  // If not logged in or not ready, prevent access to the app
  if (shouldNavigateToHome) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If fully ready, render the children
  return <Outlet />;
};

export default WalletCheck;
