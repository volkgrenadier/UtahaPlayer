import React, { useState, useEffect, useRef, useLayoutEffect, use } from 'react';
import "./VideoPlayer.scss";
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
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
import defaultCoverImg from '../../assets/1.jpg';

const VideoPlayer = () => {

	// 视频状态管理
	const [isPlaying, setIsPlaying] = useState(false);
	// 播放列表
	const [videoList, setVideoList] = useState([]);
	// 当前播放视频
	const [currentVideo, setCurrentVideo] = useState(null);
	// 播放列表显示状态
	const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
	const [isButtonAnimating, setIsButtonAnimating] = useState(null);
	// 按钮点击动画
	const animateButton = (buttonType) => {
		setIsButtonAnimating(buttonType);
		setTimeout(() => setIsButtonAnimating(null), 300);
	}

	// 切换播放列表显示状态
	const togglePlaylist = () => {
		setIsPlaylistOpen(!isPlaylistOpen);
		animateButton('playlist');
	}

	// 添加选择本地视频文件功能
	const handleSelectAudioFiles = async () => {
		try {
			const filePaths = await window.electronFeatures.selectVideoFiles();
			if (filePaths && filePaths.length > 0) {
				// 获取视频信息
				const info = await window.electronFeatures.getVideoInfo(filePaths);
				if (info && info.length > 0) {
					const newVideo = {
						...info[0]
					};
					setCurrentVideo(newVideo);
					setIsPlaying(true);

					// 通知主进程添加到音乐库
					await window.electronFeatures.sendMessage('add-video-to-library', info);
				}
			}

		} catch (error) {
			console.log('选择视频文件失败：', error);
		}
	}
	// 初始化加载视频列表
	useEffect(()=>{
		const loadVideoList = async()=>{
			try{

			}catch(error){
				console.error('加载音乐列表失败:', error);
			}
		}
	},[])

	return (
		<div className='VideoPlayer_container'>
			<div className="VideoPlayer_diaplay_container">
				aaa1
			</div>
			<div className='VideoPlayer_controller_outer_container'>

				<div className="VideoPlayer_info_container">
					{/* 播放区域信息设置 */}
					<div className="VideoPlayer_info_cover_container">
						<img src={currentVideo?.coverUrl || defaultCoverImg} alt="封面" />
					</div>
				</div>
				<div className="VideoPlayer_controller_container">
					<div className="VideoPlayer_controller_buttons">
						<button className="VideoPlayer_control_button"><RepeatIcon /></button>
						<button className="VideoPlayer_control_button"><SkipPreviousIcon /></button>
						<button className="VideoPlayer_control_button">{isPlaying ? <PauseIcon /> : <PlayArrowIcon />} </button>
						<button className="VideoPlayer_control_button"><SkipNextIcon /></button>
						<div className="VideoPlayer_volume_container">
							<button className='VideoPlayer_control_button'>
								<VolumeOffIcon />
							</button>
							{/* 音量控制条 */}
							<div className="VideoPlayer_volume_slider_container">
								<input type='range' min='0' max='100' className='VideoPlayer_volume_slider' />
							</div>
						</div>
					</div>
					<div className="VideoPlayer_progress_container">
						<div className="VideoPlayer_time_current"></div>
						<div className="VideoPlayer_progress_bar">
							<div className="VideoPlayer_progress_completed">
								<div className="VideoPlayer_progress_handle"></div>
							</div>
						</div>
						<div className="VideoPlayer_time_total"></div>
					</div>
				</div>
				<div className="VideoPlayer_buttons_container">
					<div className={`VideoPlayer_playlist_button ${isPlaylistOpen ? 'active' : ''} ${isButtonAnimating === 'playlist' ? 'animate-click' : ''}`}
						onClick={togglePlaylist}
					>
						<QueueMusicIcon />
					</div>
				</div>
			</div>

			{/* 播放列表面板 */}
			<div
				className={`VideoPlayer_playlist ${isPlaylistOpen ? 'VideoPlayer_playlist_open' : ''}`}
			>
				<div className="VideoPlayer_playlist_header">
					<h3 className="VideoPlayer_playlist_title">
						播放列表
					</h3>
					<button
						className="VideoPlayer_playlist_close_btn"
						onClick={togglePlaylist}
					>
						<CloseIcon fontSize="small" />
					</button>
				</div>
				<div className="VideoPlayer_playlist_items">

				</div>
			</div>
		</div>
	)
}

export default VideoPlayer