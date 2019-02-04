import React from 'react'
import styled from 'styled-components'
import {
  TableRow,
  TableCell,
  ContextMenu,
  ContextMenuItem,
  IconAdd,
  IconRemove,
  Badge,
  theme,
} from '@aragon/ui'
import { formatBalance } from '../utils'

class HolderRow extends React.Component {
  static defaultProps = {
    address: '',
    balance: 0,
    onLockTokens: () => {},
    onRemoveTokens: () => {},
  }
  handleLockTokens = () => {
    const { address, onLockTokens } = this.props
    onLockTokens(address)
  }
  handleRemoveTokens = () => {
    const { address, onRemoveTokens } = this.props
    onRemoveTokens(address)
  }
  render() {
    const {
      address,
      balance,
      isCurrentUser,
      maxAccountTokens,
      tokenDecimalsBase,
    } = this.props
    console.log('Max Tokens: ', maxAccountTokens)
    const singleToken = balance.eq(tokenDecimalsBase)
    const canLock = balance.lt(maxAccountTokens)

    return (
      <TableRow>
        <TableCell>
          <Owner>
            <span>{address}</span>
            {isCurrentUser && (
              <Badge.Identity
                style={{ fontVariant: 'small-caps' }}
                title="This is your Ethereum address"
              >
                you
              </Badge.Identity>
            )}
          </Owner>
        </TableCell>
        <TableCell align="right">
          {formatBalance(balance, tokenDecimalsBase)}
        </TableCell>
        <TableCell align="right">
          <ContextMenu>
            {canLock && (
              <ContextMenuItem onClick={this.handleLockTokens}>
                <IconWrapper>
                  <IconAdd />
                </IconWrapper>
                <ActionLabel>Lock Tokens</ActionLabel>
              </ContextMenuItem>
            )}
            <ContextMenuItem onClick={this.handleRemoveTokens}>
              <IconWrapper>
                <IconRemove />
              </IconWrapper>
              <ActionLabel>
                Remove Token
                {singleToken ? '' : 's'}
              </ActionLabel>
            </ContextMenuItem>
          </ContextMenu>
        </TableCell>
      </TableRow>
    )
  }
}

const ActionLabel = styled.span`
  margin-left: 15px;
`

const Owner = styled.div`
  display: flex;
  align-items: center;
  & > span:first-child {
    margin-right: 10px;
  }
`

const IconWrapper = styled.span`
  display: flex;
  align-content: center;
  margin-top: -3px;
  color: ${theme.textSecondary};
`

export default HolderRow
