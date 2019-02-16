var TokenWrapper = artifacts.require('TokenWrapper.sol')

module.exports = function (deployer) {
  deployer.deploy(TokenWrapper)
}
