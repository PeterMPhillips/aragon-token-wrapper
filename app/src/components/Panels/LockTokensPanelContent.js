import React from 'react'
import styled from 'styled-components'
import { Button, Field, IconCross, Text, TextInput, Info } from '@aragon/ui'
import { isAddress } from '../../web3-utils'
import { fromDecimals, toDecimals, formatBalance } from '../../utils'

// Any more and the number input field starts to put numbers in scientific notation
const MAX_INPUT_DECIMAL_BASE = 6

const initialState = {
  mode: 'assign',
  holderField: {
    error: null,
    warning: null,
    value: '',
  },
  amountField: {
    error: null,
    warning: null,
    value: '1',
  },
  lockField: {
    symbol: 'ERC-20',
    value: '1',
  }
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
      this.holderInput && setTimeout(() => this.holderInput.focus(), 0)

      // Upadte holder address from the props
      this.updateHolderAddress(mode, holderAddress)
    }

    // Finished closing the panel, its state can be reset
    if (!opened && this.props.opened) {
      this.setState({ ...initialState })
    }
  }
  filteredHolderAddress() {
    const { holderField } = this.state
    return holderField.value.trim()
  }
  filteredAmount() {
    const { tokenDecimals } = this.props
    const { amountField } = this.state
    return toDecimals(amountField.value.trim(), tokenDecimals)
  }
  updateHolderAddress(mode, value) {
    const {
      erc20Address,
      erc20DecimalsBase,
      erc20Symbol,
      getHolderBalance,
      lockAmount,
      maxAccountTokens,
      tokenDecimalsBase,
      tokenDecimals,
    } = this.props

    const holderBalance = getHolderBalance(value.trim())
    const maxAmount =
      mode === 'assign' ? maxAccountTokens.sub(holderBalance) : holderBalance
    this.setState(({ holderField, amountField, lockField }) => ({
      holderField: { ...holderField, value, error: null },
      amountField: {
        ...amountField,
        value: formatBalance(maxAmount, tokenDecimalsBase, tokenDecimals),
        warning:
          maxAmount.isZero() &&
          (mode === 'assign'
            ? `
              The maximum amount of tokens that can be assigned has already been
              reached.
            `
            : `
              This account doesn’t have any tokens to remove.
            `),
      },
      lockField: {
        symbol: erc20Symbol,
        value: (maxAmount.isZero() ? '0' : formatBalance(lockAmount, erc20DecimalsBase) )
      }
    }))
  }
  handleHolderChange = event => {
    this.updateHolderAddress(this.props.mode, event.target.value)
  }
  handleSubmit = event => {
    event.preventDefault()
    const { mode } = this.props
    const holderAddress = this.filteredHolderAddress()

    const holderError =
      !isAddress(holderAddress) &&
      `
        ${mode === 'assign' ? 'Recipient' : 'Account'}
        must be a valid Ethereum address.
      `

    if (isAddress(holderAddress)) {
      this.props.onUpdateTokens({
        mode,
        holder: holderAddress,
      })
    } else {
      this.setState(({ holderField }) => ({
        holderField: {
          ...holderField,
          error: holderError,
        },
      }))
    }
  }
  render() {
    const { holderField, amountField, lockField } = this.state
    const { mode, tokenDecimals } = this.props

    const minTokenStep = fromDecimals(
      '1',
      Math.min(MAX_INPUT_DECIMAL_BASE, tokenDecimals)
    )

    const errorMessage = holderField.error || amountField.error
    const warningMessage = holderField.warning || amountField.warning

    return (
      <div>
        <form onSubmit={this.handleSubmit}>
          <Field
            label={`
              ${mode === 'assign' ? 'Recipient' : 'Account'}
              (must be a valid Ethereum address)
            `}
          >
            <TextInput
              innerRef={element => (this.holderInput = element)}
              value={holderField.value}
              onChange={this.handleHolderChange}
              wide
            />
          </Field>

          <Field
            label={`
              ${lockField.symbol} Tokens to ${mode === 'assign' ? 'lock' : 'unlock'}: ${lockField.value}
            `}
          ></Field>

          <Field
            label={`
              Voting Tokens ${mode === 'assign' ? 'received' : 'burnt'}: ${amountField.value}
            `}
          ></Field>
          <Button
            mode="strong"
            type="submit"
            disabled={amountField.value === '0'}
            wide
          >
            {mode === 'assign' ? 'Lock' : 'Unlock'} Tokens
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
