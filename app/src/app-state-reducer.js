import BN from 'bn.js'
import { hasLoadedTokenSettings } from './utils/token-settings'

// Convert tokenSupply and holders balances to BNs,
// and calculate tokenDecimalsBase.
function appStateReducer(state) {
  const appStateReady = hasLoadedTokenSettings(state)
  if (!appStateReady) {
    return {
      ...state,
      appStateReady,
    }
  }

  const {
    holders,
    maxAccountTokens,
    erc20Decimals,
    erc20Supply,
    tokenDecimals,
    tokenSupply,
  } = state

  const tokenDecimalsBase = new BN(10).pow(new BN(tokenDecimals))
  const erc20DecimalsBase = new BN(10).pow(new BN(erc20Decimals))

  return {
    ...state,
    appStateReady,
    tokenDecimalsBase,
    erc20DecimalsBase,

    // Note that numbers in `numData` are not safe for accurate computations
    // (but are useful for making divisions easier)
    numData: {
      erc20Decimals: parseInt(erc20Decimals, 10),
      erc20Supply: parseInt(erc20Supply, 10),
      tokenDecimals: parseInt(tokenDecimals, 10),
      tokenSupply: parseInt(tokenSupply, 10),
    },
    holders: holders
      ? holders
          .map((holder) => ({ ...holder, balance: new BN(holder.balance) }))
          .sort((a, b) => b.balance.cmp(a.balance))
      : [],
    erc20Decimals: new BN(erc20Decimals),
    erc20Supply: new BN(erc20Supply),
    tokenDecimals: new BN(tokenDecimals),
    tokenSupply: new BN(tokenSupply),
    maxAccountTokens: new BN(maxAccountTokens),
  }
}

export default appStateReducer
