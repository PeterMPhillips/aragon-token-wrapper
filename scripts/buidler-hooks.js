/*
 * These hooks are called by the Aragon Buidler plugin during the start task's lifecycle. Use them to perform custom tasks at certain entry points of the development build process, like deploying a token before a proxy is initialized, etc.
 *
 * Link them to the main buidler config file (buidler.config.js) in the `aragon.hooks` property.
 *
 * All hooks receive two parameters:
 * 1) A params object that may contain other objects that pertain to the particular hook.
 * 2) A "bre" or BuidlerRuntimeEnvironment object that contains enviroment objects like web3, Truffle artifacts, etc.
 *
 * Please see AragonConfigHooks, in the plugin's types for further details on these interfaces.
 * https://github.com/aragon/buidler-aragon/blob/develop/src/types.ts#L31
 */

 let voting, erc20, minime, accounts, aclAddress

 const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
 const ANY_ADDRESS = '0xffffffffffffffffffffffffffffffffffffffff'
 const TOKEN_DECIMALS = 18
 const TOKEN_SUPPLY = 1000

module.exports = {
  // Called before a dao is deployed.
  preDao: async ({ log }, { web3, artifacts }) => {},

  // Called after a dao is deployed.
  postDao: async (
    { dao, _experimentalAppInstaller, log },
    { web3, artifacts }
  ) => {
    aclAddress = await dao.acl()

    const bigExp = (x, y) =>
      web3.utils
        .toBN(x)
        .mul(web3.utils.toBN(10).pow(web3.utils.toBN(y)))

    const pct16 = (x) => bigExp(x, 16)

    // Retrieve accounts.
    accounts = await web3.eth.getAccounts()

    // Deploy an erc20 token
    const tokenSupply = bigExp(TOKEN_SUPPLY, TOKEN_DECIMALS)
    erc20 = await _deployERC20(artifacts, tokenSupply)
    log(`> ERC20 token deployed: ${erc20.address}`)

    // Deploy a minime token
    minime = await _deployMinimeToken(artifacts)
    log(`> Minime token deployed: ${minime.address}`)

    voting = await _experimentalAppInstaller('voting', {
      initializeArgs: [
        minime.address,
        pct16(50), // support 50%
        pct16(25), // quorum 15%
        300 // 5 minutes
      ],
    })
    log(`> Voting app installed: ${voting.address}`)
  },

  // Called after the app's proxy is created, but before it's initialized.
  preInit: async (
    { proxy, _experimentalAppInstaller, log },
    { web3, artifacts }
  ) => {
    await minime.changeController(proxy.address)
    log(`> Change minime controller to tokens app`)
  },

  // Called after the app's proxy is initialized.
  postInit: async (
    { proxy, _experimentalAppInstaller, log },
    { web3, artifacts }
  ) => {

  },

  // Called when the start task needs to know the app proxy's init parameters.
  // Must return an array with the proxy's init parameters.
  getInitParams: async ({ log }, { web3, artifacts }) => {
    return [minime.address, erc20.address, true]
  },

  // Called to setup app permissions
  setupPermissions: async (
    { dao, proxy, createPermission, log},
    { web3, artifacts }
  ) => {
    const role = await proxy.BAN_ROLE()
    createPermission(voting.address, role)
    await voting.createPermission('CREATE_VOTES_ROLE', proxy.address)
  },

  // Called after the app's proxy is updated with a new implementation.
  postUpdate: async ({ proxy, log }, { web3, artifacts }) => {},
}

async function _deployERC20(artifacts, tokenSupply) {
  const ERC20 = await artifacts.require('StandardToken')
  const erc20 = await ERC20.new(
    'Token',
    'TKN',
    TOKEN_DECIMALS,
    tokenSupply
  )
  return erc20
}
async function _deployMinimeToken(artifacts) {
  const MiniMeTokenFactory = await artifacts.require('MiniMeTokenFactory')
  const MiniMeToken = await artifacts.require('MiniMeToken')
  const factory = await MiniMeTokenFactory.new()
  const token = await MiniMeToken.new(
    factory.address,
    ZERO_ADDRESS,
    0,
    'Wrapped Token',
    TOKEN_DECIMALS,
    'WTKN',
    true
  )
  return token
}
