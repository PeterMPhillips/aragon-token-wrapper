const tokenSettings = [
  ['decimals', 'tokenDecimals', 'bignumber'],
  ['symbol', 'tokenSymbol', 'string'],
  ['name', 'tokenName', 'string'],
  ['totalSupply', 'tokenSupply', 'bignumber'],
  ['transfersEnabled', 'tokenTransfersEnabled', 'bool'],
]

export const erc20Settings = [
  ['decimals', 'erc20Decimals', 'bignumber'],
  ['symbol', 'erc20Symbol', 'string'],
  ['name', 'erc20Name', 'string'],
  ['totalSupply', 'erc20Supply', 'bignumber'],
]

export function hasLoadedTokenSettings(state) {
  state = state || {}
  return tokenSettings.reduce(
    // Use null check as totalSupply may be 0
    (loaded, [_, key]) => loaded && state[key] != null,
    true
  )
}

export function hasLoadedERC20Settings(state) {
  state = state || {}
  return erc20Settings.reduce(
    // Use null check as totalSupply may be 0
    (loaded, [_, key]) => loaded && state[key] != null,
    true
  )
}

export default tokenSettings
