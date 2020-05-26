import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import BN from 'bn.js'
import { Main, SyncIndicator } from '@aragon/ui'
import { useConnectedAccount, useAragonApi } from '@aragon/api-react'
import AppHeader from './components/AppHeader'
import { IdentityProvider } from './components/IdentityManager/IdentityManager'
import TokenPanel from './components/TokenPanel/TokenPanel'
import EmptyState from './screens/EmptyState'
import Holders from './screens/Holders'
import { addressesEqual } from './utils/web3-utils'
import erc20Abi from './abi/standardToken.json'

const initialWrapTokensConfig = {
  mode: null,
  holderAddress: '',
}

class App extends React.PureComponent {
  static propTypes = {
    appStateReady: PropTypes.bool.isRequired,
    api: PropTypes.object,
    erc20Address: PropTypes.string,
    erc20Balance: PropTypes.instanceOf(BN),
    erc20Decimals: PropTypes.instanceOf(BN),
    erc20DecimalsBase: PropTypes.instanceOf(BN),
    erc20Supply: PropTypes.instanceOf(BN),
    erc20Symbol: PropTypes.string,
    holders: PropTypes.array,
    numData: PropTypes.object,
    isSyncing: PropTypes.bool,
    tokenAddress: PropTypes.string,
    tokenDecimals: PropTypes.instanceOf(BN),
    tokenDecimalsBase: PropTypes.instanceOf(BN),
    tokenName: PropTypes.string,
    tokenSupply: PropTypes.instanceOf(BN),
    tokenSymbol: PropTypes.string,
    tokenTransfersEnabled: PropTypes.bool,
  }

  static defaultProps = {
    appStateReady: false,
    erc20Balance: 0,
    isSyncing: true,
    holders: [],
  }

  state = {
    wrapTokensConfig: initialWrapTokensConfig,
    sidepanelOpened: false,
  }

  getHolderBalance = (address) => {
    const { holders } = this.props
    const holder = holders.find((holder) =>
      addressesEqual(holder.address, address)
    )
    return holder ? holder.balance : new BN('0')
  }

  handleUpdateTokens = ({ amount, mode }) => {
    const { api, erc20Address } = this.props

    // Don't care about responses
    if (mode === 'wrap') {
      const intentParams = {
        token: { address: erc20Address, value: amount },
        // While it's generally a bad idea to hardcode gas in intents, in the case of token deposits
        // it prevents metamask from doing the gas estimation and telling the user that their
        // transaction will fail (before the approve is mined).
        // The actual gas cost is around ~180k + 20k per 32 chars of text + 80k per period
        // transition but we do the estimation with some breathing room in case it is being
        // forwarded (unlikely in deposit).
        gas: '500000',
      }
      api.wrap(amount, intentParams).toPromise()
    }
    if (mode === 'unwrap') {
      api.unwrap(amount).toPromise()
    }

    this.handleSidepanelClose()
  }

  handleLaunchWrapTokens = () => {
    this.setState({
      wrapTokensConfig: { mode: 'wrap' },
      sidepanelOpened: true,
    })
  }

  handleLaunchUnwrapTokens = () => {
    this.setState({
      wrapTokensConfig: { mode: 'unwrap' },
      sidepanelOpened: true,
    })
  }

  handleSidepanelClose = () => {
    this.setState({ sidepanelOpened: false })
  }

  handleSidepanelTransitionEnd = (open) => {
    if (!open) {
      this.setState({ wrapTokensConfig: initialWrapTokensConfig })
    }
  }

  handleResolveLocalIdentity = (address) => {
    return this.props.api.resolveAddressIdentity(address).toPromise()
  }

  handleShowLocalIdentityModal = (address) => {
    return this.props.api
      .requestAddressIdentityModification(address)
      .toPromise()
  }

  render() {
    const {
      appStateReady,
      erc20Balance,
      erc20DecimalsBase,
      erc20Symbol,
      erc20Supply,
      holders,
      isSyncing,
      numData,
      tokenAddress,
      tokenDecimalsBase,
      tokenName,
      tokenSupply,
      tokenSymbol,
      tokenTransfersEnabled,
    } = this.props

    const { wrapTokensConfig, sidepanelOpened } = this.state

    return (
      <IdentityProvider
        onResolve={this.handleResolveLocalIdentity}
        onShowLocalIdentityModal={this.handleShowLocalIdentityModal}
      >
        <SyncIndicator visible={isSyncing} />

        {!isSyncing && appStateReady && holders.length === 0 && (
          <EmptyState onWrapTokens={this.handleLaunchWrapTokens} />
        )}
        {appStateReady && holders.length !== 0 && (
          <>
            <AppHeader
              onWrapTokens={this.handleLaunchWrapTokens}
              tokenSymbol={tokenSymbol}
            />
            <Holders
              erc20Balance={erc20Balance}
              erc20Supply={erc20Supply}
              erc20Symbol={erc20Symbol}
              holders={holders}
              tokenAddress={tokenAddress}
              tokenDecimalsBase={tokenDecimalsBase}
              tokenName={tokenName}
              tokenSupply={tokenSupply}
              tokenSymbol={tokenSymbol}
              tokenTransfersEnabled={tokenTransfersEnabled}
              onWrapTokens={this.handleLaunchWrapTokens}
              onUnwrapTokens={this.handleLaunchUnwrapTokens}
            />
          </>
        )}

        {appStateReady && (
          <TokenPanel
            erc20Balance={erc20Balance}
            erc20Decimals={numData.erc20Decimals}
            erc20DecimalsBase={erc20DecimalsBase}
            erc20Symbol={erc20Symbol}
            getHolderBalance={this.getHolderBalance}
            holderAddress={wrapTokensConfig.holderAddress}
            mode={wrapTokensConfig.mode}
            onClose={this.handleSidepanelClose}
            onTransitionEnd={this.handleSidepanelTransitionEnd}
            onUpdateTokens={this.handleUpdateTokens}
            opened={sidepanelOpened}
            tokenDecimals={numData.tokenDecimals}
            tokenDecimalsBase={tokenDecimalsBase}
            tokenSymbol={tokenSymbol}
          />
        )}
      </IdentityProvider>
    )
  }
}

export default () => {
  const [erc20Balance, setERC20Balance] = useState(new BN(0))
  const connectedAccount = useConnectedAccount()
  const { api, appState, guiStyle } = useAragonApi()
  const { appearance, theme } = guiStyle

  useEffect(() => {
    async function loadBalance() {
      const erc20 = api.external(appState.erc20Address, erc20Abi)
      const balance = new BN(
        await erc20.balanceOf(connectedAccount).toPromise()
      )
      setERC20Balance(balance)
    }

    if (api && appState.erc20Address) loadBalance()
  }, [api, appState, connectedAccount])

  return (
    <Main assetsUrl="./aragon-ui" theme={theme || appearance}>
      <App api={api} erc20Balance={erc20Balance} {...appState} />
    </Main>
  )
}
