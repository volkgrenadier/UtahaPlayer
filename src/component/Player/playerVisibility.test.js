import { isMusicRoute, shouldShowGlobalMiniPlayer } from './playerVisibility'

describe('global mini player visibility', () => {
	test('shows while music is playing outside the music tab', () => {
		expect(shouldShowGlobalMiniPlayer({
			pathname: '/',
			currentMusic: { id: 'track-1' },
			isPlaying: true
		})).toBe(true)
	})

	test('never duplicates the controls on the music tab', () => {
		expect(isMusicRoute('/music')).toBe(true)
		expect(isMusicRoute('/music/album/1')).toBe(true)
		expect(shouldShowGlobalMiniPlayer({
			pathname: '/music',
			currentMusic: { id: 'track-1' },
			isPlaying: true
		})).toBe(false)
	})

	test('stays hidden when playback is paused or no track is selected', () => {
		expect(shouldShowGlobalMiniPlayer({
			pathname: '/photo',
			currentMusic: { id: 'track-1' },
			isPlaying: false
		})).toBe(false)
		expect(shouldShowGlobalMiniPlayer({
			pathname: '/video',
			currentMusic: null,
			isPlaying: true
		})).toBe(false)
	})
})
