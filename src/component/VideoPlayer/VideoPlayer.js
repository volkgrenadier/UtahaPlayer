import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import "./VideoPlayer.scss";
import RepeatIcon from '@mui/icons-material/Repeat';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import CloseIcon from '@mui/icons-material/Close';
import defaultCoverImg from '../../assets/1.jpg';
import { useNotification } from '../../utils/NotificationProvider';


const VideoPlayer = () => {
	// 视频播放器引用
	const videoRef = useRef(null);
	const progressBarRef = useRef(null);
	// 视频状态管理
	const [isPlaying, setIsPlaying] = useState(false);
	const [totalTime, setTotalTime] = useState(0);
	const [progress, setProgress] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const [temporaryProgress, setTemporaryProgress] = useState(null);
	// 播放列表
	const [videoList, setVideoList] = useState([]);
	// 当前播放视频
	const [currentVideo, setCurrentVideo] = useState(null);
	// 播放列表显示状态
	const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
	const [isButtonAnimating, setIsButtonAnimating] = useState(null);
	// 错误提示框
	const notifyContext = useNotification();
	// 新增播放列表引用
	const playlistRef = useRef(null);


	// 按钮点击动画
	const animateButton = (buttonType) => {
		setIsButtonAnimating(buttonType);
		setTimeout(() => setIsButtonAnimating(null), 300);
	}

	// 监听视频元素事件
	const handleError = (error) => {
		const videoElement = videoRef.current;
		console.error('视频播放错误:', error);
		console.error('视频路径:', currentVideo?.path);
		console.error('视频元素错误代码:', videoElement?.error?.code);

		// 如果视频的 src 为空，跳过错误提示
		if (!videoElement?.src || videoElement.src === '') {
			console.log('视频 src 为空，跳过错误提示');
			return;
		}

		// 如果当前没有视频，跳过错误提示
		if (!currentVideo) {
			console.log('当前没有视频，跳过错误提示');
			return;
		}

		setIsPlaying(false);

		// 只有在确实是播放状态时才显示文件不存在错误
		if (videoElement?.error?.code === 4) {
			// 异步检查文件是否真的不存在
			if (window.electronFeatures?.checkFileExists && currentVideo?.path) {
				window.electronFeatures.checkFileExists(currentVideo.path)
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

	const handlePlay = () => {
		setIsPlaying(true);
	};
	const handlePause = () => {
		setIsPlaying(false);
	};
	// // 播放列表发生变化时，若当前没有视频正在播放，则播放第一首歌曲
	// useEffect(() => {
	// 	// 更新配置文件中的视频列表和当前视频
	// 	if (!currentVideo && videoList.length > 0) {
	// 		setCurrentVideo(videoList[0]);
	// 	}else if(videoList.length===0){
	// 		videoRef.current.pause();
	// 		videoRef.current.src = '';
	// 		setCurrentVideo(null);
	// 		setCurrentTime(0);
	// 		setTotalTime(0);
	// 		setProgress(0);
	// 		setIsPlaying(false);
	// 	}

	// }, [videoList, currentVideo]);


	useEffect(() => {
		const videoElement = videoRef.current;
		if (!videoElement) return;

		const updateProgress = () => {
			const duration = videoElement.duration;
			const current = videoElement.currentTime;

			// 🔥 修复：先更新时间，再计算进度
			if (current && !isNaN(current)) {
				setCurrentTime(current);
			}

			// 🔥 修复：正确计算进度百分比
			if (duration && !isNaN(duration) && duration !== Infinity && duration > 0) {
				setTotalTime(duration);

				// 🔥 使用当前时间计算进度（不是之前的 currentTime 状态）
				const progressPercent = (current / duration) * 100;
				setProgress(progressPercent);
			}
		};

		// 添加事件监听
		videoElement.addEventListener('timeupdate', updateProgress);
		videoElement.addEventListener('play', handlePlay);
		videoElement.addEventListener('pause', handlePause);
		videoElement.addEventListener('error', handleError);
		videoElement.addEventListener('canplay', handleCanPlay);
		videoElement.addEventListener('loadeddata', handleLoadedData);


		return () => {
			videoElement.removeEventListener('timeupdate', updateProgress);
			videoElement.removeEventListener('play', handlePlay);
			videoElement.removeEventListener('pause', handlePause);
			videoElement.removeEventListener('error', handleError);
			videoElement.removeEventListener('canplay', handleCanPlay);
			videoElement.removeEventListener('loadeddata', handleLoadedData);

			// 停止播放并释放资源
			videoElement.pause();
			videoElement.src = ''; // 清空视频源

		};
	}, [notifyContext]);


	// 初始化加载视频列表
	useEffect(() => {
		const loadVideoList = async () => {
			try {
				const list = await window.electronFeatures.getVideoList();
				if (list && Array.isArray(list)) {
					setVideoList(list);
					if (list.length > 0) {
						let index = list.findIndex(it => it.id === currentVideo?.id)
						if (index === -1) {
							index = 0;
						}
						setCurrentVideo(list[index]);

						// 🔥 添加自动播放逻辑
						// if (!currentVideo) {
						//     console.log('没有当前视频，自动播放第一个');
						//     setTimeout(() => {
						//         playSelectedVideo(list[index]);
						// 		setIsPlaying(true);
						//     }, 200);
						// }
					}
				}
			} catch (error) {
				console.error('加载音乐列表失败:', error);
			}
		};

		loadVideoList();

		// 监听视频列表更新事件
		const videoListUpdateListener = window.electronFeatures.onMessage('video-list-updated', (newList) => {
			if (newList && Array.isArray(newList)) {
				setVideoList(newList);
			}
		});

		// 监听转码开始事件
		const transcodeStartListener = window.electronFeatures.onMessage('video-transcode-start', (data) => {
			const fileName = window.electronFeatures.getBaseName(data.file);
			notifyContext.notify.info(`开始转码视频 ${fileName} (${data.current}/${data.total})`, 2000);
		});

		// 监听转码成功事件
		const transcodeSuccessListener = window.electronFeatures.onMessage('video-transcode-success', (data) => {
			const fileName = window.electronFeatures.getBaseName(data.original);
			if (data.total && data.current) {
				notifyContext.notify.success(`视频 ${fileName} 转码完成！(${data.current}/${data.total})`);
			} else {
				notifyContext.notify.success(`视频 ${fileName} 转码完成！`);
			}
		});

		// 监听转码进度事件
		const transcodeProgressListener = window.electronFeatures.onMessage('video-transcode-progress', (data) => {
			const fileName = window.electronFeatures.getBaseName(data.file);
			notifyContext.notify.info(`正在转码 ${fileName}: ${data.percent}%`, 1000);
		});

		// 监听转码失败事件
		const transcodeErrorListener = window.electronFeatures.onMessage('video-transcode-error', (data) => {
			const fileName = window.electronFeatures.getBaseName(data.file);
			const errorMsg = data.error || '未知错误';
			notifyContext.notify.error(`视频 ${fileName} 转码失败: ${errorMsg}`, 5000);
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
		const handleMouseUp = (event) => {
			if (isDragging && temporaryProgress != null) {
				handleDragEnd(event);
			}
		};
		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
		}
		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	}, [isDragging, temporaryProgress])


	useLayoutEffect(() => {
		const getUserConfig = async () => {
			let config = await window.electronFeatures.getUserConfig('video')
			setVideoList(config.videoLibrary.videoList || []);

			// if (!currentVideo) {
			//     console.log('没有当前视频，自动播放第一个');
			//     setTimeout(() => {
			//         playSelectedVideo(videoList[0]);
			// 		setIsPlaying(true);
			//     }, 200);
			// }

		}

		getUserConfig()
	}, [])


	// 播放选中视频
	const playSelectedVideo = (video) => {
		console.log('播放选中视频:', video);

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

	// 点击外部关闭音量控制器和播放列表
	useEffect(() => {
		function handleClickOutside(event) {
			// 音量控制器

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
	}, [isPlaylistOpen])

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
			const filePaths = await window.electronFeatures.selectVideoFiles();
			console.log('从主进程获取的文件路径:', filePaths);

			if (filePaths && filePaths.length > 0) {
				notifyContext.notify.info('正在处理视频文件信息...');

				// 获取视频信息（主进程返回的路径已经是转码后的路径）
				const info = await window.electronFeatures.getVideoInfo(filePaths);
				console.log('获取的视频信息:', info);

				if (info && info.length > 0) {
					// 先通知主进程添加到视频库
					await window.electronFeatures.sendMessage('add-video-to-library', info);

					// 等待一下，确保主进程处理完成
					await new Promise(resolve => setTimeout(resolve, 200));

					// 重新获取完整的视频列表
					const updatedList = await window.electronFeatures.getVideoList();
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
							// 验证文件是否真的存在
							try {
								const fileExists = await window.electronFeatures.checkFileExists(newlyAddedVideo.path);
								console.log('文件是否存在:', fileExists, '路径:', newlyAddedVideo.path);

								if (fileExists) {
									setCurrentVideo(newlyAddedVideo);

									// 等待一帧后开始播放
									setTimeout(() => {
										if (videoRef.current) {
											console.log('开始播放新视频，路径:', newlyAddedVideo.path);
											videoRef.current.load();
											videoRef.current.play()
												.then(() => {
													setIsPlaying(true);
													console.log('新视频播放成功');
												})
												.catch(err => {
													console.error('播放新视频失败:', err);
													setIsPlaying(false);
													notifyContext.notify.error('视频播放失败: ' + err.message);
												});
										}
									}, 100);
								} else {
									console.error('新添加的文件不存在:', newlyAddedVideo.path);
									notifyContext.notify.error(`添加的视频文件不存在\n路径: ${newlyAddedVideo.path}`);
								}
							} catch (checkError) {
								console.error('检查文件存在性失败:', checkError);
								notifyContext.notify.error('无法验证文件是否存在');
							}
						} else {
							console.error('在更新列表中找不到新添加的视频');
							// 尝试直接使用第一个视频
							if (updatedList.length > 0) {
								setCurrentVideo(updatedList[updatedList.length - 1]); // 使用最后一个（刚添加的）
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
		window.electronFeatures.sendMessage('remove-from-videolist', video.id);
		// 判断删除的是否是当前正在播放的视频
		const isDeletingCurrentVideo = currentVideo && (currentVideo.id === video.id || currentVideo.path === video.path);

		if (isDeletingCurrentVideo) {
			// 删除的是当前播放的视频
			console.log('删除当前播放的视频');

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
			const list = await window.electronFeatures.getVideoList();
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
		if (videoList.length > 1 && currentVideo) {
			const currentIndex = videoList.findIndex(video => video.id === currentVideo.id);
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

	// 播放下一个视频
	// const handleNext = async () => {
	// 	try {
	// 		// 重新获取最新的视频列表
	// 		const list = await window.electronFeatures.getVideoList();
	// 		if (list && Array.isArray(list)) {
	// 			setVideoList(list);

	// 			if (list.length > 0) {
	// 				// 如果当前视频存在，找到下一个
	// 				if (currentVideo) {
	// 					const currentIndex = list.findIndex(video =>
	// 						video.id === currentVideo.id || video.path === currentVideo.path
	// 					);

	// 					if (currentIndex !== -1 && currentIndex < list.length - 1) {
	// 						// 播放下一个视频
	// 						playSelectedVideo(list[currentIndex + 1]);
	// 					} else {
	// 						// 播放第一个视频（循环）
	// 						playSelectedVideo(list[0]);
	// 					}
	// 				} else {
	// 					// 当前没有视频，播放第一个
	// 					playSelectedVideo(list[0]);
	// 				}
	// 			} else {
	// 				// 没有视频了，清空当前视频
	// 				setCurrentVideo(null);
	// 				setIsPlaying(false);
	// 				if (videoRef.current) {
	// 					try {
	// 						videoRef.current.pause();
	// 						videoRef.current.src = '';
	// 						videoRef.current.load();
	// 					} catch (err) {
	// 						console.log('清空视频元素时出错:', err);
	// 					}
	// 				}
	// 			}
	// 		}
	// 	} catch (error) {
	// 		console.error('获取视频列表失败:', error);
	// 	}

	// 	animateButton('next');
	// };
	const handleNext = async () => {
		if (videoList.length > 1 && currentVideo) {
			const currentIndex = videoList.findIndex(video => video.id === currentVideo.id);
			if (currentIndex !== -1) {
				const nextIndex = (currentIndex + 1) % videoList.length;
				console.log('播放下一个视频:', videoList[nextIndex].title);
				playSelectedVideo(videoList[nextIndex]); // 🔥 这会自动重置进度
				animateButton('next');
			} else if (videoList.length > 0) {
				playSelectedVideo(videoList[0]);
				animateButton('next');
			}
		}
	}


	// 添加缺失的 toFileUrl 函数
	const toFileUrl = (filePath) => {
		if (!filePath) return '';
		// 将 Windows 路径的反斜杠替换为正斜杠，并进行 URL 编码
		const normalizedPath = filePath.replace(/\\/g, '/');
		return `file:///${encodeURI(normalizedPath)}`;
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
		if (videoRef.current.duration) {
			const newTime = (progressPercent / 100) * videoRef.current.duration;
			setCurrentTime(newTime);
		}
	}

	// 进度条拖拽
	const handleProgressMouseDown = (event) => {
		event.preventDefault();
		if (!currentVideo || !currentVideo.id) {
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

		const progressBar = event.currentTarget; //获取进度条元素
		const clickPosition = event.clientX - progressBar.getBoundingClientRect().left;//计算点击位置
		const newProgress = (clickPosition / progressBar.offsetWidth) * 100; //转换为百分比
		const clampedProgress = Math.min(Math.max(newProgress, 0), 100); //限制在 0-100% 之间

		if (videoRef.current && videoRef.current.duration) {
			// 直接设置音频播放位置
			videoRef.current.currentTime = (clampedProgress / 100) * videoRef.current.duration;
			setProgress(clampedProgress);
		}
	}
	// 拖拽结束
	const handleDragEnd = (event) => {
		if (isDragging && temporaryProgress != null && currentVideo) {
			const duration = videoRef.current.duration;
			const newTime = (temporaryProgress / 100) * duration;
			videoRef.current.currentTime = newTime;
			setProgress(temporaryProgress);
			setTemporaryProgress(null);
		}
		setIsDragging(false);
	}

	// 使用 useCallback 避免不必要的重渲染
	const progressStyle = useCallback(() => {
		if (isDragging && temporaryProgress !== null) {
			return { width: `${temporaryProgress}%` };
		}

		if (totalTime > 0 && currentTime >= 0) {
			const percentage = (currentTime / totalTime) * 100;
			return { width: `${Math.min(Math.max(percentage, 0), 100)}%` };
		}

		return { width: '0%' };
	}, [isDragging, temporaryProgress, currentTime, totalTime]);

	return (
		<div className='VideoPlayer_container'>
			<div className="VideoPlayer_diaplay_container">
				{
					currentVideo ? (
						<video
							ref={videoRef}
							src={currentVideo?.path ? toFileUrl(currentVideo.path) : ''} // 现在 toFileUrl 已定义
							controls={false}
							preload="metadata" // 改为 metadata，这样可以获取时长但不下载整个视频
							onPlay={handlePlay}
							onPause={handlePause}
							onError={handleError}
							onCanPlay={handleCanPlay}
							onLoadedData={handleLoadedData}
							style={{ width: '100%', height: '100%' }}
							onEnded={() => setIsPlaying(false)}
							className="VideoPlayer_video_element"
							onTimeUpdate={() => {
								// 直接在这里更新时间
								if (videoRef.current) {
									setCurrentTime(videoRef.current.currentTime);
									// 🔥 只在总时长为0时才设置，避免重复设置
									if (totalTime === 0 && videoRef.current.duration && !isNaN(videoRef.current.duration)) {
										setTotalTime(videoRef.current.duration);
										console.log('从 onTimeUpdate 获取总时长:', videoRef.current.duration);
									}
								}
							}}
						/>
					) : (
						<div className="no-video-placeholder">
							<p>请选择视频文件</p>
						</div>
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
						<button
							className={`VideoPlayer_control_button ${isButtonAnimating === 'prev' ? 'animate-click' : ''}`}
							onClick={handlePrevious}>
							<SkipPreviousIcon />
						</button>
						<button className={`VideoPlayer_control_button play_button ${isButtonAnimating === 'play' ? 'animate-click' : ''}`}
							onClick={togglePlay}>
							{isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
						</button>
						<button
							className={`VideoPlayer_control_button ${isButtonAnimating === 'next' ? 'animate-click' : ''}`}
							onClick={handleNext}
						>
							<SkipNextIcon />
						</button>
						<div className="VideoPlayer_volume_container">
							<button className='VideoPlayer_control_button'>
								<VolumeOffIcon />
							</button>
							{/* 音量控制条 */}
							<div className="Videolayer_volume_slider_container">
								<input type='range' min='0' max='100' className='VideoPlayer_volume_slider' />
							</div>
						</div>
					</div>
					{/* 播放进度条 */}
					<div className="VideoPlayer_progress_container">
						<div className="VideoPlayer_time_current">{formatTime(currentTime)}</div>
						<div
							className={`VideoPlayer_progress_bar ${isDragging ? 'dragging' : ''}`}
							onClick={handleProgressClick}
							onMouseDown={handleProgressMouseDown}
							ref={progressBarRef}
						>
							<div className="VideoPlayer_progress_completed"
								style={progressStyle()}
							>
								<div className="VideoPlayer_progress_handle"></div>
							</div>
						</div>
						<div className="VideoPlayer_time_total">{formatTime(totalTime)}</div>
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
				ref={playlistRef}
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
						) : (videoList.map((video) => (
							<div
								key={video.path || video.id}
								className={`VideoPlayer_playlist_item ${currentVideo && (currentVideo.path === video.path || currentVideo.id === video.id) ? 'VideoPlayer_playlist_item_playing' : ''}`}
								onDoubleClick={() => {
									console.log('双击播放列表项:', video.title); // 🔥 添加调试信息
									playSelectedVideo(video);
								}}
							>
								<div className="VideoPlayer_playlist_item_info">
									<div className="VideoPlayer_playlist_item_title">
										{video.title}
									</div>
								</div>
								<button
									className="VideoPlayer_playlist_remove_btn"
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