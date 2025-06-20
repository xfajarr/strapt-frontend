import React from 'react';
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LoadingState, LoadingOperation } from '@/hooks/use-unified-loading';

interface EnhancedLoadingProps {
  loadingState: LoadingState;
  operations?: LoadingOperation[];
  className?: string;
  variant?: 'default' | 'minimal' | 'detailed';
  showProgress?: boolean;
  showOperations?: boolean;
}

/**
 * Enhanced loading component with progress tracking and operation details
 */
export const EnhancedLoading: React.FC<EnhancedLoadingProps> = ({
  loadingState,
  operations = [],
  className,
  variant = 'default',
  showProgress = true,
  showOperations = false
}) => {
  const { isLoading, loadingMessage, progress } = loadingState;

  if (!isLoading) {
    return null;
  }

  // Minimal variant - just a spinner
  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        {loadingMessage && (
          <span className="ml-2 text-sm text-muted-foreground">{loadingMessage}</span>
        )}
      </div>
    );
  }

  // Detailed variant - full card with operations
  if (variant === 'detailed') {
    return (
      <Card className={cn("w-full max-w-md mx-auto", className)}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <h3 className="font-medium">Processing...</h3>
            </div>
            
            {loadingMessage && (
              <p className="text-sm text-muted-foreground text-center">
                {loadingMessage}
              </p>
            )}
            
            {showProgress && progress !== undefined && (
              <div className="w-full space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-muted-foreground text-center">
                  {Math.round(progress)}% complete
                </p>
              </div>
            )}
            
            {showOperations && operations.length > 0 && (
              <div className="w-full space-y-2">
                <h4 className="text-sm font-medium">Current Operations:</h4>
                <div className="space-y-1">
                  {operations.map((operation) => (
                    <div
                      key={operation.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-muted-foreground">{operation.message}</span>
                      <div className="flex items-center space-x-1">
                        {operation.progress !== undefined && (
                          <span className="text-muted-foreground">
                            {Math.round(operation.progress)}%
                          </span>
                        )}
                        <Loader2 className="h-3 w-3 animate-spin" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default variant - simple card
  return (
    <Card className={cn("w-full max-w-sm mx-auto", className)}>
      <CardContent className="flex flex-col items-center justify-center py-6 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        
        {loadingMessage && (
          <div className="text-center">
            <p className="font-medium">{loadingMessage}</p>
          </div>
        )}
        
        {showProgress && progress !== undefined && (
          <div className="w-full space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-muted-foreground text-center">
              {Math.round(progress)}% complete
            </p>
          </div>
        )}
        
        {operations.length > 1 && (
          <Badge variant="secondary" className="text-xs">
            {operations.length} operations running
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};

interface LoadingOverlayProps {
  isLoading: boolean;
  loadingState?: LoadingState;
  children: React.ReactNode;
  className?: string;
  overlayClassName?: string;
}

/**
 * Loading overlay component that covers content while loading
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  loadingState,
  children,
  className,
  overlayClassName
}) => {
  return (
    <div className={cn("relative", className)}>
      {children}
      
      {isLoading && (
        <div className={cn(
          "absolute inset-0 bg-background/80 backdrop-blur-sm",
          "flex items-center justify-center z-50",
          overlayClassName
        )}>
          {loadingState ? (
            <EnhancedLoading loadingState={loadingState} variant="default" />
          ) : (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface InlineLoadingProps {
  isLoading: boolean;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Inline loading component for buttons and small spaces
 */
export const InlineLoading: React.FC<InlineLoadingProps> = ({
  isLoading,
  message,
  size = 'md',
  className
}) => {
  if (!isLoading) {
    return null;
  }

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      {message && (
        <span className={cn(
          "text-muted-foreground",
          size === 'sm' && "text-xs",
          size === 'md' && "text-sm",
          size === 'lg' && "text-base"
        )}>
          {message}
        </span>
      )}
    </div>
  );
};

interface LoadingStateIndicatorProps {
  state: 'loading' | 'success' | 'error' | 'idle';
  message?: string;
  className?: string;
}

/**
 * Loading state indicator with different states
 */
export const LoadingStateIndicator: React.FC<LoadingStateIndicatorProps> = ({
  state,
  message,
  className
}) => {
  const getIcon = () => {
    switch (state) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'idle':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getColor = () => {
    switch (state) {
      case 'loading':
        return 'text-primary';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'idle':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {getIcon()}
      {message && (
        <span className={cn("text-sm", getColor())}>
          {message}
        </span>
      )}
    </div>
  );
};
