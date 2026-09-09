import React from 'react'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PlayerAwareLayout } from './App'

let mockPlaybackState

jest.mock('./context/MusicPlayerContext', () => ({
    MusicPlayerProvider: ({ children }) => children,
    useMusicPlayer: () => mockPlaybackState
}))

jest.mock('./component/Header/Header', () => () => <div data-testid="header" />)
jest.mock('./component/LeftNav/LeftNav', () => () => <div data-testid="navigation" />)
jest.mock('./component/Routes/Routes', () => () => <div data-testid="routes" />)
jest.mock('./component/Player/MiniPlayer', () => () => <div data-testid="global-mini-player" />)

const layout = (path) => (
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PlayerAwareLayout />
    </MemoryRouter>
)

describe('player-aware app layout', () => {
    beforeEach(() => {
        mockPlaybackState = { currentMusic: null, isPlaying: false, hasPlaybackStarted: false }
    })

    test('keeps the same floating controls mounted when playback pauses', () => {
        mockPlaybackState = { currentMusic: { id: 'track-1' }, isPlaying: true, hasPlaybackStarted: true }
        const { rerender } = render(layout('/photo'))
        const player = screen.getByTestId('global-mini-player')
        expect(screen.getByTestId('app-shell')).toHaveAttribute('class', 'app_container')
        mockPlaybackState.isPlaying = false
        rerender(layout('/photo'))
        expect(screen.getByTestId('global-mini-player')).toBe(player)
        expect(screen.getByTestId('app-shell')).toHaveAttribute('class', 'app_container')
    })

    test.each(['/music', '/music/album/1', '/slideshow'])('hides controls on %s even after playback started', (path) => {
        mockPlaybackState = { currentMusic: { id: 'track-1' }, isPlaying: true, hasPlaybackStarted: true }
        render(layout(path))
        expect(screen.queryByTestId('global-mini-player')).not.toBeInTheDocument()
    })

    test('does not display the automatically selected first song on startup', () => {
        mockPlaybackState.currentMusic = { id: 'track-1' }
        render(layout('/'))
        expect(screen.queryByTestId('global-mini-player')).not.toBeInTheDocument()
    })

    test('unmounts controls when the current track is cleared', () => {
        mockPlaybackState = { currentMusic: { id: 'track-1' }, isPlaying: false, hasPlaybackStarted: true }
        const { rerender } = render(layout('/video'))
        expect(screen.getByTestId('global-mini-player')).toBeInTheDocument()
        mockPlaybackState.currentMusic = null
        rerender(layout('/video'))
        expect(screen.queryByTestId('global-mini-player')).not.toBeInTheDocument()
    })
})
