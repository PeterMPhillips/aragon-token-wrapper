import React from 'react'
import styled from 'styled-components'
import { EmptyStateCard } from '@aragon/ui'
import emptyIcon from '../assets/empty-card-icon.svg'

const EmptyState = ({ onActivate }) => (
  <Main>
    <EmptyStateCard
      icon={<img src={emptyIcon} alt="" />}
      title="Nothing here."
      text="Wrap tokens to start using the app."
      actionText="Wrap Tokens"
      onActivate={onActivate}
    />
  </Main>
)

const Main = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
`

export default EmptyState
