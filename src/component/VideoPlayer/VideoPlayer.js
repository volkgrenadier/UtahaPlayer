import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import "./VideoPlayer.scss";
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
import CloseIcon from '@mui/icons-material/Close';
import MovieCreationIcon from '@mui/icons-material/MovieCreation';
import Replay10Icon from '@mui/icons-material/Replay10';
import Forward10Icon from '@mui/icons-material/Forward10';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import { useNotification } from '../../utils/NotificationProvider';
import { MAXVOLUME } from '../../config/reactConfig';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { toFileUrl } from '../../utils/mediaUrl';
import { findRequestedMedia } from '../../utils/mediaSelection';


const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const isSameVideo = (left, right) => Boolean(left && right && (
	(left.id && right.id && left.id === right.id) ||
	(left.path && right.path && left.path === right.path)
));

const browserFallbackFeatures = {
	getVideoList: async () => [],
	getUserConfig: async () => ({ videoLibrary: { videoList: [] }, volume: 25 }),
	onMessage: () => undefined,
	getBaseName: (filePath = '') => filePath.split(/[\\/]/).pop() || '',
	setVideoVolume: () => undefined,
	setVideoPlaybackMode: () => undefined,
	selectVideoFiles: async () => [],
	getVideoInfo: async () => [],
	addVideoToLibrary: async () => undefined,
	removeVideoFromLibrary: () => undefined
};

const electronFeatures = typeof window !== 'undefined' && window.electronFeatures
	? window.electronFeatures
	: browserFallbackFeatures;

