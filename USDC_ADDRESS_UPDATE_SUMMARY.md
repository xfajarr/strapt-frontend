# USDC Address Update Summary

This document summarizes the changes made to update the USDC contract address in the STRAPT frontend from the old address to the new one on Mantle testnet.

## Address Change

**Old USDC Address**: `0x9caA3975dc6f6daF7845df2de4512518CEc005c2`
**New USDC Address**: `0xe0ADeAd4878594D38c6e640E081738eCDF052854`

**Network**: Mantle Sepolia Testnet (Chain ID: 5003)

## Files Updated

### 1. Configuration Files
- ✅ `strapt-frontend/src/contracts/contract-config.json` - Updated all USDC addresses in contract configurations
- ✅ `frontend/src/contracts/contract-config.json` - Updated all USDC addresses in contract configurations

### 2. ABI Files
- ✅ `strapt-frontend/src/contracts/MockUSDC.json` - Updated address field
- ✅ `frontend/src/contracts/MockUSDC.json` - Updated address field

### 3. Utility Files
- ✅ `strapt-frontend/src/utils/contract-checker.ts` - Updated test addresses

### 4. Documentation Files
- ✅ `frontend/BALANCE_TROUBLESHOOTING.md` - Updated token addresses
- ✅ `frontend/NETWORK_MIGRATION_SUMMARY.md` - Updated token addresses
- ✅ `frontend/ABI_FIX_SUMMARY.md` - Updated contract details
- ✅ `frontend/TOKEN_ADDRESS_UPDATE.md` - Updated address references
- ✅ `frontend/BALANCE_DISPLAY_UPDATE.md` - Updated token addresses

## Contract Configurations Updated

The following contracts now use the new USDC address:

1. **ProtectedTransferV2** (`0x33665BB084Eb3a01aA2E4eCE2FAd292dCe683e34`)
2. **ProtectedTransfer** (`0x225f179c0d57c3DF357f802BB40d5a4BeaFb4F0C`)
3. **PaymentStream** (`0xDFa0a6101f25630d3122e1b6b34590848ba35402`)
4. **StraptDrop** (`0x3d183CDCbF78BA6e39eb0e51C44d233265786e0A`)
5. **USDCFaucet** (`0xDb8F9c652f613FAdB680daE048642D0e6AC8F733`)

## Components Affected

The following components will automatically use the new address through the updated ABI files:

- **ContractDebugger** - Uses MockUSDC.json import
- **Token Balance Hooks** - Use MockUSDC.json import
- **Token Utilities** - Use MockUSDC.json import
- **All contract interaction hooks** - Use contract-config.json

## Testing Recommendations

1. **Verify Contract Existence**: Use the ContractDebugger component to verify the new contract exists on Mantle Sepolia
2. **Test Balance Display**: Check that USDC balances load correctly with the new address
3. **Test Token Transfers**: Verify that USDC transfers work with the new contract
4. **Test Faucet**: Ensure the USDC faucet works with the new token address
5. **Test All Features**: Verify ProtectedTransfer, PaymentStream, and StraptDrop work with new USDC

## Network Configuration

The frontend is configured for:
- **Primary Network**: Mantle Sepolia Testnet
- **Chain ID**: 5003
- **RPC URL**: https://rpc.sepolia.mantle.xyz
- **Explorer**: https://explorer.sepolia.mantle.xyz

## Token Details

**USDC Contract**: `0xe0ADeAd4878594D38c6e640E081738eCDF052854`
- **Symbol**: USDC
- **Decimals**: 6
- **Standard**: ERC20 with extended functions (mint, burn, batch operations)

**USDT Contract**: `0x5bF229Cb7654663804Ca0aCb80B5eeEA890B1638` (unchanged)
- **Symbol**: USDT
- **Decimals**: 6
- **Standard**: ERC20 with extended functions

## ABI Update

The MockUSDC.json ABI files have been updated with the complete ABI from the compiled contract (`strapt-contract/out/MockUSDC.sol/MockUSDC.json`). The new ABI includes:

### Additional Functions:
- `canClaimFaucet(address)` - Check if an address can claim from faucet
- `faucetAmount()` - Get faucet amount (1000 tokens)
- `faucetClaim()` - Claim tokens from faucet
- `faucetCooldown()` - Get faucet cooldown period (24 hours)
- `lastFaucetClaim(address)` - Get last claim time for an address
- `maxSupply()` - Get maximum supply (1 billion tokens)
- `totalSupplyFormatted()` - Get total supply in human-readable format

### Events:
- `FaucetClaim(address indexed to, uint256 amount)`
- `BatchMint(address[] recipients, uint256[] amounts)`
- Standard ERC20 events (Transfer, Approval)
- Ownable events (OwnershipTransferred)

### Custom Errors:
- `FaucetCooldownActive()` - When trying to claim before cooldown expires
- `MaxSupplyExceeded()` - When minting would exceed max supply
- `ArrayLengthMismatch()` - For batch operations with mismatched arrays
- `InsufficientBalance()`, `ZeroAddress()`, `ZeroAmount()` - Validation errors

## Next Steps

1. **Test the application** to ensure all USDC-related functionality works
2. **Verify contract interactions** using the ContractDebugger
3. **Test faucet functionality** with the new `faucetClaim()` function
4. **Update any deployment scripts** if they reference the old address
5. **Inform team members** about the address change and new ABI features
6. **Monitor for any issues** with the new contract integration

## Rollback Plan

If issues arise, the old address can be restored by reverting the changes in:
1. `contract-config.json` files
2. `MockUSDC.json` files
3. `contract-checker.ts`

All changes are contained within configuration and ABI files, making rollback straightforward.
