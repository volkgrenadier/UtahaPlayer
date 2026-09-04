import { findRequestedMedia } from './mediaSelection'

describe('route media selection', () => {
    const items = [
        { id: 'video_1', path: 'C:\\Media\\First.mp4' },
        { id: 'video_2', path: 'C:\\Media\\Second.mp4' },
    ]

    test('resolves stable IDs before a player opens', () => {
        expect(findRequestedMedia(items, { mediaId: 'video_2' })).toBe(items[1])
    })

    test('falls back to normalized case-insensitive paths on Windows-style records', () => {
        expect(findRequestedMedia(items, { mediaPath: 'c:/media/first.mp4' })).toBe(items[0])
    })
})
