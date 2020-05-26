import 'core-js/stable'
import 'regenerator-runtime/runtime'
import Aragon, { events } from '@aragon/api'
import {
  tokenSettings,
  erc20Settings,
  hasLoadedTokenSettings,
  hasLoadedERC20Settings,
} from './utils/token-settings'
import { addressesEqual } from './utils/web3-utils'
import tokenAbi from './abi/minimeToken.json'
import erc20Abi from './abi/standardToken.json'

const app = new Aragon()

/*
 * Calls `callback` exponentially, everytime `retry()` is called.
 *
 * Usage:
 *
 * retryEvery(retry => {
 *  // do something
 *
 *  if (condition) {
 *    // retry in 1, 2, 4, 8 seconds… as long as the condition passes.
 *    retry()
 *  }
 * }, 1000, 2)
 *
 */
const retryEvery = (callback, initialRetryTimer = 1000, increaseFactor = 5) => {
  const attempt = (retryTimer = initialRetryTimer) => {
    // eslint-disable-next-line standard/no-callback-literal
    callback(() => {
      console.error(`Retrying in ${retryTimer / 1000}s...`)

      // Exponentially backoff attempts
      setTimeout(() => attempt(retryTimer * increaseFactor), retryTimer)
    })
  }
  attempt()
}

// Get the token address to initialize ourselves
retryEvery(() => {
  let tokenAddress, erc20Address

  app
    .call('token')
    .toPromise()
    .then(function (result) {
      tokenAddress = result
      app
        .call('erc20')
        .toPromise()
        .then(function (result) {
          erc20Address = result
          initialize(tokenAddress, erc20Address)
          return true
        })
        .catch((err) => {
          console.error(
            'Could not start background script execution due to the contract not loading the erc20:',
            err
          )
        })
      return true
    })
    .catch((err) => {
      console.error(
        'Could not start background script execution due to the contract not loading the token:',
        err
      )
    })
})

async function initialize(tokenAddress, erc20Address) {
  const token = app.external(tokenAddress, tokenAbi)
  const erc20 = app.external(erc20Address, erc20Abi)

  function reducer(state, { event, returnValues }) {
    const nextState = {
      ...state,
    }

    try {
      switch (event) {
        case 'Transfer':
          return transfer(token, nextState, returnValues)
        case events.SYNC_STATUS_SYNCING:
          return { ...nextState, isSyncing: true }
        case events.SYNC_STATUS_SYNCED:
          return { ...nextState, isSyncing: false }
        default:
          return state
      }
    } catch (err) {
      console.error(err)
    }
  }

  const storeOptions = {
    externals: [{ contract: token }],
    init: initState({ token, tokenAddress, erc20, erc20Address }),
  }

  return app.store(reducer, storeOptions)
}

/***********************
 *                     *
 *   Event Handlers    *
 *                     *
 ***********************/

function initState({ token, tokenAddress, erc20, erc20Address }) {
  return async (cachedState) => {
    try {
      const tokenSymbol = await loadTokenSymbol(token)
      app.identify(tokenSymbol)
    } catch (err) {
      console.error(
        `Failed to load token symbol for token at ${tokenAddress} due to:`,
        err
      )
    }
    const tokenSettings = hasLoadedTokenSettings(cachedState)
      ? {}
      : await loadTokenSettings(token)
    const erc20Settings = hasLoadedERC20Settings(cachedState)
      ? {}
      : await loadERC20Settings(erc20)

    return {
      ...cachedState,
      isSyncing: true,
      tokenAddress,
      erc20Address,
      ...tokenSettings,
      ...erc20Settings,
    }
  }
}

async function transfer(token, state, { _from, _to }) {
  const changes = await loadNewBalances(token, _from, _to)
  // The transfer may have increased the token's total supply, so let's refresh it
  const tokenSupply = await loadTokenSupply(token)
  return updateState(
    {
      ...state,
      tokenSupply,
    },
    changes
  )
}

/***********************
 *                     *
 *       Helpers       *
 *                     *
 ***********************/

function updateState(state, changes) {
  const { holders = [] } = state
  return {
    ...state,
    holders: changes
      .reduce(updateHolders, holders)
      // Filter out any addresses that now have no balance
      .filter(({ balance }) => balance > 0),
  }
}

function updateHolders(holders, changed) {
  const holderIndex = holders.findIndex((holder) =>
    addressesEqual(holder.address, changed.address)
  )

  if (holderIndex === -1) {
    // If we can't find it, concat
    return holders.concat(changed)
  } else {
    const nextHolders = Array.from(holders)
    nextHolders[holderIndex] = changed
    return nextHolders
  }
}

function loadNewBalances(token, ...addresses) {
  return Promise.all(
    addresses.map(
      (address) =>
        new Promise((resolve, reject) =>
          token
            .balanceOf(address)
            .toPromise()
            .then((balance) => resolve({ address, balance }))
            .catch(reject)
        )
    )
  ).catch((err) => {
    console.error(
      `Failed to load new balances for ${addresses.join(', ')} due to:`,
      err
    )
    // Return an empty object to avoid changing any state
    // TODO: ideally, this would actually cause the UI to show "unknown" for the address
    return {}
  })
}

function loadTokenSymbol(token) {
  return token.symbol().toPromise()
}

function loadTokenSupply(token) {
  return token.totalSupply().toPromise()
}

function loadTokenSettings(token) {
  return Promise.all(
    tokenSettings.map(
      ([name, key, type = 'string']) =>
        new Promise((resolve, reject) =>
          token[name]()
            .toPromise()
            .then((value) => {
              resolve({ [key]: value })
              return true
            })
            .catch(reject)
        )
    )
  )
    .then((settings) =>
      settings.reduce((acc, setting) => ({ ...acc, ...setting }), {})
    )
    .catch((err) => {
      console.error("Failed to load token's settings", err)
      // Return an empty object to try again later
      return {}
    })
}

function loadERC20Settings(erc20) {
  return Promise.all(
    erc20Settings.map(
      ([name, key, type = 'string']) =>
        new Promise((resolve, reject) =>
          erc20[name]()
            .toPromise()
            .then((value) => {
              resolve({ [key]: value })
              return true
            })
            .catch(reject)
        )
    )
  )
    .then((settings) =>
      settings.reduce((acc, setting) => ({ ...acc, ...setting }), {})
    )
    .catch((err) => {
      console.error("Failed to load erc20's settings", err)
      // Return an empty object to try again later
      return {}
    })
}
