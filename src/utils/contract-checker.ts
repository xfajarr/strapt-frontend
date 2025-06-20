// Utility to check if contracts exist on the current network
import { createPublicClient, http } from 'viem';
import { mantleSepoliaTestnet } from 'viem/chains';

export const checkContractExists = async (address: `0x${string}`) => {
  try {
    const client = createPublicClient({
      chain: mantleSepoliaTestnet,
      transport: http('https://rpc.sepolia.mantle.xyz'),
    });

    // Try to get the contract bytecode
    const bytecode = await client.getBytecode({ address });

    return {
      exists: !!bytecode && bytecode !== '0x',
      bytecode: bytecode || '0x',
      address
    };
  } catch (error) {
    console.error('Error checking contract:', error);
    return {
      exists: false,
      bytecode: '0x',
      address,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const checkMultipleContracts = async (addresses: `0x${string}`[]) => {
  const results = await Promise.all(
    addresses.map(address => checkContractExists(address))
  );

  return results.reduce((acc, result) => {
    acc[result.address] = result;
    return acc;
  }, {} as Record<string, any>);
};

// Quick test function you can call from console
export const testContracts = async () => {
  const addresses = [
    '0xe0ADeAd4878594D38c6e640E081738eCDF052854', // MockUSDC
    '0x5bF229Cb7654663804Ca0aCb80B5eeEA890B1638', // MockUSDT
  ] as `0x${string}`[];

  console.log('🔍 Checking contracts on Mantle Sepolia...');
  const results = await checkMultipleContracts(addresses);

  console.log('📊 Results:');
  Object.entries(results).forEach(([address, result]) => {
    console.log(`${address}: ${result.exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
  });

  return results;
};
