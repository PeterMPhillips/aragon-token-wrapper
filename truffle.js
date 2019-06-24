/**
 * https://github.com/aragon/aragonOS/blob/v4.0.0/truffle-config.js
 */
const homedir = require('homedir')
const path = require('path')

const HDWalletProvider = require('truffle-hdwallet-provider')
const HDWalletProviderPrivkey = require('truffle-hdwallet-provider-privkey')

const DEFAULT_MNEMONIC = 'explain tackle mirror kit van hammer degree position ginger unfair soup bonus'

const defaultRPC = (network) =>
  `https://${network}.infura.io`

const configFilePath = (filename) => {
	console.log(">>> configFilePath:", path.join(homedir(), `.aragon/${filename}`))
	return path.join(homedir(), `.aragon/${filename}`)
}

const mnemonic = () => {
  try {
	console.log(">>> try:", configFilePath('mnemonic.json'))
    return require(configFilePath('mnemonic.json')).mnemonic
  } catch (e) {
	console.log(">>> catch:", e)
    return DEFAULT_MNEMONIC
  }
}

const settingsForNetwork = (network) => {
  try {
    return require(configFilePath(`${network}_key.json`))
  } catch (e) {
    return { }
  }
}

// Lazily loaded provider
const providerForNetwork = (network) => (
  () => {
    let { rpc, keys } = settingsForNetwork(network)
    rpc = rpc || defaultRPC(network)

	console.log("keys: ", keys)
	console.log("rpc: ", rpc)
    if (!keys || keys.length == 0) {
		console.log("here: ", rpc)
      return new HDWalletProvider(mnemonic(), rpc)
    }

    return new HDWalletProviderPrivkey(keys, rpc)
  }
)
module.exports = {
  networks: {
    rpc: {
      host: 'localhost',
      port: 8545,
      network_id: '*'
    },
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*'
    },
    mainnet: {
      network_id: 1,
      provider: providerForNetwork('mainnet')
    },
    rinkeby: {
      network_id: 4,
      provider: providerForNetwork('rinkeby')
    }
  },
  compilers: {
    solc: {
        version: "0.4.24"
    }
  }
}
