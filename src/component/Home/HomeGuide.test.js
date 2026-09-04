import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'
import HomeGuide from './HomeGuide'

const renderHome = () => render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <HomeGuide />
    </MemoryRouter>
)

const emptySummary = {
    counts: { music: 0, video: 0, photo: 0 },
    continueItems: [],
    recentItems: [],
    recentAdded: [],
    libraries: { music: [], video: [], photo: [] }
}

describe('HomeGuide', () => {
    beforeEach(() => {
        window.electronFeatures = {
            onMessage: jest.fn(() => jest.fn()),
            importMusicFolder: jest.fn().mockResolvedValue({ status: 'imported', count: 0 }),
            importVideoFolder: jest.fn().mockResolvedValue({ status: 'imported', count: 0 }),
            importPhotoFolder: jest.fn().mockResolvedValue({ status: 'imported', count: 0 }),
        }
    })

    afterEach(() => {
        delete window.electronFeatures
    })

    test('shows a single focused import experience for an empty library', async () => {
        window.electronFeatures.getHomeSummary = jest.fn().mockResolvedValue(emptySummary)

        renderHome()

        expect(await screen.findByRole('heading', { name: '从你的本地媒体开始' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /添加本地媒体/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /添加音乐/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /添加视频/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /添加图片/ })).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: '添加音乐文件夹' }))
        await waitFor(() => expect(window.electronFeatures.importMusicFolder).toHaveBeenCalledTimes(1))
    })

    test('renders real continue, recent and library content from the bounded summary', async () => {
        window.electronFeatures.getHomeSummary = jest.fn().mockResolvedValue({
            counts: { music: 12, video: 4, photo: 23 },
            nowPlaying: { id: 'song-1', type: 'music', title: 'Current Track', positionMs: 30_000, durationMs: 120_000 },
            continueItems: [{ id: 'video-1', type: 'video', title: 'Resume Film', positionMs: 60_000, durationMs: 180_000 }],
            recentItems: [{ id: 'photo-1', type: 'photo', title: 'Recent Photo' }],
            recentAdded: [{ id: 'song-2', type: 'music', title: 'New Album' }],
            libraries: {
                music: [{ id: 'song-1', type: 'music', title: 'Current Track' }],
                video: [{ id: 'video-1', type: 'video', title: 'Resume Film' }],
                photo: [{ id: 'photo-1', type: 'photo', title: 'Recent Photo' }]
            }
        })

        renderHome()

        expect(await screen.findByText('Current Track')).toBeInTheDocument()
        expect(screen.getByText('Resume Film')).toBeInTheDocument()
        expect(screen.getByText('Recent Photo')).toBeInTheDocument()
        expect(screen.getByText('New Album')).toBeInTheDocument()
        expect(window.electronFeatures.getHomeSummary).toHaveBeenCalledWith({ limitPerSection: 12 })
    })

    test('keeps a usable empty state and surfaces summary failures', async () => {
        window.electronFeatures.getHomeSummary = jest.fn().mockRejectedValue(new Error('媒体索引不可用'))

        renderHome()

        expect(await screen.findByRole('status')).toHaveTextContent('媒体索引不可用')
        expect(screen.getByRole('heading', { name: '从你的本地媒体开始' })).toBeInTheDocument()
    })

    test('exposes a loading state while the summary is pending', () => {
        window.electronFeatures.getHomeSummary = jest.fn(() => new Promise(() => {}))

        const view = renderHome()

        expect(screen.getByLabelText('正在读取媒体库')).toBeInTheDocument()
        view.unmount()
    })
})
