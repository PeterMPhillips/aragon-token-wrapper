import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import BN from 'bn.js'
import {
  AppBar,
  AppView,
  Badge,
  BaseStyles,
  Button,
  PublicUrl,
  SidePanel,
  font,
  observe,
  BreakPoint,
} from '@aragon/ui'
import EmptyState from './screens/EmptyState'
import Holders from './screens/Holders'
import WrapTokensPanelContent from './components/Panels/WrapTokensPanelContent'
import MenuButton from './components/MenuButton/MenuButton'
import { networkContextType } from './provide-network'
import { hasLoadedTokenSettings, hasLoadedERC20Settings } from './token-settings'
import { makeEtherscanBaseUrl } from './utils'
import { addressesEqual } from './web3-utils'
import erc20Abi from './abi/standardToken.json'

const initialWrapTokensConfig = {
  mode: null,
}

class App extends React.Component {
  static propTypes = {
    app: PropTypes.object.isRequired,
    sendMessageToWrapper: PropTypes.func.isRequired,
  }
  static defaultProps = {
    appStateReady: false,
    holders: [],
    network: {},
    userAccount: '',
    groupMode: false,
  }
  state = {
    tokenBalance: new BN(0),
    erc20Balance: new BN(0),
    wrapTokensConfig: initialWrapTokensConfig,
    sidepanelOpened: false,
  }

  async componentWillReceiveProps({ app, userAccount, erc20Address }) {
    if(erc20Address !== undefined && userAccount != ''){
      console.log('User: ', userAccount)
      let erc20 = app.external(erc20Address, erc20Abi)

      this.setState({
        ...this.state,
        erc20Balance: new BN(await this.loadBalance(erc20, userAccount)),
        tokenBalance: this.getHolderBalance(userAccount),
      })

    }
  }

  loadBalance(erc20, address) {
    return new Promise((resolve, reject) =>
      erc20
        .balanceOf(address)
        .first()
        .subscribe(resolve, reject)
    )
  }

  static childContextTypes = {
    network: networkContextType,
  }

