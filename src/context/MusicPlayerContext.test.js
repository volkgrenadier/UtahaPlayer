import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MusicPlayerProvider, useMusicPlayer } from './MusicPlayerContext';

class MockAudio extends EventTarget {
	constructor() {
		super();
		this.src = '';
		this.currentTime = 0;
		this.duration = 180;
		this.volume = 1;
		this.muted = false;
		this.paused = true;
		this.playCalls = 0;
	}

	play() {
		this.playCalls += 1;
		this.paused = false;
		this.dispatchEvent(new Event('play'));
		return Promise.resolve();
	}

	pause() {
		this.paused = true;
		this.dispatchEvent(new Event('pause'));
	}

	load() {}

	removeAttribute(attribute) {
		if (attribute === 'src') this.src = '';
	}
}

const PlayerProbe = ({ route }) => {
	const { currentMusic, isPlaying, togglePlay } = useMusicPlayer();
	return (
		<div data-testid="route-probe">
			<span>{route}</span>
			<span>{currentMusic?.title || 'empty'}</span>
			<span>{isPlaying ? 'playing' : 'paused'}</span>
			<button type="button" onClick={togglePlay}>toggle</button>
		</div>
	);
};

const TestShell = () => {
	const [route, setRoute] = useState('music');
	return (
		<MusicPlayerProvider>
			<PlayerProbe key={route} route={route} />
			<button type="button" onClick={() => setRoute('photo')}>change route</button>
		</MusicPlayerProvider>
	);
};

describe('MusicPlayerProvider', () => {
	let previousAudio;
	let audioInstances;

	beforeEach(() => {
		previousAudio = global.Audio;
		audioInstances = [];
		global.Audio = class extends MockAudio {
			constructor() {
				super();
				audioInstances.push(this);
			}
		};
		window.electronFeatures = {
			getMusicList: jest.fn().mockResolvedValue([
				{ id: 'music-1', path: 'C:\\Music\\first.mp3', title: 'First song', artist: 'Artist' }
			]),
			getUserConfig: jest.fn().mockResolvedValue({
				volume: 25,
				musicLibrary: { musicList: [] }
			}),
			onMessage: jest.fn(() => () => {}),
			loadLyrics: jest.fn().mockResolvedValue({ lyricData: [] })
		};
	});

	afterEach(() => {
		global.Audio = previousAudio;
		delete window.electronFeatures;
	});

	it('keeps the same audio session alive when routed content remounts', async () => {
		render(<TestShell />);

		await screen.findByText('First song');
		fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
		await screen.findByText('playing');
		expect(audioInstances).toHaveLength(1);
		expect(audioInstances[0].playCalls).toBe(1);

		fireEvent.click(screen.getByRole('button', { name: 'change route' }));
		await waitFor(() => expect(screen.getByTestId('route-probe')).toHaveTextContent('photo'));
		expect(screen.getByTestId('route-probe')).toHaveTextContent('First song');
		expect(screen.getByTestId('route-probe')).toHaveTextContent('playing');
		expect(audioInstances).toHaveLength(1);
	});

	it('restores persisted progress once metadata becomes available', async () => {
		window.electronFeatures.getMusicList.mockResolvedValue([
			{
				id: 'music-resume',
				path: 'C:\\Music\\resume.mp3',
				title: 'Resume song',
				playback: { positionMs: 45_000, durationMs: 180_000 }
			}
		]);

		render(<TestShell />);
		await screen.findByText('Resume song');
		await waitFor(() => expect(audioInstances[0].src).toContain('resume.mp3'));

		act(() => audioInstances[0].dispatchEvent(new Event('loadedmetadata')));

		expect(audioInstances[0].currentTime).toBe(45);
	});
});
