import React, { useCallback, useState } from 'react'
import PropTypes from 'prop-types'
import BN from 'bn.js'
import { useConnectedAccount } from '@aragon/api-react'
import {
  Button,
  Field,
  GU,
  Info,
  SidePanel,
  TextInput,
  useSidePanelFocusOnReady,
} from '@aragon/ui'
import {
  fromDecimals,
  toDecimals,
  formatBalance,
  splitDecimalNumber,
} from '../../utils/utils'

// Any more and the number input field starts to put numbers in scientific notation
const MAX_INPUT_DECIMAL_BASE = 6

function UpdateTokenPanel({
  erc20Balance,
  erc20Decimals,
  erc20DecimalsBase,
  erc20Symbol,
  getHolderBalance,
  mode,
  onClose,
  onTransitionEnd,
  onUpdateTokens,
  opened,
  tokenDecimals,
  tokenDecimalsBase,
  tokenSymbol,
}) {
  return (
    <SidePanel
      title={mode === 'wrap' ? 'Wrap tokens' : 'Unwrap tokens'}
      opened={opened}
      onClose={onClose}
      onTransitionEnd={onTransitionEnd}
    >
      <TokenPanelContent
        erc20Balance={erc20Balance}
        erc20Decimals={erc20Decimals}
        erc20DecimalsBase={erc20DecimalsBase}
        erc20Symbol={erc20Symbol}
        getHolderBalance={getHolderBalance}
        mode={mode}
        onUpdateTokens={onUpdateTokens}
        opened={opened}
        tokenDecimals={tokenDecimals}
        tokenDecimalsBase={tokenDecimalsBase}
        tokenSymbol={tokenSymbol}
      />
    </SidePanel>
  )
}

UpdateTokenPanel.propTypes = {
  erc20Balance: PropTypes.object,
  erc20Decimals: PropTypes.object,
  erc20DecimalsBase: PropTypes.object,
  erc20Symbol: PropTypes.string,
  getHolderBalance: PropTypes.func,
  mode: PropTypes.string,
  onClose: PropTypes.func,
  onTransitionEnd: PropTypes.func,
  onUpdateTokens: PropTypes.func,
  opened: PropTypes.bool,
  tokenDecimals: PropTypes.object,
  tokenDecimalsBase: PropTypes.object,
  tokenSymbol: PropTypes.string,
}

function usePanelForm({
  erc20Balance,
  erc20Decimals,
  erc20DecimalsBase,
  erc20Symbol,
  getHolderBalance,
  mode,
  tokenDecimals,
  tokenDecimalsBase,
  tokenSymbol,
}) {
  const connectedAccount = useConnectedAccount()
  const [amountField, setAmountField] = useState({
    error: null,
    max: '',
    value: '',
    warning: null,
  })

  const errorMessage = amountField.error
  const warningMessage = amountField.warning

  const submitDisabled = Boolean(
    errorMessage ||
      warningMessage ||
      !amountField.value ||
      amountField.max === '0' ||
      amountField.value === '0'
  )

  const holderBalance = getHolderBalance(connectedAccount)

  const getMaxAmountFromBalance = useCallback(
    () => (mode === 'wrap' ? erc20Balance : holderBalance),
    [mode, erc20Balance, holderBalance]
  )

  const updateAmount = useCallback(
    (value) => {
      const formattedAmount =
        mode === 'wrap'
          ? toDecimals(value.trim(), erc20Decimals)
          : toDecimals(value.trim(), tokenDecimals)

      if (formattedAmount === '0') {
        // Given value is smaller than the accepted decimal base (e.g. gave 0.5 to a token base of 1)
        setAmountField((amountField) => ({
          ...amountField,
          value,
          warning: `You are trying to ${
            mode === 'wrap' ? 'wrap' : 'unwrap'
          } an amount that is smaller than the minimum amount of tokens possible.`,
        }))
        return
      }

      const decimals = splitDecimalNumber(value.trim())[1]
      if (decimals.length > tokenDecimals) {
        // Given value has more precision than we expected
        setAmountField((amountField) => ({
          ...amountField,
          value,
          warning: `You are trying to ${
            mode === 'wrap' ? 'wrap' : 'unwrap'
          } an amount that includes more decimals than the token allows.`,
        }))
        return
      }

      const amount = new BN(formattedAmount)
      const maxAmount = getMaxAmountFromBalance(holderBalance)

      setAmountField((amountField) => ({
        ...amountField,
        value,
        warning: amount.gt(maxAmount)
          ? `You are trying to ${
              mode === 'wrap' ? 'wrap' : 'unwrap'
            } an amount that is greater than the
             maximum amount of tokens that can be ${
               mode === 'wrap'
                 ? `wrapped (${formatBalance(
                     erc20Balance,
                     erc20DecimalsBase,
                     erc20Decimals
                   )}  ${erc20Symbol})`
                 : `unwrapped (${formatBalance(
                     holderBalance,
                     tokenDecimalsBase,
                     tokenDecimals
                   )}  ${tokenSymbol})`
             }`
          : null,
      }))
    },
    [
      erc20Balance,
      erc20Decimals,
      erc20DecimalsBase,
      erc20Symbol,
      mode,
      holderBalance,
      tokenDecimals,
      tokenDecimalsBase,
      tokenSymbol,
      getMaxAmountFromBalance,
    ]
  )

  const validateFields = useCallback(() => {
    return {
      amount:
        mode === 'wrap'
          ? toDecimals(amountField.value.trim(), erc20Decimals)
          : toDecimals(amountField.value.trim(), tokenDecimals),
    }
  }, [mode, amountField, erc20Decimals, tokenDecimals])

  return {
    amountField,
    errorMessage,
    submitDisabled,
    updateAmount,
    validateFields,
    warningMessage,
    holderBalance,
  }
}