const VideoPlayer = () => {
	const location = useLocation();
	// 视频播放器引用
	const playerContainerRef = useRef(null);
	const videoRef = useRef(null);
	const progressBarRef = useRef(null);
	const volumeContainerRef = useRef(null);
	const currentVideoRef = useRef(null);
	const activePlaybackVideoRef = useRef(null);
	const restoredPlaybackKeyRef = useRef(null);
	const isSwitchingSourceRef = useRef(false);
	const routeRequestRef = useRef(location.state || {});
	const routeAutoplayRef = useRef(false);
	// 视频状态管理
	const [isPlaying, setIsPlaying] = useState(false);
	const [totalTime, setTotalTime] = useState(0);
	const [progress, setProgress] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const [temporaryProgress, setTemporaryProgress] = useState(null);
	const [currentMode, setCurrentMode] = useState('sequential'); // sequential, repeat, repeat-one, shuffle
	// 音频状态管理
	const [isMuted, setIsMuted] = useState(false);
	const [showVolumeSlider, setShowVolumeSlider] = useState(false);
	const [volumeLevel, setVolumeLevel] = useState(25);
	const [lastVolume, setLastVolume] = useState(25);
	// 播放列表
	const [videoList, setVideoList] = useState([]);
	// 当前播放视频
	const [currentVideo, setCurrentVideo] = useState(null);
	// 播放列表显示状态
	const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
	const [isButtonAnimating, setIsButtonAnimating] = useState(null);
	const [isFullscreen, setIsFullscreen] = useState(false);
	// 错误提示框
	const notifyContext = useNotification();
	const { pause: pauseMusic } = useMusicPlayer();
	const notifyRef = useRef(notifyContext.notify);
	// 新增播放列表引用
	const playlistRef = useRef(null);
	currentVideoRef.current = currentVideo;

	useEffect(() => {
		notifyRef.current = notifyContext.notify;
	}, [notifyContext.notify]);


	// 按钮点击动画
	const animateButton = (buttonType) => {
		setIsButtonAnimating(buttonType);
		setTimeout(() => setIsButtonAnimating(null), 300);
	}

	// 监听视频元素事件
	const handleError = (error) => {
		const videoElement = videoRef.current;
		// 如果视频的 src 为空，跳过错误提示
		if (!videoElement?.src || videoElement.src === '') {
			return;
		}

		// 如果当前没有视频，跳过错误提示
		if (!currentVideo) {
			return;
		}

		console.error('视频播放错误:', error);
		console.error('视频路径:', currentVideo.path);
		console.error('视频元素错误代码:', videoElement?.error?.code);

		setIsPlaying(false);

		// 只有在确实是播放状态时才显示文件不存在错误
		if (videoElement?.error?.code === 4) {
			// 异步检查文件是否真的不存在
			if (electronFeatures?.checkFileExists && currentVideo?.path) {
				electronFeatures.checkFileExists(currentVideo.path)
					.then(exists => {
						console.log('异步检查文件存在性结果:', exists);
						if (!exists) {
							notifyContext.notify.error(`视频文件不存在\n路径: ${currentVideo.path}`, 5000);
						} else {
							console.log('文件存在但仍然播放失败，可能是格式问题');
							notifyContext.notify.error('视频格式不支持', 3000);
						}
					})
					.catch(err => {
						console.error('检查文件存在性失败:', err);
						notifyContext.notify.error('视频播放失败', 3000);
					});
			} else {
				notifyContext.notify.error('视频格式不支持或文件不存在', 3000);
			}
		} else {
			// 其他错误类型
			let errorMessage = '视频播放失败';
			switch (videoElement?.error?.code) {
				case 1:
					errorMessage = '视频播放被中止';
					break;
				case 2:
					errorMessage = '网络错误，无法加载视频';
					break;
				case 3:
					errorMessage = '视频解码失败，文件可能已损坏';
					break;
				default:
					errorMessage = '未知的视频播放错误';
			}
			notifyContext.notify.error(errorMessage, 3000);
		}
	};

	const handleCanPlay = () => {
		console.log('视频可以开始播放');
	};

	const handleLoadedData = () => {
		console.log('视频数据加载完成');
	};

	const persistPlaybackProgress = useCallback(async (track = activePlaybackVideoRef.current || currentVideoRef.current) => {
		const updatePlaybackProgress = electronFeatures?.updatePlaybackProgress;
		const videoElement = videoRef.current;
		if (!track || !videoElement || typeof updatePlaybackProgress !== 'function') return;

		const positionMs = Math.max(0, Math.round((videoElement.currentTime || 0) * 1000));
		const durationMs = Number.isFinite(videoElement.duration)
			? Math.max(0, Math.round(videoElement.duration * 1000))
			: Math.max(0, Math.round((track.playback?.durationMs || track.duration * 1000 || 0)));

		try {
			const result = await updatePlaybackProgress({
				mediaId: track.id || track.path,
				type: 'video',
				positionMs,
				durationMs
			});
			if (result?.status === 'error') {
				console.warn('保存视频播放进度失败:', result.code, result.message);
			}
		} catch (error) {
			console.warn('保存视频播放进度失败:', error);
		}
	}, []);

	const handlePlay = () => {
		pauseMusic();
		setIsPlaying(true);
	};
	const handlePause = () => {
		setIsPlaying(false);
		if (!isSwitchingSourceRef.current) persistPlaybackProgress();
	};

	const updateVideoTiming = useCallback(() => {
		const videoElement = videoRef.current;
		if (!videoElement) return;

		const duration = videoElement.duration;
		const current = videoElement.currentTime || 0;

		setCurrentTime(current);

		if (Number.isFinite(duration) && duration > 0) {
			setTotalTime(duration);
			setProgress(clamp((current / duration) * 100, 0, 100));
		}
	}, []);

	const handleLoadedMetadata = useCallback(() => {
		const videoElement = videoRef.current;
		const track = currentVideoRef.current;
		if (!videoElement || !track) {
			updateVideoTiming();
			return;
		}

		activePlaybackVideoRef.current = track;
		isSwitchingSourceRef.current = false;
		const playbackKey = track.id || track.path;
		const playback = track.playback;
		const restoreSeconds = Number(playback?.positionMs) / 1000;
		const canRestore = (
			playbackKey &&
			restoredPlaybackKeyRef.current !== playbackKey &&
			!playback?.completed &&
			Number.isFinite(restoreSeconds) &&
			restoreSeconds > 0 &&
			Number.isFinite(videoElement.duration) &&
			restoreSeconds < videoElement.duration
		);

		if (canRestore) {
			videoElement.currentTime = restoreSeconds;
			restoredPlaybackKeyRef.current = playbackKey;
		}
		updateVideoTiming();
		if (routeAutoplayRef.current) {
			routeAutoplayRef.current = false;
			videoElement.play().catch((error) => {
				console.warn('无法自动继续视频播放:', error);
			});
		}
	}, [updateVideoTiming]);


	// useEffect(() => {
	// 	const initializeVolume = async () => {
	// 		if (videoRef.current && volumeLevel !== null) {
	// 			try {
	// 				videoRef.current.volume = ((volumeLevel / 100) * MAXVOLUME) / 100;
	// 				console.log('初始化音量:', volumeLevel);
	// 			} catch (error) {
	// 				console.warn('初始化音量失败:', error);
	// 			}
	// 		}
	// 	};

	// 	// 延迟一点时间确保视频元素已挂载
	// 	const timer = setTimeout(initializeVolume, 100);

	// 	return () => clearTimeout(timer);
	// }, [volumeLevel]); // 当 volumeLevel 变化时重新初始化


	useEffect(() => {
		const videoElement = videoRef.current;

		return () => {
			if (!videoElement) return;

			persistPlaybackProgress();
			videoElement.pause();
			videoElement.src = ''; // 清空视频源

		};
	}, [persistPlaybackProgress]);

	useEffect(() => {
		const intervalId = window.setInterval(() => {
			if (videoRef.current && !videoRef.current.paused) persistPlaybackProgress();
		}, 5000);
		const persistBeforeExit = () => persistPlaybackProgress();
		window.addEventListener('pagehide', persistBeforeExit);
		window.addEventListener('beforeunload', persistBeforeExit);

		return () => {
			window.clearInterval(intervalId);
			window.removeEventListener('pagehide', persistBeforeExit);
			window.removeEventListener('beforeunload', persistBeforeExit);
		};
	}, [persistPlaybackProgress]);

	useEffect(() => {
		isSwitchingSourceRef.current = Boolean(currentVideo);
	}, [currentVideo]);


	// 初始化加载视频列表
	useEffect(() => {
		const loadVideoList = async () => {
			try {
				const list = await electronFeatures.getVideoList();
				if (list && Array.isArray(list)) {
					setVideoList(list);
					if (list.length > 0) {
						const request = routeRequestRef.current;
						const requestedVideo = findRequestedMedia(list, request);
						setCurrentVideo(requestedVideo || list[0]);
						routeAutoplayRef.current = Boolean(requestedVideo && request.resume);
						setCurrentTime(0);
						setTotalTime(0);
						setProgress(0);
					}
				}
			} catch (error) {
				console.error('加载音乐列表失败:', error);
			}
		};

		loadVideoList();

		// 监听视频列表更新事件
		const videoListUpdateListener = electronFeatures.onMessage('video-list-updated', (newList) => {
			if (newList && Array.isArray(newList)) {
				setVideoList(newList);
			}
		});

		// 监听转码开始事件
		const transcodeStartListener = electronFeatures.onMessage('video-transcode-start', (data) => {
			const fileName = electronFeatures.getBaseName(data.file);
			notifyRef.current.info(`开始转码视频 ${fileName} (${data.current}/${data.total})`, 2000);
		});

		// 监听转码成功事件
		const transcodeSuccessListener = electronFeatures.onMessage('video-transcode-success', (data) => {
			const fileName = electronFeatures.getBaseName(data.original);
			if (data.total && data.current) {
				notifyRef.current.success(`视频 ${fileName} 转码完成！(${data.current}/${data.total})`);
			} else {
				notifyRef.current.success(`视频 ${fileName} 转码完成！`);
			}
		});

		// 监听转码进度事件
		const transcodeProgressListener = electronFeatures.onMessage('video-transcode-progress', (data) => {
			const fileName = electronFeatures.getBaseName(data.file);
			notifyRef.current.info(`正在转码 ${fileName}: ${data.percent}%`, 1000);
		});

		// 监听转码失败事件
		const transcodeErrorListener = electronFeatures.onMessage('video-transcode-error', (data) => {
			const fileName = electronFeatures.getBaseName(data.file);
			const errorMsg = data.error || '未知错误';
			notifyRef.current.error(`视频 ${fileName} 转码失败: ${errorMsg}`, 5000);
			console.error('转码失败详情:', data);
		});

		return () => {
			if (typeof videoListUpdateListener === 'function') {
				videoListUpdateListener();
			}
			if (typeof transcodeStartListener === 'function') {
				transcodeStartListener();
			}
			if (typeof transcodeSuccessListener === 'function') {
				transcodeSuccessListener();
			}
			if (typeof transcodeProgressListener === 'function') {
				transcodeProgressListener();
			}
			if (typeof transcodeErrorListener === 'function') {
				transcodeErrorListener();
			}
		};
	}, []);
	// // 为了防止依赖问题导致的切换播放模式后导致的useEffect重新执行导致的暂停播放且无法继续播放的问题，单独处理handleEnded事件
	// useEffect(() => {
	// 	const video = videoRef.current;

	// 	const handleEnded = () => {
	// 		// 根据当前播放模式决定下一步操作
	// 		if (currentMode === 'single loop') {
	// 			// 单曲循环
	// 			video.currentTime = 0;
	// 			video.play().catch(err => console.error('重新播放失败:', err));
	// 		} else if (currentMode === 'sequential play') {
	// 			// 顺序播放
	// 			handleNext();
	// 		} else if (currentMode === 'shuffle') {
	// 			// 随机播放
	// 			playRandomSong();
	// 		}
	// 	};

	// 	video.addEventListener('ended', handleEnded);

	// 	return () => {
	// 		video.removeEventListener('ended', handleEnded);
	// 	};
	// }, [currentMode, currentVideo, videoList]);

	// 添加拖动进度条相关事件监听
	useEffect(() => {
		const handleMouseMove = (event) => {
			if (!isDragging || !progressBarRef.current) return;

			const rect = progressBarRef.current.getBoundingClientRect();
			const clickPosition = event.clientX - rect.left; // 计算鼠标在进度条上的相对位置
			const newProgress = (clickPosition / rect.width) * 100; // 转换为百分比
			const clampedProgress = Math.min(Math.max(newProgress, 0), 100); // 限制在 0-100% 之间

			setTemporaryProgress(clampedProgress);
			updateDisplayTime(clampedProgress);
		};
		const handleMouseUp = () => {
			if (isDragging && temporaryProgress != null && currentVideo && videoRef.current && Number.isFinite(videoRef.current.duration) && videoRef.current.duration > 0) {
				const duration = videoRef.current.duration;
				const newTime = (temporaryProgress / 100) * duration;
				videoRef.current.currentTime = newTime;
				setCurrentTime(newTime);
				setProgress(temporaryProgress);
			}
			setTemporaryProgress(null);
			setIsDragging(false);
		};
		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
		}
		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	}, [isDragging, temporaryProgress, currentVideo])

	useLayoutEffect(() => {
		const getUserConfig = async () => {
			let config = await electronFeatures.getUserConfig('video')
			setVideoList(config.videoLibrary.videoList || []);

			const initialVolume = config.volume || 25;
			setVolumeLevel(initialVolume);
			setLastVolume(initialVolume); // 🔥 初始化上次音量

			// 🔥 添加空值检查
			if (videoRef.current) {
				videoRef.current.volume = ((initialVolume / 100) * MAXVOLUME) / 100;
			}
		}

		getUserConfig()
	}, [])



	// 播放功能按钮列表
	const mainControlButtons = [
		{
			label: '播放模式',
			value: 'update-video-player-mode',
			iconList: [
				{
					label: '顺序播放',
					value: 'sequential',
					icon: <PlaylistPlayIcon />
				},
				{
					label: '列表循环',
					value: 'repeat',
					icon: <RepeatIcon />
				},
				{
					label: '单个循环',
					value: 'repeat-one',
					icon: <RepeatOneIcon />
				},
				{
					label: '随机播放',
					value: 'shuffle',
					icon: <ShuffleIcon />
				},
			]
		}
	];
	// 获取当前播放模式的图标
	const getCurrentModeIcon = () => {
		const mode = mainControlButtons[0].iconList.find(icon => icon.value === currentMode);
		return mode ? mode.icon : <RepeatIcon />;
	}
	const getCurrentModeLabel = () => {
		const mode = mainControlButtons[0].iconList.find(icon => icon.value === currentMode);
		return mode ? mode.label : '播放模式';
	}


	// 播放选中视频
	const playSelectedVideo = (video) => {
		console.log('播放选中视频:', video);
		persistPlaybackProgress();

		// 重置时间状态
		setCurrentTime(0);
		setTotalTime(0);

		// 重置进度条相关状态
		setProgress(0);
		setTemporaryProgress(null);
		setIsDragging(false);


		setCurrentVideo(video);

		// 等待下一个渲染周期，确保视频元素已经更新了 src
		setTimeout(() => {
			if (videoRef.current) {
				console.log('开始播放选中的视频:', video.title);
				// 设置视频源
				videoRef.current.src = toFileUrl(video.path);

				// 重新加载视频（这会触发 loadedmetadata 事件）
				videoRef.current.load();

				// 直接尝试播放
				setTimeout(() => {
					if (videoRef.current) {
						videoRef.current.play()
							.then(() => {
								setIsPlaying(true);
								console.log('视频播放成功');
							})
							.catch(err => {
								console.error('播放视频失败:', err);
								setIsPlaying(false);
								notifyContext.notify.error('视频播放失败: ' + err.message);
							});
					}
				}, 500); // 给元数据加载更多时间
			}
		}, 100);
	}

	// 切换播放状态
	const togglePlay = () => {
		if (!currentVideo && videoList.length > 0) {
			playSelectedVideo(videoList[0]);
			animateButton('play');
			return;
		}

		if (currentVideo && videoRef.current) {
			if (isPlaying) {
				setIsPlaying(false);
				videoRef.current.pause();
			} else {
				setIsPlaying(true);
				// 确保视频源已设置
				if (!videoRef.current.src || videoRef.current.src === '') {
					videoRef.current.src = toFileUrl(currentVideo.path);
					videoRef.current.load();
				}

				setIsPlaying(true);
				videoRef.current.play().catch(err => {
					console.error('播放视频失败:', err);
					setIsPlaying(false);
				});
			}
			animateButton('play');
		}
	};

	const seekBy = (seconds) => {
		const videoElement = videoRef.current;
		if (!currentVideo || !videoElement || !Number.isFinite(videoElement.duration) || videoElement.duration <= 0) {
			return;
		}

		const nextTime = clamp(videoElement.currentTime + seconds, 0, videoElement.duration);
		videoElement.currentTime = nextTime;
		setCurrentTime(nextTime);
		setProgress(clamp((nextTime / videoElement.duration) * 100, 0, 100));
		animateButton(seconds < 0 ? 'rewind' : 'forward');
	};

	const changeVolumeBy = (delta) => {
		const nextVolume = clamp(volumeLevel + delta, 0, 100);
		setVolumeLevel(nextVolume);
		setIsMuted(nextVolume === 0);

		if (nextVolume > 0) {
			setLastVolume(nextVolume);
		}

		if (videoRef.current) {
			videoRef.current.muted = nextVolume === 0;
			videoRef.current.volume = ((nextVolume / 100) * MAXVOLUME) / 100;
		}

		electronFeatures.setVideoVolume(nextVolume);
	};

	const toggleFullscreen = async () => {
		const target = playerContainerRef.current;
		if (!target) return;

		try {
			if (!document.fullscreenElement) {
				await target.requestFullscreen();
			} else {
				await document.exitFullscreen();
			}
			animateButton('fullscreen');
		} catch (error) {
			console.error('切换全屏失败:', error);
			notifyContext.notify.warning('无法切换全屏');
		}
	};

	const handlePlayerKeyDown = (event) => {
		const interactiveSelector = 'input, textarea, select';
		if (event.target.closest(interactiveSelector)) return;

		switch (event.key.toLowerCase()) {
			case ' ':
			case 'k':
				event.preventDefault();
				togglePlay();
				break;
			case 'arrowleft':
			case 'j':
				event.preventDefault();
				seekBy(-10);
				break;
			case 'arrowright':
			case 'l':
				event.preventDefault();
				seekBy(10);
				break;
			case 'arrowup':
				event.preventDefault();
				changeVolumeBy(5);
				break;
			case 'arrowdown':
				event.preventDefault();
				changeVolumeBy(-5);
				break;
			case 'm':
				event.preventDefault();
				toggleMute();
				break;
			case 'f':
				event.preventDefault();
				toggleFullscreen();
				break;
			default:
				break;
		}
	};

	const focusPlayerContainer = (event) => {
		if (event.target.closest('button, input, textarea, select')) return;
		playerContainerRef.current?.focus();
	};

	// 点击外部关闭音量控制器和播放列表
	useEffect(() => {
		function handleClickOutside(event) {
			// 音量控制器
			if (showVolumeSlider &&
				volumeContainerRef.current &&
				!volumeContainerRef.current.contains(event.target)) {
				setShowVolumeSlider(false);
			}
			// 播放列表
			if (isPlaylistOpen &&
				playlistRef.current &&
				notifyContext.currentNoficationType !== 'popover' &&
				!playlistRef.current.contains(event.target) &&
				!event.target.closest('.VideoPlayer_playlist_button')) {
				setIsPlaylistOpen(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showVolumeSlider, isPlaylistOpen, notifyContext])

	useEffect(() => {
		const handleFullscreenChange = () => {
			const nextFullscreen = Boolean(document.fullscreenElement);
			setIsFullscreen(nextFullscreen);
			if (nextFullscreen) {
				setIsPlaylistOpen(false);
				setShowVolumeSlider(false);
			}
		};

		document.addEventListener('fullscreenchange', handleFullscreenChange);
		return () => {
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
		};
	}, []);

	// 切换播放列表显示状态
	const togglePlaylist = () => {
		setIsPlaylistOpen(!isPlaylistOpen);
		animateButton('playlist');
	}

	// 选择本地视频后播放
	const handleSelectVideoFiles = async () => {
		try {
			notifyContext.notify.info('正在选择视频文件...');

			// 主进程已经处理了转码逻辑，返回的是处理后的文件路径
			const filePaths = await electronFeatures.selectVideoFiles();
			console.log('从主进程获取的文件路径:', filePaths);

			if (filePaths && filePaths.length > 0) {
				notifyContext.notify.info('正在处理视频文件信息...');

				// 获取视频信息（主进程返回的路径已经是转码后的路径）
				const info = await electronFeatures.getVideoInfo(filePaths);
				console.log('获取的视频信息:', info);

				if (info && info.length > 0) {
					// 先通知主进程添加到视频库
					await electronFeatures.addVideoToLibrary(info);

					// 等待一下，确保主进程处理完成
					await new Promise(resolve => setTimeout(resolve, 200));

					// 重新获取完整的视频列表
					const updatedList = await electronFeatures.getVideoList();
					console.log('更新后的视频列表:', updatedList);

					if (updatedList && Array.isArray(updatedList) && updatedList.length > 0) {
						setVideoList(updatedList);

						// 找到刚添加的视频（通过路径匹配）
						const newlyAddedVideo = updatedList.find(video =>
							filePaths.includes(video.path) ||
							info.some(infoItem => infoItem.path === video.path)
						);

						console.log('找到的新添加视频:', newlyAddedVideo);

						if (newlyAddedVideo) {
							playSelectedVideo(newlyAddedVideo);
						} else {
							console.error('在更新列表中找不到新添加的视频');
							// 尝试直接使用第一个视频
							if (updatedList.length > 0) {
								playSelectedVideo(updatedList[updatedList.length - 1]); // 使用最后一个（刚添加的）
							}
						}
					}

					notifyContext.notify.success(`成功添加 ${info.length} 个视频文件`);
				} else {
					notifyContext.notify.warning('未能获取视频文件信息');
				}
			} else {
				notifyContext.notify.info('未选择任何文件');
			}

		} catch (error) {
			console.error('选择视频文件失败：', error);
			notifyContext.notify.error(`选择视频文件失败: ${error.message || '未知错误'}`);
		}
	}

	// 显示移除视频的提示
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
		electronFeatures.removeVideoFromLibrary(video.id);
		// 判断删除的是否是当前正在播放的视频
		const isDeletingCurrentVideo = isSameVideo(currentVideo, video);

		if (isDeletingCurrentVideo) {
			// 删除的是当前播放的视频
			console.log('删除当前播放的视频');

			persistPlaybackProgress(video);
			// 停止播放
			setIsPlaying(false);

			// 清空视频元素
			if (videoRef.current) {
				try {
					videoRef.current.pause();
					videoRef.current.src = '';
					videoRef.current.load();
				} catch (err) {
					console.log('清空视频元素时出错:', err);
				}
			}

			// 清空当前视频
			setCurrentVideo(null);

			// 延迟处理下一个视频
			setTimeout(() => {
				handleNext();
			}, 100);
		} else {
			// 删除的是其他视频，只更新列表，不影响当前播放
			console.log('删除其他视频，保持当前播放状态');

			// 只更新视频列表，保持当前播放状态
			updateVideoListOnly();
		}

	};
	// 只更新视频列表，不影响当前播放
	const updateVideoListOnly = async () => {
		try {
			const list = await electronFeatures.getVideoList();
			if (list && Array.isArray(list)) {
				setVideoList(list);
				// 不改变 currentVideo 和 isPlaying 状态
				console.log('视频列表已更新，当前播放状态保持不变');
			}
		} catch (error) {
			console.error('更新视频列表失败:', error);
		}
	};

	// 播放上一个视频
	const handlePrevious = async () => {
		if (!currentVideo && videoList.length > 0) {
			playSelectedVideo(videoList[0]);
			animateButton('prev');
			return;
		}

		if (currentVideo && videoRef.current && videoRef.current.currentTime > 3) {
			videoRef.current.currentTime = 0;
			setCurrentTime(0);
			setProgress(0);
			animateButton('prev');
			return;
		}

		if (videoList.length > 1 && currentVideo) {
			const currentIndex = videoList.findIndex(video => isSameVideo(video, currentVideo));
			if (currentIndex !== -1) {
				const prevIndex = (currentIndex - 1 + videoList.length) % videoList.length;
				setCurrentVideo(videoList[prevIndex]);
				playSelectedVideo(videoList[prevIndex]);
				animateButton('prev');
			} else if (videoList.length > 0) {
				setCurrentVideo(videoList[0]);
				playSelectedVideo(videoList[0]);
				animateButton('prev');
			}
		}
	}

	const handleNext = async () => {
		if (!currentVideo && videoList.length > 0) {
			playSelectedVideo(videoList[0]);
			animateButton('next');
			return;
		}

		if (videoList.length === 1 && currentVideo && (currentMode === 'repeat' || currentMode === 'repeat-one')) {
			playSelectedVideo(currentVideo);
			animateButton('next');
			return;
		}

		if (videoList.length > 1 && currentVideo) {
			const currentIndex = videoList.findIndex(video => isSameVideo(video, currentVideo));
			if (currentIndex !== -1) {
				let nextIndex;
				
				switch (currentMode) {
					case 'repeat-one':
						// 单曲循环：重新播放当前视频
						nextIndex = currentIndex;
						break;
					case 'shuffle':
						// 随机播放：随机选择一个不同的视频
						if (videoList.length > 1) {
							do {
								nextIndex = Math.floor(Math.random() * videoList.length);
							} while (nextIndex === currentIndex);
						} else {
							nextIndex = currentIndex;
						}
						break;
					case 'repeat':
						// 列表循环：播放下一个，到末尾时回到开头
						nextIndex = (currentIndex + 1) % videoList.length;
						break;
					case 'sequential':
					default:
						// 顺序播放：播放下一个，到末尾时停止
						nextIndex = currentIndex + 1;
						if (nextIndex >= videoList.length) {
							// 已经是最后一个视频，停止播放
							console.log('已播放完所有视频');
							return;
						}
						break;
				}
				
				console.log('播放下一个视频:', videoList[nextIndex].title);
				playSelectedVideo(videoList[nextIndex]);
				animateButton('next');
			} else if (videoList.length > 0) {
				playSelectedVideo(videoList[0]);
				animateButton('next');
			}
		}
	}

	// 处理视频播放结束
	const handleVideoEnded = () => {
		setIsPlaying(false);
		persistPlaybackProgress();
		
		// 根据当前播放模式决定下一步操作
		if (currentMode === 'repeat-one') {
			// 单曲循环：重新播放当前视频
			if (videoRef.current) {
				videoRef.current.currentTime = 0;
				videoRef.current.play()
					.then(() => {
						setIsPlaying(true);
						console.log('单曲循环：重新播放当前视频');
					})
					.catch(err => console.error('重新播放失败:', err));
			}
		} else if (currentMode === 'shuffle') {
			// 随机播放：播放随机视频
			playRandomVideo();
		} else if (currentMode === 'repeat') {
			// 列表循环：播放下一个视频
			handleNext();
		} else if (currentMode === 'sequential') {
			// 顺序播放：播放下一个视频（到末尾时停止）
			handleNext();
		}
	};

	// 播放随机视频
	const playRandomVideo = () => {
		if (videoList.length > 1 && currentVideo) {
			const currentIndex = videoList.findIndex(video => isSameVideo(video, currentVideo));
			let randomIndex;

			// 确保不重复播放同一个视频
			do {
				randomIndex = Math.floor(Math.random() * videoList.length);
			} while (randomIndex === currentIndex && videoList.length > 1);

			console.log('随机播放视频:', videoList[randomIndex].title);
			playSelectedVideo(videoList[randomIndex]);
		} else if (videoList.length > 0) {
			// 如果列表中只有一个视频或当前视频不在列表中
			playSelectedVideo(videoList[0]);
		}
	};

	// 格式化时间显示
	const formatTime = (seconds) => {
		if (!seconds || isNaN(seconds)) return '00:00';

		const hours = Math.floor(seconds / 3600);//时
		const minutes = Math.floor((seconds % 3600) / 60); //分
		const secs = Math.floor(seconds % 60); //秒

		if (hours > 0) {
			// 如果超过1小时，显示 H:MM:SS 格式
			return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
		} else {
			// 小于1小时，显示 MM:SS 格式
			return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
		}

	}
	// 更新显示时间
	const updateDisplayTime = (progressPercent) => {
		if (videoRef.current && Number.isFinite(videoRef.current.duration) && videoRef.current.duration > 0) {
			const newTime = (progressPercent / 100) * videoRef.current.duration;
			setCurrentTime(newTime);
		}
	}

	// 进度条拖拽
	const handleProgressMouseDown = (event) => {
		event.preventDefault();
		if (!currentVideo || !progressBarRef.current || !videoRef.current || !Number.isFinite(videoRef.current.duration) || videoRef.current.duration <= 0) {
			return;
		}
		setIsDragging(true);

		// 计算点击位置对应的播放进度
		const rect = progressBarRef.current.getBoundingClientRect();// 获取进度条的位置信息
		const clickPosition = event.clientX - rect.left; // 计算鼠标在进度条上的相对位置
		const newProgress = (clickPosition / rect.width) * 100; // 转换为百分比
		const clampedProgress = Math.min(Math.max(newProgress, 0), 100); // 限制在 0-100% 之间

		setTemporaryProgress(clampedProgress); // 设置临时进度（拖拽时显示）
		updateDisplayTime(clampedProgress); //  更新时间显示
	}
	// 点击进度条
	const handleProgressClick = (event) => {
		if (isDragging) return; // 如果正在拖拽，不处理点击事件

		if (!currentVideo || !videoRef.current || !Number.isFinite(videoRef.current.duration) || videoRef.current.duration <= 0) {
			return;
		}

		const progressBar = event.currentTarget; //获取进度条元素
		const clickPosition = event.clientX - progressBar.getBoundingClientRect().left;//计算点击位置
		const newProgress = (clickPosition / progressBar.offsetWidth) * 100; //转换为百分比
		const clampedProgress = Math.min(Math.max(newProgress, 0), 100); //限制在 0-100% 之间

		videoRef.current.currentTime = (clampedProgress / 100) * videoRef.current.duration;
		setCurrentTime(videoRef.current.currentTime);
		setProgress(clampedProgress);
	}
	// 使用 useCallback 避免不必要的重渲染
	const progressStyle = useCallback(() => {
		if (isDragging && temporaryProgress !== null) {
			return { width: `${clamp(temporaryProgress, 0, 100)}%` };
		}

		return { width: `${clamp(progress, 0, 100)}%` };
	}, [isDragging, temporaryProgress, progress]);

	// 处理音量变化
	const handleVolumeChange = (event) => {
		const newVolume = clamp(parseInt(event.target.value, 10) || 0, 0, 100);
		setVolumeLevel(newVolume);

		if (videoRef.current) {
			videoRef.current.volume = ((newVolume / 100) * MAXVOLUME) / 100;

			// 🔥 当用户手动调整音量时，更新上次音量记录
			if (newVolume > 0) {
				setLastVolume(newVolume);
				setIsMuted(false);
				videoRef.current.muted = false;
			} else {
				setIsMuted(true);
				videoRef.current.muted = true;
			}
		}

	}

	// 保存更新音量
	const updateVolumeSave = (e) => {
		const newVolume = clamp(parseInt(e.target.value, 10) || 0, 0, 100);
		electronFeatures.setVideoVolume(newVolume);
	}
	// 切换静音状态
	const toggleMute = () => {
		// 🔥 添加空值检查
		if (!videoRef.current) return;

		if (isMuted || volumeLevel === 0) {
			// 🔥 当前是静音状态，恢复音量
			const restoreVolume = lastVolume > 0 ? lastVolume : 25;
			setIsMuted(false);
			setVolumeLevel(restoreVolume);
			videoRef.current.muted = false;
			videoRef.current.volume = ((restoreVolume / 100) * MAXVOLUME) / 100;
			electronFeatures.setVideoVolume(restoreVolume);
			// console.log('恢复音量:', restoreVolume);
		} else {
			// 🔥 当前不是静音，设置为静音
			setLastVolume(volumeLevel);
			setIsMuted(true);
			setVolumeLevel(0);
			videoRef.current.muted = true;
			videoRef.current.volume = 0;
			electronFeatures.setVideoVolume(0);
			// console.log('设置静音');
		}

		animateButton('volume');
	}

	const handleVolumeHover = (isHovering) => {
		setShowVolumeSlider(isHovering);
	}

	// 切换播放模式
	const togglePlayMode = () => {
		const modes = mainControlButtons[0].iconList.map(icon => icon.value);
		const currentIndex = modes.indexOf(currentMode);
		const nextIndex = (currentIndex + 1) % modes.length;
		const newMode = modes[nextIndex];

		setCurrentMode(newMode);
		animateButton('mode');

		// 可选：保存用户播放模式配置
		electronFeatures.setVideoPlaybackMode(newMode);
	};

	const getVideoMetaText = (video) => {
		if (!video) return '添加视频文件后开始播放';

		const resolution = video.width && video.height ? `${video.width}x${video.height}` : '';
		const duration = video.duration ? formatTime(video.duration) : '';
		return [video.codec, resolution, duration].filter(Boolean).join(' · ') || video.format || '本地视频';
	}

	const currentVideoTitle = currentVideo?.title || '未选择视频';
	const currentVideoMeta = currentVideo
		? getVideoMetaText(currentVideo)
		: videoList.length > 0
			? `${videoList.length} 个视频在列表中`
			: '添加视频文件后开始播放';
	const currentModeLabel = getCurrentModeLabel();
	const hasVideo = Boolean(currentVideo);
	const canStartPlayback = hasVideo || videoList.length > 0;
	const canSeek = hasVideo && totalTime > 0;
	const hasPreviousAction = hasVideo || videoList.length > 0;
	const hasNextAction = hasVideo || videoList.length > 0;
	const progressValue = canSeek ? Math.round(currentTime) : 0;
	const progressMax = canSeek ? Math.round(totalTime) : 0;

	return (
		<div
			className='VideoPlayer_container'
			ref={playerContainerRef}
			tabIndex={0}
			onKeyDown={handlePlayerKeyDown}
			onMouseDown={focusPlayerContainer}
		>
			<div className="VideoPlayer_diaplay_container">
				<video
					ref={videoRef}
					src={currentVideo?.path ? toFileUrl(currentVideo.path) : undefined}
					controls={false}
					preload="metadata"
					onPlay={handlePlay}
					onPause={handlePause}
					onError={handleError}
					onCanPlay={handleCanPlay}
					onLoadedData={handleLoadedData}
					onLoadedMetadata={handleLoadedMetadata}
					onDurationChange={updateVideoTiming}
					style={{ display: currentVideo ? 'block' : 'none' }}
					onEnded={handleVideoEnded}
					className="VideoPlayer_video_element"
					onTimeUpdate={updateVideoTiming}
				/>
				{
					!currentVideo && (
						<div className="no-video-placeholder">
							<MovieCreationIcon />
							<p>还没有选择视频</p>
							<span>添加本地视频后，可以在这里播放、切换和管理列表。</span>
							<button
								className="VideoPlayer_empty_add_btn"
								type="button"
								onClick={handleSelectVideoFiles}
							>
								添加视频文件
							</button>
						</div>
					)
				}
			</div>
			<div className='VideoPlayer_controller_outer_container'>
				<div className="VideoPlayer_progress_container">
					<div className="VideoPlayer_time_current">{formatTime(currentTime)}</div>
					<div
						className={`VideoPlayer_progress_bar ${isDragging ? 'dragging' : ''} ${!canSeek ? 'disabled' : ''}`}
						onClick={handleProgressClick}
						onMouseDown={handleProgressMouseDown}
						ref={progressBarRef}
						role="slider"
						aria-label="播放进度"
						aria-valuemin={0}
						aria-valuemax={progressMax}
						aria-valuenow={progressValue}
						aria-valuetext={`${formatTime(currentTime)} / ${formatTime(totalTime)}`}
						aria-disabled={!canSeek}
						tabIndex={canSeek ? 0 : -1}
					>
						<div className="VideoPlayer_progress_completed"
							style={progressStyle()}
						>
							<div className="VideoPlayer_progress_handle"></div>
						</div>
					</div>
					<div className="VideoPlayer_time_total">{formatTime(totalTime)}</div>
				</div>
				<div className="VideoPlayer_controlRow">
					<div className="VideoPlayer_info_container">
						<div className="VideoPlayer_info_cover_container">
							{
								currentVideo?.coverUrl
									? <img src={currentVideo.coverUrl} alt="封面" />
									: <MovieCreationIcon />
							}
						</div>
						<div className="VideoPlayer_info_text">
							<div className="VideoPlayer_info_title_container">{currentVideoTitle}</div>
							<div className="VideoPlayer_info_meta_container">{currentVideoMeta}</div>
						</div>
					</div>
					<div className="VideoPlayer_controller_container">
						<div className="VideoPlayer_center_controls">
							<button
								className={`VideoPlayer_control_button ${isButtonAnimating === 'mode' ? 'animate-click' : ''}`}
								type="button"
								onClick={handlePrevious}
								disabled={!hasPreviousAction}
								title="上一个 / 回到开头"
								aria-label="上一个 / 回到开头"
							>
								<SkipPreviousIcon />
							</button>
							<button
								className={`VideoPlayer_control_button ${isButtonAnimating === 'rewind' ? 'animate-click' : ''}`}
								type="button"
								onClick={() => seekBy(-10)}
								disabled={!canSeek}
								title="快退 10 秒"
								aria-label="快退 10 秒"
							>
								<Replay10Icon />
							</button>
							<button
								className={`VideoPlayer_control_button play_button ${isButtonAnimating === 'play' ? 'animate-click' : ''}`}
								type="button"
								onClick={togglePlay}
								disabled={!canStartPlayback}
								title={isPlaying ? '暂停' : '播放'}
								aria-label={isPlaying ? '暂停' : '播放'}
							>
								{isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
							</button>
							<button
								className={`VideoPlayer_control_button ${isButtonAnimating === 'forward' ? 'animate-click' : ''}`}
								type="button"
								onClick={() => seekBy(10)}
								disabled={!canSeek}
								title="快进 10 秒"
								aria-label="快进 10 秒"
							>
								<Forward10Icon />
							</button>
							<button
								className={`VideoPlayer_control_button ${isButtonAnimating === 'next' ? 'animate-click' : ''}`}
								type="button"
								onClick={handleNext}
								disabled={!hasNextAction}
								title="下一个"
								aria-label="下一个"
							>
								<SkipNextIcon />
							</button>
						</div>
					</div>
					<div className="VideoPlayer_buttons_container">
						<div className="VideoPlayer_aux_controls">
							<button
								className={`VideoPlayer_control_button VideoPlayer_mode_button ${isButtonAnimating === 'mode' ? 'animate-click' : ''}`}
								type="button"
								onClick={togglePlayMode}
								title={currentModeLabel}
								aria-label={`播放模式：${currentModeLabel}`}
							>
								{getCurrentModeIcon()}
								<span className="VideoPlayer_mode_text">{currentModeLabel}</span>
							</button>
							<div className="VideoPlayer_volume_container"
								onMouseEnter={() => handleVolumeHover(true)}
								onMouseLeave={() => handleVolumeHover(false)}
								ref={volumeContainerRef}
							>
								<button
									className={`VideoPlayer_control_button ${isButtonAnimating === 'volume' ? 'animate-click' : ''}`}
									type="button"
									onClick={toggleMute}
									title={isMuted || volumeLevel === 0 ? '取消静音' : '静音'}
									aria-label={isMuted || volumeLevel === 0 ? '取消静音' : '静音'}
								>
									{isMuted || volumeLevel === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
								</button>
								<div className={`VideoPlayer_volume_slider_container ${showVolumeSlider ? 'show' : ''}`}>
									<input
										type='range'
										min='0'
										max='100'
										value={volumeLevel}
										onChange={handleVolumeChange}
										onMouseUp={updateVolumeSave}
										className='VideoPlayer_volume_slider'
										style={{ "--volume-percentage": `${volumeLevel}%` }}
										aria-label="音量"
									/>
								</div>
							</div>
							<button
								className={`VideoPlayer_playlist_button ${isPlaylistOpen ? 'active' : ''} ${isButtonAnimating === 'playlist' ? 'animate-click' : ''}`}
								type="button"
								onClick={togglePlaylist}
								title="视频列表"
								aria-label="视频列表"
							>
								<QueueMusicIcon />
							</button>
							<button
								className={`VideoPlayer_control_button VideoPlayer_fullscreen_button ${isButtonAnimating === 'fullscreen' ? 'animate-click' : ''}`}
								type="button"
								onClick={toggleFullscreen}
								title={isFullscreen ? '退出全屏' : '全屏'}
								aria-label={isFullscreen ? '退出全屏' : '全屏'}
							>
								{isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* 播放列表面板 */}
			<div
				className={`VideoPlayer_playlist ${isPlaylistOpen ? 'VideoPlayer_playlist_open' : ''}`}
				ref={playlistRef}
			>
				<div className="VideoPlayer_playlist_header">
					<h3 className="VideoPlayer_playlist_title">
						视频列表 <span>({videoList.length}个)</span>
					</h3>
					<button
						className="VideoPlayer_playlist_close_btn"
						type="button"
						aria-label="关闭视频列表"
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
									type="button"
									onClick={handleSelectVideoFiles}
								>
									添加视频文件
								</button>
							</div>
						) : (videoList.map((video) => (
							<div
								key={video.path || video.id}
								className={`VideoPlayer_playlist_item ${isSameVideo(currentVideo, video) ? 'VideoPlayer_playlist_item_playing' : ''}`}
								role="button"
								tabIndex={0}
								onClick={() => {
									console.log('播放列表项播放:', video.title);
									playSelectedVideo(video);
								}}
								onKeyDown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										playSelectedVideo(video);
									}
								}}
								aria-label={`播放 ${video.title || '视频'}`}
							>
								<div className="VideoPlayer_playlist_item_info">
									<div className="VideoPlayer_playlist_item_title">
										{video.title}
									</div>
									<div className="VideoPlayer_playlist_item_meta">
										{getVideoMetaText(video)}
									</div>
								</div>
								<button
									className="VideoPlayer_playlist_remove_btn"
									type="button"
									onClick={(e) => showRemoveVideoPopover(e, video)}
									title="从播放列表中移除"
								>
									✕
								</button>
							</div>
						))
						)
					}

				</div>
				{
					videoList.length > 0 && (
						<div className="VideoPlayer_playlist_footer">
							<button
								className="VideoPlayer_playlist_add_btn"
								type="button"
								onClick={handleSelectVideoFiles}
							>
								添加更多视频
							</button>
						</div>
					)
				}
			</div>
		</div>
	)
}

export default VideoPlayer
