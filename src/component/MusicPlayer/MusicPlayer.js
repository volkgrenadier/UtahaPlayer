import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import RepeatIcon from '@mui/icons-material/Repeat';
import RepeatOneIcon from '@mui/icons-material/RepeatOne';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import AlbumIcon from '@mui/icons-material/Album';
import MovieIcon from '@mui/icons-material/Movie';
import AudioFileRoundedIcon from '@mui/icons-material/AudioFileRounded';
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded';
import './MusicPlayer.scss';
import VinylPlayer from './VinylPlayer';
import ImmersiveLyricsView from './ImmersiveLyricsView';
import { clickCopy } from '../../utils/toolsFunction';
import { useNotification } from '../../utils/NotificationProvider';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { findRequestedMedia } from '../../utils/mediaSelection';
import ScrollTitle from './ScrollTitle';

const PLAYER_EFFECTS = [
	{ id: 'VinylPlayer', label: '唱片播放', icon: <AlbumIcon fontSize="small" /> },
	{ id: 'ImmersiveLyrics', label: '沉浸式歌词', icon: <MovieIcon fontSize="small" /> }
];

const PLAY_MODES = [
	{ label: '随机播放', value: 'shuffle', icon: <ShuffleIcon /> },
	{ label: '顺序播放', value: 'sequential play', icon: <RepeatIcon /> },
	{ label: '单曲循环', value: 'single loop', icon: <RepeatOneIcon /> }
];

