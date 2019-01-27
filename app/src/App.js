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
import LockTokensPanelContent from './components/Panels/LockTokensPanelContent'
import MenuButton from './components/MenuButton/MenuButton'
import { networkContextType } from './provide-network'
import { erc20Settings, hasLoadedERC20Settings, hasLoadedTokenSettings } from './token-settings'
import { makeEtherscanBaseUrl } from './utils'
import { addressesEqual } from './web3-utils'
import erc20Abi from './abi/standardToken.json'


const initialLockTokensConfig = {
  mode: null,
  holderAddress: '',
}

class App extends React.Component {
  static propTypes = {
    app: PropTypes.object.isRequired,
    sendMessageToWrapper: PropTypes.func.isRequired,
  }
  static defaultProps = {
    appStateReady: false,
    erc20Processing: false,
    erc20Loaded: false,
    holders: [],
    network: {},
    userAccount: '',
    groupMode: false,
  }
  state = {
    lockTokensConfig: initialLockTokensConfig,
    sidepanelOpened: false,
  }

  async componentWillReceiveProps({ app, erc20Address }) {
    if(!this.state.erc20Processing && erc20Address){
      this.setState({ erc20Processing:true})
      let erc20 = app.external(erc20Address, erc20Abi)
      let tempData = await this.loadERC20Settings(erc20)
      let erc20DecimalsBase = new BN(10).pow(new BN(tempData.erc20Decimals))
      let erc20Data = {
        ...tempData,
        erc20DecimalsBase,
        erc20Decimals: new BN(tempData.erc20Decimals),
        erc20Supply: new BN(tempData.erc20Supply)
      }
      this.setState({
        ...this.state,
        ...erc20Data
      })
      this.setState({ erc20Loaded:true})
    }
  }
  loadERC20Settings(token) {
    return Promise.all(
      erc20Settings.map(
        ([name, key, type = 'string']) =>
          new Promise((resolve, reject) =>
            token[name]()
              .first()
              .subscribe(value => {
                resolve({ [key]: value })
              }, reject)
          )
      )
    )
      .then(settings =>
        settings.reduce((acc, setting) => ({ ...acc, ...setting }), {})
      )
      .catch(err => {
        console.error("Failed to load token's settings", err)
        // Return an empty object to try again later
        return {}
      })
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
  handleUpdateTokens = ({ holder, mode }) => {
    const { app } = this.props

    if (mode === 'assign') {
      app.mint(holder, '1')
    }
    if (mode === 'remove') {
      app.burn(holder, '1')
    }

    this.handleSidepanelClose()
  }
  handleLaunchLockTokensNoHolder = () => {
    this.handleLaunchLockTokens('')
  }
  handleLaunchLockTokens = address => {
    this.setState({
      lockTokensConfig: { mode: 'assign', holderAddress: address },
      sidepanelOpened: true,
    })
  }
  handleLaunchRemoveTokens = address => {
    this.setState({
      lockTokensConfig: { mode: 'remove', holderAddress: address },
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
      this.setState({ lockTokensConfig: initialLockTokensConfig })
    }
  }
  render() {
    const {
      appStateReady,
      erc20Address,
      groupMode,
      holders,
      lockAmount,
      maxAccountTokens,
      numData,
      tokenAddress,
      tokenDecimalsBase,
      tokenName,
      tokenSupply,
      tokenSymbol,
      tokenTransfersEnabled,
      userAccount,
    } = this.props
    const {
      erc20Loaded,
      lockTokensConfig,
      sidepanelOpened,
      erc20DecimalsBase,
      erc20Symbol,
    } = this.state
    console.log(erc20Address);
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
                    <TitleLabel>Token Locker</TitleLabel>
                    {tokenSymbol && <Badge.App>{tokenSymbol}</Badge.App>}
                  </Title>
                }
                endContent={
                  <Button
                    mode="strong"
                    onClick={this.handleLaunchLockTokensNoHolder}
                  >
                    Lock Tokens
                  </Button>
                }
              />
            }
          >
            {appStateReady && holders.length > 0 ? (
              <Holders
                holders={holders}
                groupMode={groupMode}
                maxAccountTokens={maxAccountTokens}
                tokenAddress={tokenAddress}
                tokenDecimalsBase={tokenDecimalsBase}
                tokenName={tokenName}
                tokenSupply={tokenSupply}
                tokenSymbol={tokenSymbol}
                tokenTransfersEnabled={tokenTransfersEnabled}
                userAccount={userAccount}
                onLockTokens={this.handleLaunchLockTokens}
                onRemoveTokens={this.handleLaunchRemoveTokens}
              />
            ) : (
              <EmptyState onActivate={this.handleLaunchLockTokensNoHolder} />
            )}
          </AppView>
          <SidePanel
            title={
              lockTokensConfig.mode === 'assign'
                ? 'Lock tokens'
                : 'Unlock tokens'
            }
            opened={sidepanelOpened}
            onClose={this.handleSidepanelClose}
            onTransitionEnd={this.handleSidepanelTransitionEnd}
          >
            {appStateReady && erc20Loaded && (
              <LockTokensPanelContent
                opened={sidepanelOpened}
                tokenDecimals={numData.tokenDecimals}
                tokenDecimalsBase={tokenDecimalsBase}
                erc20Address={erc20Address}
                erc20DecimalsBase={erc20DecimalsBase}
                erc20Symbol={erc20Symbol}
                onUpdateTokens={this.handleUpdateTokens}
                getHolderBalance={this.getHolderBalance}
                maxAccountTokens={maxAccountTokens}
                lockAmount={lockAmount}
                {...lockTokensConfig}
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
      const appStateReady = hasLoadedTokenSettings(state)
      if (!appStateReady) {
        return {
          ...state,
          appStateReady,
        }
      }

      const {
        holders,
        lockAmount,
        maxAccountTokens,
        tokenDecimals,
        tokenSupply,
        tokenTransfersEnabled,
      } = state
      const tokenDecimalsBase = new BN(10).pow(new BN(tokenDecimals))
      return {
        ...state,
        appStateReady,
        tokenDecimalsBase,
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
        tokenSupply: new BN(tokenSupply),
        maxAccountTokens: new BN(maxAccountTokens),
        lockAmount: new BN(lockAmount),
        groupMode: tokenTransfersEnabled && maxAccountTokens === '1',
      }
    }),
  {}
)(App)
