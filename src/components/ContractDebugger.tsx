import React, { useState } from 'react';
import { useAccount, useChainId, useReadContract, useSwitchChain } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import USDCABI from '@/contracts/MockUSDC.json';
import USDTABI from '@/contracts/MockUSDT.json';
import { checkMultipleContracts } from '@/utils/contract-checker';
import { mantleSepoliaTestnet } from 'viem/chains';
import { createPublicClient, http } from 'viem';

const ContractDebugger = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [debugResults, setDebugResults] = useState<any>({});

  // Contract addresses
  const USDC_ADDRESS = USDCABI.address as `0x${string}`;
  const USDT_ADDRESS = USDTABI.address as `0x${string}`;

  // Read contract functions to test if contracts exist
  const { data: usdcName, error: usdcNameError } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDCABI.abi,
    functionName: 'name',
    query: {
      enabled: chainId === 5003,
    },
  });

  const { data: usdcSymbol, error: usdcSymbolError } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDCABI.abi,
    functionName: 'symbol',
    query: {
      enabled: chainId === 5003,
    },
  });

  const { data: usdtName, error: usdtNameError } = useReadContract({
    address: USDT_ADDRESS,
    abi: USDTABI.abi,
    functionName: 'name',
    query: {
      enabled: chainId === 5003,
    },
  });

  const { data: usdtSymbol, error: usdtSymbolError } = useReadContract({
    address: USDT_ADDRESS,
    abi: USDTABI.abi,
    functionName: 'symbol',
    query: {
      enabled: chainId === 5003,
    },
  });

  const runDebugTests = async () => {
    console.log('🔍 Running contract debug tests...');

    // Check if contracts exist on-chain
    const contractExistence = await checkMultipleContracts([USDC_ADDRESS, USDT_ADDRESS]);

    const results = {
      network: {
        chainId,
        isCorrectNetwork: chainId === 5003,
        expectedChainId: 5003,
        networkName: chainId === 5003 ? 'Mantle Sepolia' : 'Unknown/Wrong Network'
      },
      wallet: {
        isConnected,
        address
      },
      contractExistence,
      contracts: {
        usdc: {
          address: USDC_ADDRESS,
          name: usdcName,
          symbol: usdcSymbol,
          nameError: usdcNameError?.message,
          symbolError: usdcSymbolError?.message,
          exists: !usdcNameError && !usdcSymbolError,
          onChainExists: contractExistence[USDC_ADDRESS]?.exists || false
        },
        usdt: {
          address: USDT_ADDRESS,
          name: usdtName,
          symbol: usdtSymbol,
          nameError: usdtNameError?.message,
          symbolError: usdtSymbolError?.message,
          exists: !usdtNameError && !usdtSymbolError,
          onChainExists: contractExistence[USDT_ADDRESS]?.exists || false
        }
      }
    };

    setDebugResults(results);
    console.log('📊 Contract Debug Results:', results);
  };

  const handleSwitchToMantle = async () => {
    try {
      await switchChain({ chainId: mantleSepoliaTestnet.id });
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  const testDirectContractCall = async () => {
    try {
      console.log('🧪 Testing direct contract calls...');

      const client = createPublicClient({
        chain: mantleSepoliaTestnet,
        transport: http('https://rpc.sepolia.mantle.xyz'),
      });

      // Test USDC contract directly
      const usdcName = await client.readContract({
        address: USDC_ADDRESS,
        abi: USDCABI.abi,
        functionName: 'name',
      });

      const usdcSymbol = await client.readContract({
        address: USDC_ADDRESS,
        abi: USDCABI.abi,
        functionName: 'symbol',
      });

      // Test USDT contract directly
      const usdtName = await client.readContract({
        address: USDT_ADDRESS,
        abi: USDTABI.abi,
        functionName: 'name',
      });

      const usdtSymbol = await client.readContract({
        address: USDT_ADDRESS,
        abi: USDTABI.abi,
        functionName: 'symbol',
      });

      const directResults = {
        usdc: { name: usdcName, symbol: usdcSymbol },
        usdt: { name: usdtName, symbol: usdtSymbol }
      };

      console.log('✅ Direct contract calls successful:', directResults);
      setDebugResults(prev => ({ ...prev, directContractTest: directResults }));

    } catch (error) {
      console.error('❌ Direct contract calls failed:', error);
      setDebugResults(prev => ({
        ...prev,
        directContractTest: { error: error instanceof Error ? error.message : 'Unknown error' }
      }));
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Contract Debugger - Mantle Sepolia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">Network Status</h3>
            <div className="text-sm space-y-1">
              <p>Chain ID: {chainId}</p>
              <p>Expected: 5003 (Mantle Sepolia)</p>
              <p className={chainId === 5003 ? 'text-green-600' : 'text-red-600'}>
                Status: {chainId === 5003 ? '✅ Correct Network' : '❌ Wrong Network'}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Wallet Status</h3>
            <div className="text-sm space-y-1">
              <p>Connected: {isConnected ? '✅ Yes' : '❌ No'}</p>
              <p>Address: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}</p>
              {chainId !== 5003 && (
                <Button
                  onClick={handleSwitchToMantle}
                  size="sm"
                  className="mt-2"
                  variant="destructive"
                >
                  Switch to Mantle Sepolia
                </Button>
              )}
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Contract Addresses</h3>
          <div className="text-sm space-y-1">
            <p>MockUSDC: {USDC_ADDRESS}</p>
            <p>MockUSDT: {USDT_ADDRESS}</p>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Contract Test Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium">MockUSDC</h4>
              <p>Name: {usdcName || 'Loading...'}</p>
              <p>Symbol: {usdcSymbol || 'Loading...'}</p>
              {usdcNameError && <p className="text-red-600">Name Error: {usdcNameError.message}</p>}
              {usdcSymbolError && <p className="text-red-600">Symbol Error: {usdcSymbolError.message}</p>}
            </div>
            <div>
              <h4 className="font-medium">MockUSDT</h4>
              <p>Name: {usdtName || 'Loading...'}</p>
              <p>Symbol: {usdtSymbol || 'Loading...'}</p>
              {usdtNameError && <p className="text-red-600">Name Error: {usdtNameError.message}</p>}
              {usdtSymbolError && <p className="text-red-600">Symbol Error: {usdtSymbolError.message}</p>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Button onClick={runDebugTests} className="w-full">
            Run Debug Tests
          </Button>
          <Button onClick={testDirectContractCall} variant="outline" className="w-full">
            Test Direct Calls
          </Button>
        </div>

        {debugResults.network && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Debug Results</h3>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
              {JSON.stringify(debugResults, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-4 p-4 bg-blue-50 rounded">
          <h4 className="font-semibold text-blue-800">Troubleshooting Steps:</h4>
          <ol className="list-decimal list-inside text-sm text-blue-700 mt-2 space-y-1">
            <li>Ensure your wallet is connected to Mantle Sepolia (Chain ID: 5003)</li>
            <li>Check that the contract addresses are correct</li>
            <li>Verify the contracts are deployed and verified on <a href="https://explorer.sepolia.mantle.xyz" target="_blank" rel="noopener noreferrer" className="underline">Mantle Sepolia Explorer</a></li>
            <li>Try switching networks and switching back</li>
            <li>Check browser console for detailed error messages</li>
          </ol>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <h5 className="font-medium text-yellow-800">Quick Links:</h5>
            <div className="text-sm text-yellow-700 mt-1 space-y-1">
              <p>• <a href={`https://explorer.sepolia.mantle.xyz/address/${USDC_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="underline">Check MockUSDC Contract</a></p>
              <p>• <a href={`https://explorer.sepolia.mantle.xyz/address/${USDT_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="underline">Check MockUSDT Contract</a></p>
              <p>• <a href="https://faucet.sepolia.mantle.xyz/" target="_blank" rel="noopener noreferrer" className="underline">Get Mantle Sepolia ETH</a></p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractDebugger;
