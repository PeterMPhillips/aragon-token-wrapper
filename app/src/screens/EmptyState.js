import React from 'react'
import PropTypes from 'prop-types'
import { Button, EmptyStateCard, GU } from '@aragon/ui'
import emptyIcon from '../assets/empty-card-icon.svg'

const EmptyState = React.memo(function NoVotes({ onWrapTokens }) {
  return (
    <div
      css={`
        height: calc(100vh - ${8 * GU}px);
        display: flex;
        align-items: center;
        justify-content: center;
      `}
    >
      <EmptyStateCard
        text="No tokens have been wrapped!"
        action={
          <Button wide mode="strong" onClick={onWrapTokens}>
            Wrap tokens
          </Button>
        }
        illustration={
          <img
            css={`
              margin: auto;
              width: 200px;
            `}
            src={emptyIcon}
            alt="No tokens wrapped"
          />
        }
      />
    </div>
  )
})

EmptyState.propTypes = {
  onWrapTokens: PropTypes.func.isRequired,
}

export default EmptyState
