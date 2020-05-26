import React, { useCallback, useMemo } from 'react'
import PropTypes from 'prop-types'
import BN from 'bn.js'
import { useConnectedAccount, useNetwork } from '@aragon/api-react'
import {
  Box,
  Distribution,
  Field,
  GU,
  ProgressBar,
  TokenBadge,
  useTheme,
} from '@aragon/ui'
import { formatBalance, stakesPercentages } from '../utils/utils'
import { addressesEqual } from '../utils/web3-utils'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'
import You from './You'

const DISTRIBUTION_ITEMS_MAX = 7

function displayedStakes(accounts, total) {
  return stakesPercentages(
    accounts.map(({ balance }) => balance),
    {
      total,
      maxIncluded: DISTRIBUTION_ITEMS_MAX,
    }
  ).map((stake, index) => ({
    item: stake.index === -1 ? 'Rest' : accounts[index].address,
    percentage: stake.percentage,
  }))
}

function transferableLabel(transfersEnabled) {
  if (transfersEnabled === undefined) {
    return 'Unknown'
  }
  return transfersEnabled ? 'Yes' : 'No'
}

function InfoBoxes({
  erc20Supply,
  erc20Symbol,
  holders,
  tokenAddress,
  tokenDecimalsBase,
  tokenName,
  tokenSupply,
  tokenSymbol,
  tokenTransfersEnabled,
}) {
  const theme = useTheme()
  const connectedAccount = useConnectedAccount()
  const network = useNetwork()

  const erc20Percent = useCallback(
    (bigNumber) => {
      return bigNumber.mul(new BN(100)).div(erc20Supply).toNumber()
    },
    [erc20Supply]
  )

  const stakes = useMemo(() => displayedStakes(holders, tokenSupply), [
    holders,
    tokenSupply,
  ])

  const wrapPercent = erc20Percent(tokenSupply)
  const wrapProgress = wrapPercent / 100

  return (
    <>
      <Box heading="Wrapped Token Info">
        <ul>
          {[
            [
              'Total supply',
              <strong>{formatBalance(tokenSupply, tokenDecimalsBase)}</strong>,
            ],
            [
              'Transferable',
              <strong>{transferableLabel(tokenTransfersEnabled)}</strong>,
            ],
            [
              'Token',
              <TokenBadge
                address={tokenAddress}
                name={tokenName}
                symbol={tokenSymbol}
                networkType={network && network.type}
              />,
            ],
          ].map(([label, content], index) => (
            <li
              key={index}
              css={`
                display: flex;
                justify-content: space-between;
                list-style: none;
                color: ${theme.surfaceContent};

                & + & {
                  margin-top: ${2 * GU}px;
                }

                > span:nth-child(1) {
                  color: ${theme.surfaceContentSecondary};
                }
                > span:nth-child(2) {
                  // “:” is here for accessibility reasons, we can hide it
                  opacity: 0;
                  width: 10px;
                }
                > span:nth-child(3) {
                  flex-shrink: 1;
                }
                > strong {
                  text-transform: uppercase;
                }
              `}
            >
              <span>{label}</span>
              <span>:</span>
              {content}
            </li>
          ))}
        </ul>
      </Box>
      <Box heading="Ownership Distribution">
        <Distribution
          heading="Tokenholder stakes"
          items={stakes}
          renderLegendItem={({ item: account }) => {
            const isCurrentUser = addressesEqual(account, connectedAccount)
            return (
              <div>
                <LocalIdentityBadge
                  entity={account}
                  connectedAccount={isCurrentUser}
                />
                {isCurrentUser && <You />}
              </div>
            )
          }}
        />
      </Box>
      <Box heading="Tokens Wrapped">
        <Field
          label={`${wrapPercent}% of ${erc20Symbol} wrapped`}
          css="margin-bottom: 0;"
        >
          <ProgressBar value={wrapProgress} />
        </Field>
      </Box>
    </>
  )
}

InfoBoxes.propTypes = {
  erc20Supply: PropTypes.instanceOf(BN),
  erc20Symbol: PropTypes.string,
  holders: PropTypes.array,
  tokenAddress: PropTypes.string,
  tokenDecimalsBase: PropTypes.instanceOf(BN),
  tokenName: PropTypes.string,
  tokenSupply: PropTypes.instanceOf(BN),
  tokenSymbol: PropTypes.string,
  tokenTransfersEnabled: PropTypes.bool,
}

InfoBoxes.defaultProps = {
  holders: [],
}

export default InfoBoxes
