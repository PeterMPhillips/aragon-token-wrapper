import React, { useMemo, useCallback } from 'react'
import PropTypes from 'prop-types'
import BN from 'bn.js'
import { useConnectedAccount } from '@aragon/api-react'
import {
  ContextMenu,
  ContextMenuItem,
  DataView,
  IconAdd,
  IconLabel,
  IconRemove,
  Split,
  GU,
  useLayout,
  useTheme,
} from '@aragon/ui'
import { formatBalance } from '../utils/utils'
import { addressesEqual } from '../utils/web3-utils'
import InfoBoxes from '../components/InfoBoxes'
import LocalIdentityBadge from '../components/LocalIdentityBadge/LocalIdentityBadge'
import { useIdentity } from '../components/IdentityManager/IdentityManager'
import You from '../components/You'

function Holders({
  erc20Balance,
  erc20Supply,
  erc20Symbol,
  holders,
  onWrapTokens,
  onUnwrapTokens,
  tokenAddress,
  tokenDecimalsBase,
  tokenName,
  tokenSupply,
  tokenSymbol,
  tokenTransfersEnabled,
}) {
  const { layoutName } = useLayout()
  const compact = layoutName === 'small'
  const connectedAccount = useConnectedAccount()
  const mappedEntries = useMemo(
    () => holders.map(({ address, balance }) => [address, balance]),
    [holders]
  )

  return (
    <Split
      primary={
        <DataView
          mode="table"
          fields={['Holder', 'Balance']}
          entries={mappedEntries}
          renderEntry={([address, balance]) => {
            const isCurrentUser = addressesEqual(address, connectedAccount)

            const values = [
              <div
                css={`
                  display: flex;
                  align-items: center;
                  max-width: ${compact ? '50vw' : 'unset'};
                `}
              >
                <LocalIdentityBadge
                  entity={address}
                  connectedAccount={isCurrentUser}
                />
                {isCurrentUser && <You />}
              </div>,
              formatBalance(balance, tokenDecimalsBase),
            ]

            return values
          }}
          renderEntryActions={([address, balance]) => (
            <EntryActions
              address={address}
              onWrapTokens={onWrapTokens}
              onUnwrapTokens={onUnwrapTokens}
              singleToken={balance.eq(tokenDecimalsBase)}
              canWrap={
                addressesEqual(address, connectedAccount) &&
                new BN(erc20Balance).eq(0)
              }
              canUnwrap={addressesEqual(address, connectedAccount)}
            />
          )}
        />
      }
      secondary={
        <InfoBoxes
          erc20Supply={erc20Supply}
          erc20Symbol={erc20Symbol}
          holders={holders}
          tokenAddress={tokenAddress}
          tokenDecimalsBase={tokenDecimalsBase}
          tokenName={tokenName}
          tokenSupply={tokenSupply}
          tokenSymbol={tokenSymbol}
          tokenTransfersEnabled={tokenTransfersEnabled}
        />
      }
    />
  )
}

Holders.propTypes = {
  erc20Balance: PropTypes.instanceOf(BN),
  erc20Supply: PropTypes.instanceOf(BN),
  erc20Symbol: PropTypes.string,
  holders: PropTypes.array,
  onWrapTokens: PropTypes.func.isRequired,
  onUnwrapTokens: PropTypes.func.isRequired,
  tokenAddress: PropTypes.string,
  tokenDecimalsBase: PropTypes.instanceOf(BN),
  tokenName: PropTypes.string,
  tokenSupply: PropTypes.instanceOf(BN),
  tokenSymbol: PropTypes.string,
  tokenTransfersEnabled: PropTypes.bool,
}

Holders.defaultProps = {
  holders: [],
}

function EntryActions({
  address,
  onWrapTokens,
  onUnwrapTokens,
  singleToken,
  canWrap,
  canUnwrap,
}) {
  const theme = useTheme()
  const [label, showLocalIdentityModal] = useIdentity(address)

  const editLabel = useCallback(() => showLocalIdentityModal(address), [
    address,
    showLocalIdentityModal,
  ])

  const actions = [
    ...(canWrap ? [[onWrapTokens, IconAdd, 'Wrap tokens']] : []),
    ...(canUnwrap
      ? [[onUnwrapTokens, IconRemove, `Unwrap token${singleToken ? '' : 's'}`]]
      : []),
    [editLabel, IconLabel, `${label ? 'Edit' : 'Add'} custom label`],
  ]

  return (
    <ContextMenu zIndex={1}>
      {actions.map(([onClick, Icon, label], index) => (
        <ContextMenuItem onClick={onClick} key={index}>
          <span
            css={`
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
              color: ${theme.surfaceContentSecondary};
            `}
          >
            <Icon />
          </span>
          <span
            css={`
              margin-left: ${1 * GU}px;
            `}
          >
            {label}
          </span>
        </ContextMenuItem>
      ))}
    </ContextMenu>
  )
}

EntryActions.propTypes = {
  address: PropTypes.string,
  onWrapTokens: PropTypes.func,
  onUnwrapTokens: PropTypes.func,
  singleToken: PropTypes.bool,
  canWrap: PropTypes.bool,
  canUnwrap: PropTypes.bool,
}

export default Holders
