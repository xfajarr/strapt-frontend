import React from 'react';
import { useDynamicContext, useIsLoggedIn } from '@dynamic-labs/sdk-react-core';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface DynamicLoadingStatesProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that handles Dynamic SDK loading states and user authentication states
 * according to Dynamic's best practices
 */
export const DynamicLoadingStates: React.FC<DynamicLoadingStatesProps> = ({
  children,
  fallback
}) => {
  const {
    sdkHasLoaded,
    user,
    userWithMissingInfo,
    isVerificationInProgress,
    setShowAuthFlow
  } = useDynamicContext();

  const isLoggedIn = useIsLoggedIn();

  // SDK is still loading
  if (!sdkHasLoaded) {
    return fallback || (
      <div className="flex items-center justify-center min-h-[200px]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="font-medium">Loading Wallet SDK</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Initializing secure wallet connection...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is in verification process
  if (isVerificationInProgress) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
            <Clock className="h-8 w-8 text-amber-500" />
            <div className="text-center">
              <h3 className="font-medium">Verification in Progress</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Please complete the verification process in the popup window.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is authenticated but hasn't finished onboarding
  if (userWithMissingInfo) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <div className="text-center">
              <h3 className="font-medium">Complete Your Profile</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Please complete the required information to continue.
              </p>
            </div>
            <Button
              onClick={() => setShowAuthFlow(true)}
              className="mt-4"
            >
              Complete Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is fully logged in and onboarded
  if (isLoggedIn && user) {
    return <>{children}</>;
  }

  // User is not logged in - show the children (landing page)
  return <>{children}</>;
};

/**
 * Hook that provides detailed loading state information
 */
export const useDynamicLoadingState = () => {
  const {
    sdkHasLoaded,
    user,
    userWithMissingInfo,
    isVerificationInProgress
  } = useDynamicContext();

  const isLoggedIn = useIsLoggedIn();

  return {
    // Loading states
    sdkLoading: !sdkHasLoaded,
    verificationInProgress: isVerificationInProgress,

    // User states
    isLoggedIn,
    hasUser: Boolean(user),
    needsOnboarding: Boolean(userWithMissingInfo),

    // Combined states
    isReady: sdkHasLoaded && isLoggedIn && user && !userWithMissingInfo,
    isLoading: !sdkHasLoaded || isVerificationInProgress,

    // User objects
    user,
    userWithMissingInfo,
  };
};

export default DynamicLoadingStates;
