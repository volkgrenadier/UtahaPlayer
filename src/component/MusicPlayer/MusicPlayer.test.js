import React from 'react'
import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MusicPlayer from './MusicPlayer'

let mockPlayerState

jest.mock('../../context/MusicPlayerContext', () => ({
    useMusicPlayer: () => mockPlayerState,
}))

jest.mock('../../utils/NotificationProvider', () => ({
    useNotification: () => ({
        currentNoficationType: '',
        notify: {
            error: jest.fn(),
            info: jest.fn(),
            regularNotify: { info: jest.fn() },
            popoverNotify: { info: jest.fn() },
        },
    }),
}))

jest.mock('../../utils/toolsFunction', () => ({ clickCopy: jest.fn() }))
jest.mock('./ScrollTitle', () => ({ title }) => <span>{title}</span>)
jest.mock('./VinylPlayer', () => () => <div data-testid="vinyl-player" />)
jest.mock('./ImmersiveLyricsView', () => () => <div data-testid="lyrics-player" />)

const renderPlayer = () => render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MusicPlayer />
    </MemoryRouter>
)

describe('MusicPlayer controls', () => {
    beforeEach(() => {
        mockPlayerState = {
            musicList: [],
            currentMusic: null,
            isPlaying: false,
            isMuted: false,
            currentMode: 'sequential play',
            currentTime: 0,
            totalTime: 0,
            progress: 0,
            volumeLevel: 50,
            lyrics: [],
            togglePlay: jest.fn(),
            selectMusic: jest.fn(),
            playPrevious: jest.fn(),
            playNext: jest.fn(),
            seekToTime: jest.fn(),
            seekToProgress: jest.fn(),
            applyVolume: jest.fn(),
            toggleMute: jest.fn(),
            setPlaybackMode: jest.fn(),
            selectLyricsFile: jest.fn(),
        }
        window.electronFeatures = {
            getUserConfig: jest.fn().mockResolvedValue({}),
            setMusicPlayerEffect: jest.fn(),
        }
    })

    afterEach(() => {
        delete window.electronFeatures
    })

    test('uses a single unobstructed button to toggle player visuals', async () => {
        renderPlayer()

        expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
        expect(screen.getByTestId('vinyl-player')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: '切换为沉浸式歌词' }))

        expect(window.electronFeatures.setMusicPlayerEffect).toHaveBeenCalledWith('ImmersiveLyrics')
        expect(screen.getByTestId('lyrics-player')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '切换为唱片播放' })).toBeInTheDocument()
        await waitFor(() => expect(window.electronFeatures.getUserConfig).toHaveBeenCalledWith('music'))
    })

    test('releases pointer focus without affecting keyboard-only behavior', () => {
        renderPlayer()
        const modeButton = screen.getByTitle('顺序播放')

        modeButton.focus()
        expect(modeButton).toHaveFocus()
        fireEvent.pointerUp(modeButton, { pointerType: 'mouse' })

        expect(modeButton).not.toHaveFocus()
    })
})
