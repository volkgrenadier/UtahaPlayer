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
import { useNotification } from '../../utils/NotificationProvider';

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

	const notifyContext = useNotification();

	// 播放列表和当前音乐
	const [musicList, setMusicList] = useState([]);


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
	const handleSelectVideoFiles = async () => {
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
	useEffect(() => {
		const loadVideoList = async () => {
			try {
				const list = await window.electronFeatures.getVideoList();
				if(list && Array.isArray(list)){
					setVideoList(list);
					if(videoList.length>0){
						let index = list.findIndex(it => it.id === currentVideo?.id)
						if(index === -1){
							index = 0;
						}
						setCurrentVideo(list[index]);
					}
				}
			} catch (error) {
				console.error('加载音乐列表失败:', error);
			}
		};

		loadVideoList();

		// 监听音乐列表更新事件
		const videoListUpdateListener = window.electronFeatures.onMessage('video-list-updated',(newList)=>{
			if (newList && Array.isArray(newList)) {
                setMusicList(newList);
            }
		});

		return ()=>{
			if (typeof videoListUpdateListener === 'function'){
				videoListUpdateListener();
			}
		}
	}, []);

	// 播放选中歌曲
	const playSelectedVideo = (video) => {
		setCurrentVideo(video);
		setIsPlaying(true);
	}
	// 显示移除歌曲的提示
	const showRemoveVideoPopover = (e, video) => {
		e.stopPropagation(); // 阻止事件冒泡，避免触发歌曲播放
		notifyContext.notify.popoverNotify.info(e, '确定要从播放列表中移除歌曲吗？', {
			confirmText: '确定',
			cancelText: '取消',
			onConfirm: () => removeFromVideolist(e, video),
			onCancel: () => { }
		})
	}
	// 从播放列表中删除视频
	const removeFromVideolist = (e, video) => {
		// 通知主进程从列表中删除视频
		window.electronFeatures.sendMessage('remove-from-videolist', video.id);

		// 如果当前播放的是要删除视频，则尝试播放下一首
		// if(currentVideo && (currentVideo.id === video.id || currentVideo.path === video.path)){
		// 	handleNext();
		// }
	}

	return (
		<div className='VideoPlayer_container'>
			<div className="VideoPlayer_diaplay_container">
				{
					currentVideo && (
						<video
							key={currentVideo.path} // 确保切换视频时刷新 video 元素
							src={`file://${currentVideo.path}`} // 加载本地视频文件
							controls                           // 显示控制条
							autoPlay={isPlaying}    // 根据状态自动播放
							className="VideoPlayer_video_element"  // 可自定义样式类
							style={{
								width: '100%',
								height: '100%',
								objectFit: 'contain',
								backgroundColor: 'black',
							}}
							onEnded={() => setIsPlaying(false)}    // 播放结束后更新状态
						/>
					)
				}
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
						播放列表 <span>({videoList.length}个)</span>
					</h3>
					<button
						className="VideoPlayer_playlist_close_btn"
						onClick={togglePlaylist}
					>
						<CloseIcon fontSize="small" />
					</button>
				</div>
				<div className="VideoPlayer_playlist_items">
					{
						videoList.length === 0 ? (
							<div className="VideoPlayer_playlist_empty">
								<div className="VideoPlayer_playlist_empty_text">暂无视频</div>
								<button
									className="VideoPlayer_playlist_add_btn"
									onClick={handleSelectVideoFiles}
								>
									添加视频文件
								</button>
							</div>
						) : (videoList.map((video) => {
							<div
								key={video.path || video.id}
								className={`VideoPlayer_playlist_item ${currentVideo && (currentVideo.path === video.path || currentVideo.id === video.id) ? 'VideoPlayer_playlist_item_playing' : ''}`}
								onDoubleClick={() => playSelectedVideo(video)}
							>
								<div className="MusicPlayer_playlist_item_info">
									<div className="MusicPlayer_playlist_item_title">
										{video.title}
									</div>
								</div>
								<button
									className="MusicPlayer_playlist_remove_btn"
									onClick={(e) => showRemoveVideoPopover(e, video)}
									title="从播放列表中移除"
								>
									✕
								</button>
							</div>
						})
						)}
					{
						videoList.length > 0 && (
							<div className="VideoPlayer_playlist_footer">
								<button
									className="VideoPlayer_playlist_add_btn"
									onClick={handleSelectVideoFiles}
								>
									添加更多视频
								</button>
							</div>
						)
					}
				</div>
			</div>
		</div>
	)
}

export default VideoPlayer