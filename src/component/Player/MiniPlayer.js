import React from 'react';
import { useNavigate } from 'react-router-dom';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import './MiniPlayer.scss';

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

const MiniPlayer = () => {
	const navigate = useNavigate();
	const {
		currentMusic,
		isPlaying,
		isMuted,
		currentTime,
		totalTime,
		progress,
		volumeLevel,
		togglePlay,
		playPrevious,
		playNext,
		seekToProgress,
		applyVolume,
		toggleMute
	} = useMusicPlayer();

	const openMusic = () => navigate('/music');
	const stopNavigation = (event) => event.stopPropagation();
	const hasTrack = Boolean(currentMusic);

	return (
		<section
			className="GlobalMiniPlayer"
			aria-label="全局音乐播放器"
			onClick={openMusic}
			onPointerUp={releasePointerFocus}
			onKeyDown={(event) => {
				if (event.key === 'Enter') openMusic();
			}}
			tabIndex={0}
		>
			<div className="GlobalMiniPlayer_track">
				<div className="GlobalMiniPlayer_cover" aria-hidden="true">
					{currentMusic?.coverUrl
						? <img src={currentMusic.coverUrl} alt="" />
						: <MusicNoteIcon />}
				</div>
				<div className="GlobalMiniPlayer_meta">
					<strong title={currentMusic?.title || ''}>{currentMusic?.title || '尚未选择音乐'}</strong>
					<span title={currentMusic?.artist || ''}>{currentMusic?.artist || '前往音乐库开始播放'}</span>
				</div>
			</div>

			<div className="GlobalMiniPlayer_transport" onClick={stopNavigation}>
				<div className="GlobalMiniPlayer_buttons">
					<button type="button" onClick={playPrevious} disabled={!hasTrack} aria-label="上一首">
						<SkipPreviousIcon />
					</button>
					<button
						type="button"
						className="GlobalMiniPlayer_play"
						onClick={togglePlay}
						disabled={!hasTrack}
						aria-label={isPlaying ? '暂停' : '播放'}
					>
						{isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
					</button>
					<button type="button" onClick={playNext} disabled={!hasTrack} aria-label="下一首">
						<SkipNextIcon />
					</button>
				</div>
				<div className="GlobalMiniPlayer_progressRow">
					<span>{formatTime(currentTime)}</span>
					<input
						type="range"
						min="0"
						max="100"
						step="0.1"
						value={Number.isFinite(progress) ? progress : 0}
						onChange={(event) => seekToProgress(event.target.value)}
						disabled={!hasTrack || totalTime <= 0}
						aria-label="音乐播放进度"
						style={{ '--mini-progress': `${Number.isFinite(progress) ? progress : 0}%` }}
					/>
					<span>{formatTime(totalTime)}</span>
				</div>
			</div>

			<div className="GlobalMiniPlayer_volume" onClick={stopNavigation}>
				<button type="button" onClick={toggleMute} aria-label={isMuted ? '取消静音' : '静音'}>
					{isMuted || volumeLevel === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
				</button>
				<input
					type="range"
					min="0"
					max="100"
					value={volumeLevel}
					onChange={(event) => applyVolume(event.target.value)}
					onPointerUp={(event) => applyVolume(event.currentTarget.value, { persist: true })}
					onKeyUp={(event) => applyVolume(event.currentTarget.value, { persist: true })}
					aria-label="音乐音量"
					style={{ '--mini-volume': `${volumeLevel}%` }}
				/>
			</div>
		</section>
	);
};

export default MiniPlayer;
