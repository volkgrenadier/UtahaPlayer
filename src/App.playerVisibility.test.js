import React from 'react'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PlayerAwareLayout } from './App'

let mockPlaybackState = {
	currentMusic: null,
	isPlaying: false
}

jest.mock('./context/MusicPlayerContext', () => ({
	MusicPlayerProvider: ({ children }) => children,
	useMusicPlayer: () => mockPlaybackState
}))

jest.mock('./component/Header/Header', () => () => <div data-testid="header" />)
jest.mock('./component/LeftNav/LeftNav', () => () => <div data-testid="navigation" />)
jest.mock('./component/Routes/Routes', () => () => <div data-testid="routes" />)
jest.mock('./component/Player/MiniPlayer', () => () => <div data-testid="global-mini-player" />)

const renderLayout = (path) => render(
	<MemoryRouter
		initialEntries={[path]}
		future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
	>
		<PlayerAwareLayout />
	</MemoryRouter>
)

describe('player-aware app layout', () => {
	beforeEach(() => {
		mockPlaybackState = { currentMusic: null, isPlaying: false }
	})

	test('mounts the global controls only during active playback outside Music', () => {
		mockPlaybackState = { currentMusic: { id: 'track-1' }, isPlaying: true }
		renderLayout('/photo')

		expect(screen.getByTestId('global-mini-player')).toBeInTheDocument()
		expect(screen.getByTestId('app-shell')).toHaveClass('has-mini-player')
	})

	test('does not duplicate controls on the Music tab', () => {
		mockPlaybackState = { currentMusic: { id: 'track-1' }, isPlaying: true }
		renderLayout('/music')

		expect(screen.queryByTestId('global-mini-player')).not.toBeInTheDocument()
		expect(screen.getByTestId('app-shell')).not.toHaveClass('has-mini-player')
	})

	test('removes the global controls and their layout row when paused', () => {
		mockPlaybackState = { currentMusic: { id: 'track-1' }, isPlaying: false }
		renderLayout('/video')

		expect(screen.queryByTestId('global-mini-player')).not.toBeInTheDocument()
		expect(screen.getByTestId('app-shell')).not.toHaveClass('has-mini-player')
	})
})
