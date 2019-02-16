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
    onWrapTokens: () => {},
    onUnwrapTokens: () => {},
  }
  handleWrapTokens = () => {
    const { address, onWrapTokens } = this.props
    onWrapTokens(address)
  }
  handleUnwrapTokens = () => {
    const { address, onUnwrapTokens } = this.props
    onUnwrapTokens(address)
  }
  render() {
    const {
      address,
      balance,
      isCurrentUser,
      tokenDecimalsBase,
    } = this.props
    const singleToken = balance.eq(tokenDecimalsBase)

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
          {isCurrentUser && (
            <ContextMenu>
              <ContextMenuItem onClick={this.handleWrapTokens}>
                <IconWrapper>
                  <IconAdd />
                </IconWrapper>
                <ActionLabel>Wrap Tokens</ActionLabel>
              </ContextMenuItem>
              <ContextMenuItem onClick={this.handleUnwrapTokens}>
                <IconWrapper>
                  <IconRemove />
                </IconWrapper>
                <ActionLabel>
                  Unwrap Token
                  {singleToken ? '' : 's'}
                </ActionLabel>
              </ContextMenuItem>
            </ContextMenu>
          )}
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
