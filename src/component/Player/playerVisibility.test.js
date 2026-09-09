import { isMusicRoute, shouldShowGlobalMiniPlayer } from './playerVisibility'

const startedSession = { currentMusic: { id: 'track-1' }, hasPlaybackStarted: true }

describe('global mini player visibility', () => {
    test.each(['/', '/photo', '/video', '/collect', '/recent'])('shows on %s after the first playback, including when paused', (pathname) => {
        expect(shouldShowGlobalMiniPlayer({ ...startedSession, pathname, isPlaying: false })).toBe(true)
    })

    test.each(['/music', '/music/album/1', '/slideshow', '/slideshow/1'])('stays hidden on %s', (pathname) => {
        expect(shouldShowGlobalMiniPlayer({ ...startedSession, pathname })).toBe(false)
    })

    test('matches music paths without hiding unrelated path prefixes', () => {
        expect(isMusicRoute('/music')).toBe(true)
        expect(isMusicRoute('/music/album/1')).toBe(true)
        expect(isMusicRoute('/musical')).toBe(false)
    })

    test('stays hidden before the first playback even with a preselected track', () => {
        expect(shouldShowGlobalMiniPlayer({ ...startedSession, hasPlaybackStarted: false })).toBe(false)
        expect(shouldShowGlobalMiniPlayer({ currentMusic: startedSession.currentMusic })).toBe(false)
    })

    test('hides when no current track remains', () => {
        expect(shouldShowGlobalMiniPlayer({ ...startedSession, currentMusic: null })).toBe(false)
    })
})
