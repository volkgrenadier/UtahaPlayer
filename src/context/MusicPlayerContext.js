import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState
} from 'react';
import { MAXVOLUME } from '../config/reactConfig';

const DEFAULT_VOLUME = 25;
const PLAY_MODES = ['shuffle', 'sequential play', 'single loop'];
const MusicPlayerContext = createContext(null);

const sameTrack = (left, right) => Boolean(left && right && (
	(left.id && right.id && left.id === right.id) ||
	(left.path && right.path && left.path === right.path)
));

const toMediaUrl = (filePath) => {
	if (!filePath || /^(?:blob:|data:|file:|https?:)/i.test(filePath)) return filePath || '';
	const normalizedPath = filePath.replace(/\\/g, '/');
	return `file:///${encodeURI(normalizedPath).replace(/#/g, '%23')}`;
};

const getElectronFeatures = () => (
	typeof window !== 'undefined' ? window.electronFeatures : null
);

export const MusicPlayerProvider = ({ children }) => {
	const audioRef = useRef(null);
	const loadedTrackPathRef = useRef('');
	const autoplayNextTrackRef = useRef(false);
	const restoredPlaybackKeyRef = useRef('');
	const lastAudibleVolumeRef = useRef(DEFAULT_VOLUME);
	const activeMusicRef = useRef(null);
	const isSwitchingSourceRef = useRef(false);

	const [musicList, setMusicList] = useState([]);
	const [currentMusic, setCurrentMusic] = useState(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [totalTime, setTotalTime] = useState(0);
	const [progress, setProgress] = useState(0);
	const [volumeLevel, setVolumeLevel] = useState(DEFAULT_VOLUME);
	const [isMuted, setIsMuted] = useState(false);
	const [currentMode, setCurrentMode] = useState('sequential play');
	const [lyrics, setLyrics] = useState([]);
	const [hasLyrics, setHasLyrics] = useState(false);

	const applyVolume = useCallback((nextVolume, { persist = false } = {}) => {
		const numericVolume = Number(nextVolume);
		const normalizedVolume = Number.isFinite(numericVolume)
			? Math.min(Math.max(Math.round(numericVolume), 0), 100)
			: DEFAULT_VOLUME;
		const audio = audioRef.current;

		setVolumeLevel(normalizedVolume);
		setIsMuted(normalizedVolume === 0);
		if (normalizedVolume > 0) lastAudibleVolumeRef.current = normalizedVolume;

		if (audio) {
			audio.volume = ((normalizedVolume / 100) * MAXVOLUME) / 100;
			audio.muted = normalizedVolume === 0;
		}

		if (persist) {
			getElectronFeatures()?.setMusicVolume?.(normalizedVolume);
		}
	}, []);

	const pause = useCallback(() => {
		audioRef.current?.pause();
	}, []);

	const persistMusicProgress = useCallback(async (track = activeMusicRef.current) => {
		const electronFeatures = getElectronFeatures();
		const audio = audioRef.current;
		if (!track || !audio) return;

		const positionMs = Math.max(0, Math.round((audio.currentTime || 0) * 1000));
		const durationMs = Number.isFinite(audio.duration)
			? Math.max(0, Math.round(audio.duration * 1000))
			: Math.max(0, Number(track.playback?.durationMs) || Number(track.duration) * 1000 || 0);

		try {
			if (typeof electronFeatures?.updatePlaybackProgress === 'function') {
				const result = await electronFeatures.updatePlaybackProgress({
					mediaId: track.id || track.path,
					type: 'music',
					positionMs,
					durationMs
				});
				if (result?.status === 'error') {
					console.warn('保存音乐播放进度失败:', result.code, result.message);
				}
			} else {
				await electronFeatures?.recordMediaActivity?.({
					mediaId: track.id,
					path: track.path,
					type: 'music'
				});
			}
		} catch (error) {
			console.warn('保存音乐播放进度失败:', error);
		}
	}, []);

	const play = useCallback(async () => {
		const audio = audioRef.current;
		if (!audio || !currentMusic || !audio.src) return false;

		try {
			await audio.play();
			return true;
		} catch (error) {
			console.error('音乐播放失败:', error);
			setIsPlaying(false);
			return false;
		}
	}, [currentMusic]);

	const togglePlay = useCallback(() => {
		if (isPlaying) {
			pause();
			return;
		}
		play();
	}, [isPlaying, pause, play]);

	const selectMusic = useCallback((track, { autoplay = true } = {}) => {
		if (!track) return;
		if (sameTrack(track, currentMusic)) {
			if (autoplay) play();
			return;
		}

		persistMusicProgress();
		autoplayNextTrackRef.current = autoplay;
		setCurrentMusic(track);
	}, [currentMusic, persistMusicProgress, play]);

	const seekToTime = useCallback((seconds) => {
		const audio = audioRef.current;
		if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
		const nextTime = Math.min(Math.max(Number(seconds) || 0, 0), audio.duration);
		audio.currentTime = nextTime;
		setCurrentTime(nextTime);
		setProgress((nextTime / audio.duration) * 100);
	}, []);

	const seekToProgress = useCallback((progressPercent) => {
		const audio = audioRef.current;
		if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
		const normalizedProgress = Math.min(Math.max(Number(progressPercent) || 0, 0), 100);
		seekToTime((normalizedProgress / 100) * audio.duration);
	}, [seekToTime]);

	const toggleMute = useCallback(() => {
		if (isMuted || volumeLevel === 0) {
			applyVolume(lastAudibleVolumeRef.current || DEFAULT_VOLUME, { persist: true });
		} else {
			lastAudibleVolumeRef.current = volumeLevel;
			applyVolume(0, { persist: true });
		}
	}, [applyVolume, isMuted, volumeLevel]);

	const loadLyricsForTrack = useCallback(async (track = currentMusic) => {
		const electronFeatures = getElectronFeatures();
		if (!track?.path || !electronFeatures?.loadLyrics) {
			setLyrics([]);
			setHasLyrics(false);
			return;
		}

		try {
			const lyricData = await electronFeatures.loadLyrics(track.path);
			if (lyricData?.lyricData?.length > 0) {
				if (
					track.id &&
					lyricData.lyricPath &&
					track.lyricPath !== lyricData.lyricPath &&
					electronFeatures.saveLyricsAssociation
				) {
					await electronFeatures.saveLyricsAssociation(track.id, lyricData.lyricPath);
				}
				setLyrics(lyricData.lyricData);
				setHasLyrics(true);
			} else {
				setLyrics([]);
				setHasLyrics(false);
			}
		} catch (error) {
			console.error('加载歌词失败:', error);
			setLyrics([]);
			setHasLyrics(false);
		}
	}, [currentMusic]);

	const selectLyricsFile = useCallback(async () => {
		const electronFeatures = getElectronFeatures();
		if (!currentMusic || !electronFeatures?.selectLyricsFile) return null;

		const lyricData = await electronFeatures.selectLyricsFile();
		if (!lyricData?.lyricData?.length) return null;

		if (currentMusic.id && lyricData.lyricPath && electronFeatures.saveLyricsAssociation) {
			const result = await electronFeatures.saveLyricsAssociation(currentMusic.id, lyricData.lyricPath);
			if (result && result.success === false) return null;
		}

		setLyrics(lyricData.lyricData);
		setHasLyrics(true);
		return lyricData;
	}, [currentMusic]);

	const setPlaybackMode = useCallback((mode) => {
		if (!PLAY_MODES.includes(mode)) return;
		setCurrentMode(mode);
		getElectronFeatures()?.setMusicPlaybackMode?.(mode);
	}, []);

	const playRandom = useCallback(() => {
		if (musicList.length === 0) return;
		if (musicList.length === 1) {
			seekToTime(0);
			play();
			return;
		}

		const currentIndex = musicList.findIndex((track) => sameTrack(track, currentMusic));
		let randomIndex = currentIndex;
		while (randomIndex === currentIndex) {
			randomIndex = Math.floor(Math.random() * musicList.length);
		}
		selectMusic(musicList[randomIndex]);
	}, [currentMusic, musicList, play, seekToTime, selectMusic]);

	const playPrevious = useCallback(() => {
		if (musicList.length === 0) return;
		const currentIndex = musicList.findIndex((track) => sameTrack(track, currentMusic));
		const previousIndex = currentIndex > 0 ? currentIndex - 1 : musicList.length - 1;
		selectMusic(musicList[previousIndex]);
	}, [currentMusic, musicList, selectMusic]);

	const playNext = useCallback(() => {
		if (musicList.length === 0) return;
		if (currentMode === 'shuffle') {
			playRandom();
			return;
		}
		if (currentMode === 'single loop') {
			seekToTime(0);
			play();
			return;
		}

		const currentIndex = musicList.findIndex((track) => sameTrack(track, currentMusic));
		const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % musicList.length : 0;
		selectMusic(musicList[nextIndex]);
	}, [currentMode, currentMusic, musicList, play, playRandom, seekToTime, selectMusic]);

	useEffect(() => {
		if (typeof Audio === 'undefined') return undefined;
		const audio = new Audio();
		audio.preload = 'metadata';
		audio.volume = ((DEFAULT_VOLUME / 100) * MAXVOLUME) / 100;
		audioRef.current = audio;

		const updateTiming = () => {
			const duration = audio.duration;
			const nextCurrentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
			setCurrentTime(nextCurrentTime);
			if (Number.isFinite(duration) && duration > 0) {
				setTotalTime(duration);
				setProgress(Math.min(Math.max((nextCurrentTime / duration) * 100, 0), 100));
			}
			isSwitchingSourceRef.current = false;
		};
		const restorePlaybackPosition = () => {
			const track = activeMusicRef.current;
			const playbackKey = track?.id || track?.path;
			const restoreSeconds = Number(track?.playback?.positionMs ?? track?.positionMs) / 1000;
			if (
				playbackKey
				&& restoredPlaybackKeyRef.current !== playbackKey
				&& Number.isFinite(restoreSeconds)
				&& restoreSeconds > 0
				&& Number.isFinite(audio.duration)
				&& restoreSeconds < audio.duration
			) {
				audio.currentTime = restoreSeconds;
				restoredPlaybackKeyRef.current = playbackKey;
			}
			updateTiming();
		};
		const handlePlay = () => {
			isSwitchingSourceRef.current = false;
			setIsPlaying(true);
			persistMusicProgress();
			document.querySelectorAll('video').forEach((video) => {
				try { video.pause(); } catch (_) { /* best effort */ }
			});
		};
		const handlePause = () => {
			setIsPlaying(false);
			if (!isSwitchingSourceRef.current) persistMusicProgress();
		};
		const handleError = (event) => {
			console.error('音频播放错误:', event);
			setIsPlaying(false);
		};

		audio.addEventListener('timeupdate', updateTiming);
		audio.addEventListener('loadedmetadata', restorePlaybackPosition);
		audio.addEventListener('durationchange', updateTiming);
		audio.addEventListener('play', handlePlay);
		audio.addEventListener('pause', handlePause);
		audio.addEventListener('error', handleError);

		return () => {
			audio.removeEventListener('timeupdate', updateTiming);
			audio.removeEventListener('loadedmetadata', restorePlaybackPosition);
			audio.removeEventListener('durationchange', updateTiming);
			audio.removeEventListener('play', handlePlay);
			audio.removeEventListener('pause', handlePause);
			audio.removeEventListener('error', handleError);
			persistMusicProgress();
			audio.pause();
			audio.removeAttribute('src');
			audio.load();
			audioRef.current = null;
		};
	}, [persistMusicProgress]);

	useEffect(() => {
		const intervalId = window.setInterval(() => {
			if (audioRef.current && !audioRef.current.paused) persistMusicProgress();
		}, 5000);
		const persistBeforeExit = () => persistMusicProgress();
		window.addEventListener('pagehide', persistBeforeExit);
		window.addEventListener('beforeunload', persistBeforeExit);

		return () => {
			window.clearInterval(intervalId);
			window.removeEventListener('pagehide', persistBeforeExit);
			window.removeEventListener('beforeunload', persistBeforeExit);
		};
	}, [persistMusicProgress]);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		const handleEnded = () => {
			persistMusicProgress();
			playNext();
		};
		audio.addEventListener('ended', handleEnded);
		return () => audio.removeEventListener('ended', handleEnded);
	}, [persistMusicProgress, playNext]);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		if (!currentMusic?.path) {
			isSwitchingSourceRef.current = true;
			audio.pause();
			audio.removeAttribute('src');
			loadedTrackPathRef.current = '';
			restoredPlaybackKeyRef.current = '';
			setCurrentTime(0);
			setTotalTime(0);
			setProgress(0);
			setLyrics([]);
			setHasLyrics(false);
			activeMusicRef.current = null;
			isSwitchingSourceRef.current = false;
			return;
		}

		if (loadedTrackPathRef.current !== currentMusic.path) {
			isSwitchingSourceRef.current = true;
			loadedTrackPathRef.current = currentMusic.path;
			activeMusicRef.current = currentMusic;
			audio.src = toMediaUrl(currentMusic.path);
			audio.load();
			setCurrentTime(0);
			setTotalTime(0);
			setProgress(0);
		}

		loadLyricsForTrack(currentMusic);
		if (autoplayNextTrackRef.current) {
			autoplayNextTrackRef.current = false;
			audio.play().catch((error) => {
				console.error('音乐播放失败:', error);
				setIsPlaying(false);
			});
		}
	}, [currentMusic, loadLyricsForTrack]);

	useEffect(() => {
		let active = true;
		const electronFeatures = getElectronFeatures();
		if (!electronFeatures) return undefined;

		const loadLibrary = async () => {
			try {
				const [listResult, configResult] = await Promise.all([
					electronFeatures.getMusicList?.(),
					electronFeatures.getUserConfig?.('music')
				]);
				if (!active) return;

				const configList = configResult?.musicLibrary?.musicList;
				const nextList = Array.isArray(listResult)
					? listResult
					: (Array.isArray(configList) ? configList : []);
				setMusicList(nextList);
				setCurrentMusic((previous) => (
					nextList.find((track) => sameTrack(track, previous)) || nextList[0] || null
				));
				applyVolume(configResult?.volume ?? DEFAULT_VOLUME);
				if (PLAY_MODES.includes(configResult?.playMode)) {
					setCurrentMode(configResult.playMode);
				}
			} catch (error) {
				console.error('加载音乐列表失败:', error);
			}
		};

		loadLibrary();
		const removeListListener = electronFeatures.onMessage?.('music-list-updated', (nextList) => {
			if (!Array.isArray(nextList)) return;
			setMusicList(nextList);
			setCurrentMusic((previous) => (
				nextList.find((track) => sameTrack(track, previous)) || nextList[0] || null
			));
		});

		return () => {
			active = false;
			if (typeof removeListListener === 'function') removeListListener();
		};
	}, [applyVolume]);

	const value = useMemo(() => ({
		audioRef,
		musicList,
		currentMusic,
		isPlaying,
		currentTime,
		totalTime,
		progress,
		volumeLevel,
		isMuted,
		currentMode,
		lyrics,
		hasLyrics,
		play,
		pause,
		togglePlay,
		selectMusic,
		playPrevious,
		playNext,
		seekToTime,
		seekToProgress,
		applyVolume,
		toggleMute,
		setPlaybackMode,
		selectLyricsFile,
		loadLyricsForTrack
	}), [
		applyVolume,
		currentMode,
		currentMusic,
		currentTime,
		hasLyrics,
		isMuted,
		isPlaying,
		loadLyricsForTrack,
		lyrics,
		musicList,
		pause,
		play,
		playNext,
		playPrevious,
		progress,
		seekToProgress,
		seekToTime,
		selectLyricsFile,
		selectMusic,
		setPlaybackMode,
		toggleMute,
		togglePlay,
		totalTime,
		volumeLevel
	]);

	return (
		<MusicPlayerContext.Provider value={value}>
			{children}
		</MusicPlayerContext.Provider>
	);
};

export const useMusicPlayer = () => {
	const context = useContext(MusicPlayerContext);
	if (!context) {
		throw new Error('useMusicPlayer must be used inside MusicPlayerProvider');
	}
	return context;
};
