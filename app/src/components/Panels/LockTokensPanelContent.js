import React from 'react'
import styled from 'styled-components'
import { Button, RadioList, Field, IconCross, Text, TextInput, Info } from '@aragon/ui'
import { isAddress } from '../../web3-utils'
import { fromDecimals, toDecimals, formatBalance } from '../../utils'

// Any more and the number input field starts to put numbers in scientific notation
const MAX_INPUT_DECIMAL_BASE = 6

const initialState = {
  mode: 'lock',
  selected: 0,
  items: [],
  erc20Symbol: 'ERC-20',
  tokenSymbol: 'Voting Tokens',
  holderBalance: 0,
  lockAmount: 0,
  actionAmount: 0,
  error: null,
  warning: null,
}

class LockTokensPanelContent extends React.Component {
  static defaultProps = {
    onUpdateTokens: () => {},
  }
  state = {
    ...initialState,
  }
  componentWillReceiveProps({ opened, mode, holderAddress }) {
    if (opened && !this.props.opened) {
      // setTimeout is needed as a small hack to wait until the input is
      // on-screen before we call focus
      //this.holderInput && setTimeout(() => this.holderInput.focus(), 0)

      // Update holder address from the props
      this.updateHolderAddress(mode, holderAddress)
    }

    // Finished closing the panel, its state can be reset
    if (!opened && this.props.opened) {
      this.setState({ ...initialState })
    }
  }
  updateHolderAddress(mode, value) {
    const {
      tokenSymbol,
      erc20Symbol,
      erc20DecimalsBase,
      getHolderBalance,
      lockAmount,
      lockIntervals,
      tokenIntervals
    } = this.props

    const holderBalance = getHolderBalance(value.trim())
    let items = [];
    if(mode === 'lock'){
      let amount;
      for(var i=0; i<lockIntervals.length; i++){
        amount = tokenIntervals[i] - holderBalance;
        items.push({
          title: `Lock for ${lockIntervals[i]} months`,
          description: `Lock ${formatBalance(lockAmount, erc20DecimalsBase)} ${erc20Symbol} for ${lockIntervals[i]} months, receive ${amount < 0 ? 0 : amount} ${tokenSymbol}.`
        })
      }
    }
    this.setState({
      items: items,
      erc20Symbol: erc20Symbol,
      tokenSymbol: tokenSymbol,
      holderBalance: holderBalance,
      lockAmount: lockAmount
    })
  }
  handleChange = index => {
    console.log(`Selected radio at index: ${index}`)
    const { tokenIntervals } = this.props
    const { holderBalance } = this.state
    let amount = tokenIntervals[index] - holderBalance;
    console.log(tokenIntervals[index])
    console.log(amount)
    if (amount < 0) amount = 0

    this.setState({
      selected: index,
      actionAmount: amount
    })
  }
  handleSubmit = event => {
    event.preventDefault()
    const { mode, lockIntervals } = this.props
    const { selected } = this.state

    this.props.onUpdateTokens({
      mode,
      time: lockIntervals[selected],
    })
  }
  render() {
    const { items, selected, erc20Symbol, tokenSymbol, holderBalance, lockAmount, actionAmount, error, warning } = this.state
    const { mode, erc20DecimalsBase } = this.props

    const errorMessage = error
    const warningMessage = warning

    return (
      <div>
        <form onSubmit={this.handleSubmit}>
          {mode === 'lock'  && (
            <RadioList
              title="Lock Time"
              description="By locking your tokens you can increase your voting power"
              items={items}
              selected={selected}
              onSelect={this.handleChange}
            />
          )}
          {mode === 'unlock'  && (
            <div>
              <Field label={`${erc20Symbol} Tokens to unlock: ${formatBalance(lockAmount, erc20DecimalsBase)}`}></Field>
              <Field label={`${tokenSymbol} Tokens burned: ${holderBalance}`}></Field>
            </div>
          )}
          <br/>
          <Button
            mode="strong"
            type="submit"
            disabled={actionAmount === '0'}
            wide
          >
            {mode === 'lock' ? 'Lock' : 'Unlock'} Tokens
          </Button>
          <Messages>
            {errorMessage && <ErrorMessage message={errorMessage} />}
            {warningMessage && <WarningMessage message={warningMessage} />}
          </Messages>
        </form>
      </div>
    )
  }
}

const Messages = styled.div`
  margin-top: 15px;
`

const WarningMessage = ({ message }) => <Info.Action>{message}</Info.Action>

const ErrorMessage = ({ message }) => (
  <p>
    <IconCross />
    <Text size="small" style={{ marginLeft: '10px' }}>
      {message}
    </Text>
  </p>
)

export default LockTokensPanelContent
