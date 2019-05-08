import React from 'react'
import styled from 'styled-components'
import { Button, Field, IconError, Text, TextInput, Info } from '@aragon/ui'
import { isAddress } from '../../web3-utils'
import { fromDecimals, toDecimals, formatBalance } from '../../utils'

// Any more and the number input field starts to put numbers in scientific notation
const MAX_INPUT_DECIMAL_BASE = 3

const initialState = {
  mode: 'wrap',
  amountField: {
    error: null,
    warning: null,
    value: '',
    max: '',
  },
  userMax: 0,
  userMaxString: '0',
}

class WrapTokensPanelContent extends React.Component {
  static defaultProps = {
    onUpdateTokens: () => {},
  }
  state = {
    ...initialState,
  }
  componentWillReceiveProps({ opened, mode, tokenBalance, erc20Balance, tokenDecimalsBase, erc20DecimalsBase  }) {
    let userMax, userMaxString
    if(mode === 'wrap'){
      userMax = Number(formatBalance(erc20Balance, erc20DecimalsBase))
    } else {
      userMax = Number(formatBalance(tokenBalance, tokenDecimalsBase))
    }
    userMaxString = userMax.toLocaleString('en', {maximumSignificantDigits : 21})
    this.setState({
      ...this.state,
      userMax: userMax,
      userMaxString: userMaxString,
    })
    // Finished closing the panel, its state can be reset
    if (!opened && this.props.opened) {
      this.setState({ ...initialState })
    }
  }

  filteredAmount() {
    const { erc20Decimals } = this.props
    const { amountField } = this.state
    console.log('ERC20 Decimals: ', erc20Decimals)
    return toDecimals(amountField.value.trim(), Number(erc20Decimals))
  }

  handleAmountChange = event => {
    const { amountField } = this.state
    this.setState({
      amountField: { ...amountField, value: event.target.value },
    })
  }

  handleSubmit = event => {
    event.preventDefault()
    const { mode } = this.props
    const { amountField, userMax } = this.state
    console.log('Amount: ', amountField.value)
    if(amountField.value <= userMax){
      console.log('1')
      this.props.onUpdateTokens({
        mode,
        amount: this.filteredAmount(),
      })
    } else {
      this.setState(({ amountField }) => ({
        amountField: {
          ...amountField,
          error: 'Not enough funds',
        },
      }))
    }
  }

  render() {
    const { amountField, userMax, userMaxString } = this.state
    const { mode, tokenSymbol, tokenDecimals, erc20Symbol, erc20Decimals } = this.props

    let symbol, minTokenStep
    if(mode === 'wrap') {
      symbol = erc20Symbol
      minTokenStep = fromDecimals(
        '1',
        Math.min(MAX_INPUT_DECIMAL_BASE, erc20Decimals)
      )
    } else {
      symbol = tokenSymbol
      minTokenStep = fromDecimals(
        '1',
        Math.min(MAX_INPUT_DECIMAL_BASE, tokenDecimals)
      )
    }

    const errorMessage = amountField.error
    const warningMessage = amountField.warning


    return (
      <div>
        <Info>
          {`You have ${userMaxString} ${symbol} available to ${mode}.`}
        </Info>
        <Form onSubmit={this.handleSubmit}>
          <Field
            label={`${symbol} to ${mode}`}
          >
            <TextInput.Number
              value={amountField.value}
              onChange={this.handleAmountChange}
              min={minTokenStep}
              max={userMax}
              disabled={amountField.value > userMax}
              step={minTokenStep}
              required
              wide
            />
          </Field>
          <Button
            mode="strong"
            type="submit"
            disabled={amountField.max === '0'}
            wide
          >
            {mode === 'wrap' ? 'Wrap' : 'Unwrap'} Tokens
          </Button>
          <Messages>
            {errorMessage && <ErrorMessage message={errorMessage} />}
            {warningMessage && <WarningMessage message={warningMessage} />}
          </Messages>
        </Form>
      </div>
    )
  }
}

const Form = styled.form`
  margin-top: 20px;
`

const Messages = styled.div`
  margin-top: 15px;
`

const WarningMessage = ({ message }) => <Info.Action>{message}</Info.Action>

const ErrorMessage = ({ message }) => (
  <Info background="rgba(251,121,121,0.06)"><IconError />
    <Text size="small" style={{ marginLeft: '10px' }}>
      {message}
    </Text>
  </Info>
)

export default WrapTokensPanelContent