  getChildContext() {
    const { network } = this.props

    return {
      network: {
        etherscanBaseUrl: makeEtherscanBaseUrl(network.type),
        type: network.type,
      },
    }
  }
  getHolderBalance = address => {
    const { holders } = this.props
    const holder = holders.find(holder =>
      addressesEqual(holder.address, address)
    )
    return holder ? holder.balance : new BN('0')
  }
  handleUpdateTokens = ({ amount, mode }) => {
    const { app, erc20Address } = this.props
    console.log('Amount: ', amount)
    if (mode === 'wrap') {
      console.log('2')
      let intentParams = {
        token: { address: erc20Address, value: amount },
        // While it's generally a bad idea to hardcode gas in intents, in the case of token deposits
        // it prevents metamask from doing the gas estimation and telling the user that their
        // transaction will fail (before the approve is mined).
        // The actual gas cost is around ~180k + 20k per 32 chars of text + 80k per period
        // transition but we do the estimation with some breathing room in case it is being
        // forwarded (unlikely in deposit).
        gas:'500000'
      }
      app.wrap(amount, intentParams)
    }
    if (mode === 'unwrap') {
      app.unwrap(amount)
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
  handleMenuPanelOpen = () => {
    this.props.sendMessageToWrapper('menuPanel', true)
  }
  handleSidepanelClose = () => {
    this.setState({ sidepanelOpened: false })
  }
  handleSidepanelTransitionEnd = open => {
    if (!open) {
      this.setState({ wrapTokensConfig: initialWrapTokensConfig })
    }
  }
  render() {
    const {
      appStateReady,
      groupMode,
      holders,
      numData,
      tokenAddress,
      tokenDecimals,
      tokenDecimalsBase,
      tokenName,
      tokenSupply,
      tokenSymbol,
      erc20Address,
      erc20Decimals,
      erc20DecimalsBase,
      erc20Symbol,
      tokenTransfersEnabled,
      userAccount,
    } = this.props
    const {
      erc20Balance,
      tokenBalance,
      wrapTokensConfig,
      sidepanelOpened,
    } = this.state

    return (
      <PublicUrl.Provider url="./aragon-ui/">
        <BaseStyles />
        <Main>
          <AppView
            appBar={
              <AppBar
                title={
                  <Title>
                    <BreakPoint to="medium">
                      <MenuButton onClick={this.handleMenuPanelOpen} />
                    </BreakPoint>
                    <TitleLabel>Token Wrapper PITCH</TitleLabel>
                    {tokenSymbol && <Badge.App>{tokenSymbol}</Badge.App>}
                  </Title>
                }
                endContent={
                  <Button
                    mode="strong"
                    onClick={this.handleLaunchWrapTokens}
                  >
                    Wrap Tokens
                  </Button>
                }
              />
            }
          >
            {appStateReady && holders.length > 0 ? (
              <Holders
                holders={holders}
                tokenAddress={tokenAddress}
                tokenDecimalsBase={tokenDecimalsBase}
                tokenName={tokenName}
                tokenSupply={tokenSupply}
                tokenSymbol={tokenSymbol}
                tokenTransfersEnabled={tokenTransfersEnabled}
                userAccount={userAccount}
                onWrapTokens={this.handleLaunchWrapTokens}
                onUnwrapTokens={this.handleLaunchUnwrapTokens}
              />
            ) : (
              <EmptyState onActivate={this.handleLaunchWrapTokensNoHolder} />
            )}
          </AppView>
          <SidePanel
            title={
              wrapTokensConfig.mode === 'wrap'
                ? 'Wrap Tokens'
                : 'Unwrap Tokens'
            }
            opened={sidepanelOpened}
            onClose={this.handleSidepanelClose}
            onTransitionEnd={this.handleSidepanelTransitionEnd}
          >
            {appStateReady && (
              <WrapTokensPanelContent
                opened={sidepanelOpened}
                tokenSymbol={tokenSymbol}
                tokenBalance={tokenBalance}
                tokenDecimals={tokenDecimals}
                tokenDecimalsBase={tokenDecimalsBase}
                erc20Address={erc20Address}
                erc20Symbol={erc20Symbol}
                erc20Balance={erc20Balance}
                erc20Decimals={erc20Decimals}
                erc20DecimalsBase={erc20DecimalsBase}
                onUpdateTokens={this.handleUpdateTokens}
                {...wrapTokensConfig}
              />
            )}
          </SidePanel>
        </Main>
      </PublicUrl.Provider>
    )
  }
}

const Main = styled.div`
  height: 100vh;
`

const Title = styled.span`
  display: flex;
  align-items: center;
`

const TitleLabel = styled.span`
  margin-right: 10px;
  ${font({ size: 'xxlarge' })};
`

export default observe(
  // Convert tokenSupply and holders balances to BNs,
  // and calculate tokenDecimalsBase.
  observable =>
    observable.map(state => {
      const appStateReady = hasLoadedTokenSettings(state) && hasLoadedERC20Settings(state)
      if (!appStateReady) {
        return {
          ...state,
          appStateReady,
        }
      }

      const {
        holders,
        erc20Decimals,
        tokenDecimals,
        tokenSupply,
        tokenTransfersEnabled,
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
          tokenDecimals: parseInt(tokenDecimals, 10),
          tokenSupply: parseInt(tokenSupply, 10),
        },
        holders: holders
          ? holders
              .map(holder => ({ ...holder, balance: new BN(holder.balance) }))
              .sort((a, b) => b.balance.cmp(a.balance))
          : [],
        tokenDecimals: new BN(tokenDecimals),
        erc20Decimals: new BN(erc20Decimals),
        tokenSupply: new BN(tokenSupply),
        groupMode: tokenTransfersEnabled,
      }
    }),
  {}
)(App)
