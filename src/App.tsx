
import { Suspense, lazy } from "react";
import { Toaster as Sonner } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Loading } from "@/components/ui/loading";

import { DynamicProvider } from './providers/DynamicProvider';
import { AppStateProvider } from './state/AppStateContext';
import { TransferStateProvider } from './state/TransferStateContext';
import { DataProvider } from './providers/DataProvider';
import TransactionDetector from './components/TransactionDetector';

// Import WalletCheck eagerly as it's needed for route protection
import WalletCheck from './components/WalletCheck';

// Eagerly load layouts as they're used on every page
import Layout from "./components/Layout";
import DesktopLayout from "./components/DesktopLayout";

// Import Home eagerly to fix dynamic import issue
import Home from "./pages/Home";

// Lazy load other page components to reduce initial bundle size
const Index = lazy(() => import("./pages/Index"));
const Transfer = lazy(() => import("./pages/Transfer"));

const Pools = lazy(() => import("./pages/Pools"));
const StraptGift = lazy(() => import("./pages/EnhancedStraptGift"));
const StraptGiftClaim = lazy(() => import("./pages/EnhancedStraptGiftClaim"));
const MyGifts = lazy(() => import("./pages/OptimizedMyGifts"));
const MyTransfers = lazy(() => import("./pages/MyTransfers"));
const Profile = lazy(() => import("./pages/OptimizedProfile"));
const Claims = lazy(() => import("./pages/Claims"));
const Savings = lazy(() => import("./pages/Savings"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const NotFound = lazy(() => import("./pages/NotFound"));



const App = () => {
  const isMobile = useIsMobile();

  // Loading fallback for lazy-loaded components
  const PageLoading = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loading size="lg" text="Loading page..." />
    </div>
  );

  return (
    <ThemeProvider defaultTheme="dark" storageKey="strapt-theme">
      <DynamicProvider>
          <AppStateProvider>
            <TransferStateProvider>
              <TooltipProvider>
                <Sonner position="top-right" />
                <BrowserRouter>
                  <DataProvider>
                  <TransactionDetector>
                <Routes>
                  <Route path="/" element={
                    <Suspense fallback={<PageLoading />}>
                      <Index />
                    </Suspense>
                  } />
                  <Route path="claim/:id?" element={<Navigate to="/app/claims" replace />} />

                  {/* Protected routes require wallet connection */}
                  <Route element={<WalletCheck />}>
                    <Route path="app" element={isMobile ? <Layout /> : <DesktopLayout />}>
                      <Route index element={<Home />} />
                      <Route path="transfer" element={
                        <Suspense fallback={<PageLoading />}>
                          <Transfer />
                        </Suspense>
                      } />
                      <Route path="savings" element={
                        <Suspense fallback={<PageLoading />}>
                          <Savings />
                        </Suspense>
                      } />
                      <Route path="pools" element={
                        <Suspense fallback={<PageLoading />}>
                          <Pools />
                        </Suspense>
                      } />
                      <Route path="strapt-gift" element={
                        <Suspense fallback={<PageLoading />}>
                          <StraptGift />
                        </Suspense>
                      } />
                      <Route path="strapt-gift/claim/:id?" element={
                        <Suspense fallback={<PageLoading />}>
                          <StraptGiftClaim />
                        </Suspense>
                      } />
                      <Route path="strapt-gift/my-gifts" element={
                        <Suspense fallback={<PageLoading />}>
                          <MyGifts />
                        </Suspense>
                      } />
                      {/* Backward compatibility routes */}
                      <Route path="strapt-drop" element={
                        <Suspense fallback={<PageLoading />}>
                          <StraptGift />
                        </Suspense>
                      } />
                      <Route path="strapt-drop/claim/:id?" element={
                        <Suspense fallback={<PageLoading />}>
                          <StraptGiftClaim />
                        </Suspense>
                      } />
                      <Route path="strapt-drop/my-drops" element={
                        <Suspense fallback={<PageLoading />}>
                          <MyGifts />
                        </Suspense>
                      } />
                      <Route path="profile" element={
                        <Suspense fallback={<PageLoading />}>
                          <Profile />
                        </Suspense>
                      } />
                      <Route path="my-transfers" element={
                        <Suspense fallback={<PageLoading />}>
                          <MyTransfers />
                        </Suspense>
                      } />
                      <Route path="claims" element={
                        <Suspense fallback={<PageLoading />}>
                          <Claims />
                        </Suspense>
                      } />
                      <Route path="coming-soon" element={
                        <Suspense fallback={<PageLoading />}>
                          <ComingSoon />
                        </Suspense>
                      } />
                    </Route>
                  </Route>
                  <Route path="*" element={
                    <Suspense fallback={<PageLoading />}>
                      <NotFound />
                    </Suspense>
                  } />
                  </Routes>
                  </TransactionDetector>
                  </DataProvider>
                </BrowserRouter>
                </TooltipProvider>
            </TransferStateProvider>
          </AppStateProvider>
      </DynamicProvider>
    </ThemeProvider>
  );
};

export default App;