function TokenPanelContent({
  erc20Balance,
  erc20Decimals,
  erc20DecimalsBase,
  erc20Symbol,
  getHolderBalance,
  mode,
  onUpdateTokens,
  tokenDecimals,
  tokenDecimalsBase,
  tokenSymbol,
}) {
  const amountInputRef = useSidePanelFocusOnReady()

  const {
    amountField,
    errorMessage,
    holderBalance,
    submitDisabled,
    updateAmount,
    validateFields,
    warningMessage,
  } = usePanelForm({
    erc20Balance,
    erc20Decimals,
    erc20DecimalsBase,
    erc20Symbol,
    getHolderBalance,
    mode,
    onUpdateTokens,
    tokenDecimals,
    tokenDecimalsBase,
    tokenSymbol,
  })

  const tokenStep = fromDecimals(
    '1',
    Math.min(MAX_INPUT_DECIMAL_BASE, tokenDecimals)
  )

  const handleAmountChange = useCallback(
    (event) => updateAmount(event.target.value),
    [updateAmount]
  )

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault()

      const fieldsData = validateFields()

      if (!fieldsData) {
        return
      }

      onUpdateTokens({
        amount: fieldsData.amount,
        mode,
      })
    },
    [mode, validateFields, onUpdateTokens]
  )

  return (
    <form
      css={`
        margin-top: ${3 * GU}px;
      `}
      onSubmit={handleSubmit}
    >
      <Info
        title="Action"
        css={`
          margin-bottom: ${3 * GU}px;
        `}
      >
        {mode === 'wrap'
          ? 'This action will create tokens and transfer them your account.'
          : 'This action will unwrap tokens from your account.'}
      </Info>
      <Field
        label={
          mode === 'wrap'
            ? `Available tokens: ${formatBalance(
                erc20Balance,
                erc20DecimalsBase,
                erc20Decimals
              )} ${erc20Symbol}`
            : `Available tokens: ${formatBalance(
                holderBalance,
                tokenDecimalsBase,
                tokenDecimals
              )} ${tokenSymbol}`
        }
      />
      <Field
        label={
          mode === 'wrap'
            ? 'Number of tokens to wrap'
            : 'Number of tokens to unwrap'
        }
      >
        <TextInput
          type="number"
          ref={amountInputRef}
          value={amountField.value}
          onChange={handleAmountChange}
          min={tokenStep}
          max={amountField.max}
          step={tokenStep}
          required
          wide
        />
      </Field>

      <Button mode="strong" type="submit" disabled={submitDisabled} wide>
        {mode === 'wrap' ? 'Wrap tokens' : 'Unwrap tokens'}
      </Button>

      <div
        css={`
          margin-top: ${2 * GU}px;
        `}
      >
        {errorMessage && <Message mode="error">{errorMessage}</Message>}
        {warningMessage && <Message mode="warning">{warningMessage}</Message>}
      </div>
    </form>
  )
}

TokenPanelContent.propTypes = {
  erc20Balance: PropTypes.instanceOf(BN),
  erc20Decimals: PropTypes.instanceOf(BN),
  erc20DecimalsBase: PropTypes.instanceOf(BN),
  erc20Symbol: PropTypes.string,
  getHolderBalance: PropTypes.func,
  mode: PropTypes.string,
  onUpdateTokens: PropTypes.func,
  tokenDecimals: PropTypes.instanceOf(BN),
  tokenDecimalsBase: PropTypes.instanceOf(BN),
  tokenSymbol: PropTypes.string,
}

TokenPanelContent.defaultProps = {
  onUpdateTokens: () => {},
  holderAddress: '',
}

function Message({ children, mode, title }) {
  return (
    <div
      css={`
        & + & {
          margin-top: ${2 * GU}px;
        }
      `}
    >
      <Info mode={mode} title={title}>
        {children}
      </Info>
    </div>
  )
}

export default UpdateTokenPanel
