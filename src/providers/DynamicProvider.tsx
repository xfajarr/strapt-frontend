import React from "react";
import { Config, WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { liskSepolia, baseSepolia, mantleSepoliaTestnet } from "viem/chains";

// Environment variables
const DYNAMIC_ENVIRONMENT_ID = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID || "1e5413fb-7769-4e12-af13-324cec213c51";
const WALLET_CONNECT_PROJECT_ID = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "0a6602a98f8e6ca23405a5c8cd8805e8";

// Create wagmi config for Dynamic
// Note: multiInjectedProviderDiscovery is set to false as Dynamic implements this itself
export const config = createConfig({
  chains: [liskSepolia, mantleSepoliaTestnet, baseSepolia],
  multiInjectedProviderDiscovery: false,
  transports: {
    [liskSepolia.id]: http(),
    [mantleSepoliaTestnet.id]: http("https://rpc.sepolia.mantle.xyz"),
    [baseSepolia.id]: http(),
  },
}) as Config;

const queryClient = new QueryClient();

export const DynamicProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: DYNAMIC_ENVIRONMENT_ID,
        walletConnectors: [EthereumWalletConnectors],
        initialAuthenticationMode: 'connect-and-sign' as const,
        appName: 'STRAPT',

        // UI Configuration
        cssOverrides: `
          .dynamic-shadow-dom {
            --dynamic-color-primary: #3B82F6;
            --dynamic-color-primary-hover: #2563EB;
            --dynamic-border-radius: 8px;
          }
        `,

        // Network Configuration - disable to prevent loops
        networkValidationMode: 'always',

        // Mobile Experience - disable to prevent loops
        mobileExperience: 'in-app-browser',

        // // Wallet Connect Configuration
        // walletConnectPreferredChains: ['eip155:4202', 'eip155:5003', 'eip155:84532'], // Lisk Sepolia, Mantle Sepolia, Base Sepolia

        // // Debug mode for development
        // debugError: process.env.NODE_ENV === 'development',
        // logLevel: process.env.NODE_ENV === 'development' ? 'DEBUG' : 'WARN',
      }}
    >
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>
            {children}
          </DynamicWagmiConnector>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  );
};