const formatTime = (seconds) => {
	if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.floor(seconds % 60);
	return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const releasePointerFocus = (event) => {
	const button = event.target.closest?.('button');
	if (button && event.currentTarget.contains(button)) button.blur();
};

const MusicPlayer = () => {
	const location = useLocation();
	const progressBarRef = useRef(null);
	const volumeContainerRef = useRef(null);
	const playlistRef = useRef(null);
	const handledRouteSelectionRef = useRef('');
	const [isDragging, setIsDragging] = useState(false);
	const [temporaryProgress, setTemporaryProgress] = useState(null);
	const [isButtonAnimating, setIsButtonAnimating] = useState(null);
	const [showVolumeSlider, setShowVolumeSlider] = useState(false);
	const [currentPlayerEffect, setCurrentPlayerEffect] = useState(PLAYER_EFFECTS[0].id);
	const [isSelectingLyrics, setIsSelectingLyrics] = useState(false);
	const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
	const notifyContext = useNotification();

	const {
		musicList,
		currentMusic,
		isPlaying,
		isMuted,
		currentMode,
		currentTime,
		totalTime,
		progress,
		volumeLevel,
		lyrics,
		togglePlay,
		selectMusic,
		playPrevious,
		playNext,
		seekToTime,
		seekToProgress,
		applyVolume,
		toggleMute,
		setPlaybackMode,
		selectLyricsFile
	} = useMusicPlayer();

	const currentModeIcon = useMemo(() => (
		PLAY_MODES.find((mode) => mode.value === currentMode)?.icon || <RepeatIcon />
	), [currentMode]);

	const animateButton = (buttonType) => {
		setIsButtonAnimating(buttonType);
		window.setTimeout(() => setIsButtonAnimating(null), 300);
	};

	useEffect(() => {
		let active = true;
		const loadPlayerEffect = async () => {
			try {
				const config = await window.electronFeatures?.getUserConfig?.('music');
				if (active && PLAYER_EFFECTS.some((effect) => effect.id === config?.playerEffect)) {
					setCurrentPlayerEffect(config.playerEffect);
				}
			} catch (error) {
				console.error('加载音乐播放器设置失败:', error);
			}
		};
		loadPlayerEffect();
		return () => { active = false; };
	}, []);

	useEffect(() => {
		const requestedId = location.state?.mediaId;
		const requestedPath = location.state?.mediaPath;
		if ((!requestedId && !requestedPath) || !musicList.length) return;
		const requestKey = `${location.key}:${requestedId || ''}:${requestedPath || ''}`;
		if (handledRouteSelectionRef.current === requestKey) return;
		const requestedTrack = findRequestedMedia(musicList, { mediaId: requestedId, mediaPath: requestedPath });
		if (!requestedTrack) return;
		handledRouteSelectionRef.current = requestKey;
		selectMusic(requestedTrack, { autoplay: Boolean(location.state?.resume) });
	}, [location.key, location.state, musicList, selectMusic]);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (showVolumeSlider && volumeContainerRef.current && !volumeContainerRef.current.contains(event.target)) {
				setShowVolumeSlider(false);
			}
			if (
				isPlaylistOpen &&
				playlistRef.current &&
				notifyContext.currentNoficationType !== 'popover' &&
				!playlistRef.current.contains(event.target) &&
				!event.target.closest('.MusicPlayer_playlist_button')
			) {
				setIsPlaylistOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [isPlaylistOpen, notifyContext.currentNoficationType, showVolumeSlider]);

	useEffect(() => {
		if (!isDragging) return undefined;
		const handleMouseMove = (event) => {
			const progressBar = progressBarRef.current;
			if (!progressBar) return;
			const rect = progressBar.getBoundingClientRect();
			const progressPercent = ((event.clientX - rect.left) / rect.width) * 100;
			setTemporaryProgress(Math.min(Math.max(progressPercent, 0), 100));
		};
		const handleMouseUp = () => {
			if (temporaryProgress !== null) seekToProgress(temporaryProgress);
			setTemporaryProgress(null);
			setIsDragging(false);
		};
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	}, [isDragging, seekToProgress, temporaryProgress]);

	const handleProgressMouseDown = (event) => {
		if (!currentMusic || totalTime <= 0 || !progressBarRef.current) return;
		event.preventDefault();
		const rect = progressBarRef.current.getBoundingClientRect();
		const progressPercent = ((event.clientX - rect.left) / rect.width) * 100;
		setTemporaryProgress(Math.min(Math.max(progressPercent, 0), 100));
		setIsDragging(true);
	};

	const handleProgressClick = (event) => {
		if (isDragging || !currentMusic || totalTime <= 0) return;
		const rect = event.currentTarget.getBoundingClientRect();
		seekToProgress(((event.clientX - rect.left) / rect.width) * 100);
	};

	const togglePlayWithAnimation = () => {
		togglePlay();
		animateButton('play');
	};
	const handlePrevious = () => {
		playPrevious();
		animateButton('prev');
	};
	const handleNext = () => {
		playNext();
		animateButton('next');
	};
	const handleToggleMute = () => {
		toggleMute();
		animateButton('volume');
	};
	const togglePlayMode = () => {
		const currentIndex = PLAY_MODES.findIndex((mode) => mode.value === currentMode);
		setPlaybackMode(PLAY_MODES[(currentIndex + 1) % PLAY_MODES.length].value);
		animateButton('mode');
	};
	const togglePlaylist = () => {
		setIsPlaylistOpen((isOpen) => !isOpen);
		animateButton('playlist');
	};

	const handleSelectAudioFiles = async () => {
		try {
			const features = window.electronFeatures;
			if (typeof features?.selectAudioFiles !== 'function' || typeof features?.getAudioInfo !== 'function') {
				throw new Error('当前运行环境无法打开本地音乐文件');
			}
			const filePaths = await features.selectAudioFiles();
			if (!filePaths?.length) return;
			const info = await features.getAudioInfo(filePaths);
			if (!info?.length) throw new Error('所选文件无法读取，或格式不受支持');
			await features.addMusicToLibrary?.(info);
			selectMusic(info[0]);
		} catch (error) {
			console.error('选择音频文件失败:', error);
			notifyContext.notify.error(error?.message || '添加音乐失败');
		}
	};

	const handleImportMusicFolder = async () => {
		try {
			const importFolder = window.electronFeatures?.importMusicFolder;
			if (typeof importFolder !== 'function') throw new Error('当前运行环境无法打开本地音乐文件夹');
			const result = await importFolder();
			if (result?.status === 'imported') {
				notifyContext.notify.info(`已导入 ${result.count} 首音乐`);
			}
		} catch (error) {
			console.error('导入音乐文件夹失败:', error);
			notifyContext.notify.error(error?.message || '导入音乐文件夹失败');
		}
	};

	const handleSelectLyricsFile = async (event) => {
		event?.stopPropagation();
		if (!currentMusic) {
			notifyContext.notify.regularNotify.info('请先选择一首歌曲');
			return;
		}
		setIsSelectingLyrics(true);
		try {
			const lyricData = await selectLyricsFile();
			if (!lyricData) notifyContext.notify.regularNotify.info('未选择歌词文件或歌词格式不正确');
		} catch (error) {
			console.error('选择歌词文件失败:', error);
			notifyContext.notify.regularNotify.info('选择歌词文件失败');
		} finally {
			setIsSelectingLyrics(false);
		}
	};

	const showRemoveSongPopover = (event, song) => {
		event.stopPropagation();
		notifyContext.notify.popoverNotify.info(event, '确定要从播放列表中移除歌曲吗？', {
			confirmText: '确定',
			cancelText: '取消',
			onConfirm: () => {
				if (currentMusic && (currentMusic.id === song.id || currentMusic.path === song.path)) playNext();
				window.electronFeatures?.removeMusicFromLibrary?.(song.id);
			},
			onCancel: () => {}
		});
	};

	const handlePlayerEffectToggle = () => {
		const currentIndex = PLAYER_EFFECTS.findIndex((effect) => effect.id === currentPlayerEffect);
		const nextEffect = PLAYER_EFFECTS[(currentIndex + 1) % PLAYER_EFFECTS.length];
		setCurrentPlayerEffect(nextEffect.id);
		window.electronFeatures?.setMusicPlayerEffect?.(nextEffect.id);
		animateButton('effect');
	};

	const displayedProgress = temporaryProgress !== null ? temporaryProgress : progress;
	const displayedCurrentTime = temporaryProgress !== null ? (temporaryProgress / 100) * totalTime : currentTime;
	const currentEffectIndex = PLAYER_EFFECTS.findIndex((effect) => effect.id === currentPlayerEffect);
	const nextPlayerEffect = PLAYER_EFFECTS[(currentEffectIndex + 1) % PLAYER_EFFECTS.length];

	return (
		<div className="MusicPlayer_container" onPointerUp={releasePointerFocus}>
			<div className="MusicPlayer_display_container">
				{currentPlayerEffect === 'VinylPlayer' ? (
					<VinylPlayer
						isPlaying={isPlaying}
						labelColor="var(--utaha-accent, #9d2f5c)"
						coverImage={currentMusic?.coverUrl || currentMusic?.thumbnailUrl || null}
						onTogglePlay={currentMusic ? togglePlay : null}
					/>
				) : (
					<ImmersiveLyricsView
						albumColor={currentMusic?.color || '#6d3155'}
						secondaryColor={currentMusic?.secondaryColor || '#30223a'}
						title={currentMusic?.title || '未选择音乐'}
						artist={currentMusic?.artist || '未知艺术家'}
						lyrics={lyrics}
						currentTime={currentTime}
						onSeek={seekToTime}
					/>
				)}
				{!currentMusic && (
					<div className="MusicPlayer_emptyActions">
						<span>选择本地音乐，开始建立播放列表</span>
						<div>
							<button type="button" onClick={handleSelectAudioFiles}><AudioFileRoundedIcon />选择音乐文件</button>
							<button type="button" onClick={handleImportMusicFolder}><FolderOpenRoundedIcon />添加音乐文件夹</button>
						</div>
					</div>
				)}
			</div>
			<div className="MusicPlayer_controller_outer_container">
				<div className="MusicPlayer_info_container">
					<div className="MusicPlayer_info_cover_container">
						{currentMusic?.coverUrl
							? <img src={currentMusic.coverUrl} alt="专辑封面" />
							: <MusicNoteIcon aria-label="默认音乐封面" />}
					</div>
					<ScrollTitle
						itemClassName="MusicPlayer_info_title_container"
						title={currentMusic?.title || '未选择音乐'}
						hoverScroll
						handleClick={(event) => clickCopy(event, notifyContext.notify.regularNotify.info)}
						speed={60}
					/>
					<ScrollTitle
						itemClassName="MusicPlayer_info_artist_container"
						title={currentMusic?.artist || '未知艺术家'}
						hoverScroll
						handleClick={(event) => clickCopy(event, notifyContext.notify.regularNotify.info)}
						speed={60}
					/>
				</div>
				<div className="MusicPlayer_controller_container">
					<div className="MusicPlayer_controller_buttons">
						<button type="button" className={`MusicPlayer_control_button ${isButtonAnimating === 'mode' ? 'animate-click' : ''}`} onClick={togglePlayMode} title={PLAY_MODES.find((mode) => mode.value === currentMode)?.label}>
							{currentModeIcon}
						</button>
						<button type="button" className={`MusicPlayer_control_button ${isButtonAnimating === 'prev' ? 'animate-click' : ''}`} onClick={handlePrevious} disabled={!currentMusic} aria-label="上一首">
							<SkipPreviousIcon />
						</button>
						<button type="button" className={`MusicPlayer_control_button play_button ${isButtonAnimating === 'play' ? 'animate-click' : ''}`} onClick={togglePlayWithAnimation} disabled={!currentMusic} aria-label={isPlaying ? '暂停' : '播放'}>
							{isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
						</button>
						<button type="button" className={`MusicPlayer_control_button ${isButtonAnimating === 'next' ? 'animate-click' : ''}`} onClick={handleNext} disabled={!currentMusic} aria-label="下一首">
							<SkipNextIcon />
						</button>
						<div className="MusicPlayer_volume_container" onMouseEnter={() => setShowVolumeSlider(true)} onMouseLeave={() => setShowVolumeSlider(false)} ref={volumeContainerRef}>
							<button type="button" className={`MusicPlayer_control_button ${isButtonAnimating === 'volume' ? 'animate-click' : ''}`} onClick={handleToggleMute} aria-label={isMuted ? '取消静音' : '静音'}>
								{isMuted || volumeLevel === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
							</button>
							<div className={`MusicPlayer_volume_slider_container ${showVolumeSlider ? 'show' : ''}`}>
								<input type="range" min="0" max="100" value={volumeLevel} onChange={(event) => applyVolume(event.target.value)} onPointerUp={(event) => applyVolume(event.currentTarget.value, { persist: true })} onKeyUp={(event) => applyVolume(event.currentTarget.value, { persist: true })} className="MusicPlayer_volume_slider" style={{ '--volume-percentage': `${volumeLevel}%` }} aria-label="音量" />
							</div>
						</div>
						<button
							type="button"
							className={`MusicPlayer_control_button MusicPlayer_effect_button ${isButtonAnimating === 'effect' ? 'animate-click' : ''}`}
							onClick={handlePlayerEffectToggle}
							aria-label={`切换为${nextPlayerEffect.label}`}
							title={`切换为${nextPlayerEffect.label}`}
						>
							{nextPlayerEffect.icon}
						</button>
					</div>
					<div className="MusicPlayer_progress_container">
						<div className="MusicPlayer_time_current">{formatTime(displayedCurrentTime)}</div>
						<div className={`MusicPlayer_progress_bar ${isDragging ? 'dragging' : ''}`} onClick={handleProgressClick} onMouseDown={handleProgressMouseDown} ref={progressBarRef} role="slider" aria-label="音乐播放进度" aria-valuemin={0} aria-valuemax={Math.round(totalTime)} aria-valuenow={Math.round(displayedCurrentTime)} tabIndex={currentMusic && totalTime > 0 ? 0 : -1}>
							<div className="MusicPlayer_progress_completed" style={{ width: `${displayedProgress}%` }}><div className="MusicPlayer_progress_handle" /></div>
						</div>
						<div className="MusicPlayer_time_total">{formatTime(totalTime)}</div>
					</div>
				</div>
				<div className="MusicPlayer_buttons_container">
					<button type="button" className={`MusicPlayer_playlist_button ${isPlaylistOpen ? 'active' : ''} ${isButtonAnimating === 'playlist' ? 'animate-click' : ''}`} onClick={togglePlaylist} aria-label="播放列表"><QueueMusicIcon /></button>
				</div>
			</div>
			<div className={`MusicPlayer_playlist ${isPlaylistOpen ? 'MusicPlayer_playlist_open' : ''}`} ref={playlistRef}>
				<div className="MusicPlayer_playlist_header">
					<h3 className="MusicPlayer_playlist_title">播放列表 <span>({musicList.length}首)</span></h3>
					<button type="button" className="MusicPlayer_playlist_close_btn" aria-label="关闭音乐播放列表" onClick={togglePlaylist}><CloseIcon fontSize="small" /></button>
				</div>
				<div className="MusicPlayer_playlist_items">
					{musicList.length === 0 ? (
						<div className="MusicPlayer_playlist_empty">
							<div className="MusicPlayer_playlist_empty_text">暂无音乐</div>
							<button type="button" className="MusicPlayer_playlist_add_btn" onClick={handleSelectAudioFiles}>添加音乐文件</button>
						</div>
					) : musicList.map((song) => {
						const isCurrent = Boolean(currentMusic && (currentMusic.path === song.path || currentMusic.id === song.id));
						return (
							<div key={song.path || song.id} className={`MusicPlayer_playlist_item ${isCurrent ? 'MusicPlayer_playlist_item_playing' : ''}`} onDoubleClick={() => selectMusic(song)}>
								<div className="MusicPlayer_playlist_item_cover">{song.coverUrl ? <img src={song.coverUrl} alt="" /> : <MusicNoteIcon />}</div>
								<div className="MusicPlayer_playlist_item_info">
									<div className="MusicPlayer_playlist_item_title">{song.title}</div>
									<div className="MusicPlayer_playlist_item_artist">{song.artist} {song.album ? `- ${song.album}` : ''}</div>
								</div>
								{isCurrent && <div className="MusicPlayer_playlist_item_playing_indicator"><span>♪</span></div>}
								<button type="button" className="MusicPlayer_playlist_item_lyrics_indicator" title={song.lyricPath ? '已关联歌词，点击修改' : '点击关联歌词'} onClick={handleSelectLyricsFile} disabled={isSelectingLyrics || !isCurrent}><LinkIcon fontSize="small" className={song.lyricPath ? 'has-lyrics' : ''} /></button>
								<button type="button" className="MusicPlayer_playlist_remove_btn" onClick={(event) => showRemoveSongPopover(event, song)} title="从播放列表中移除">✕</button>
							</div>
						);
					})}
				</div>
				{musicList.length > 0 && <div className="MusicPlayer_playlist_footer"><button type="button" className="MusicPlayer_playlist_add_btn" onClick={handleSelectAudioFiles}>添加更多音乐</button></div>}
			</div>
		</div>
	);
};

export default MusicPlayer;
