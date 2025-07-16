import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
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
import './MusicPlayer.scss';
import VinylPlayer from './VinylPlayer';
import ImmersiveLyricsView from './ImmersiveLyricsView';
import { clickCopy } from '../../utils/toolsFunction';
import { MAXVOLUME } from '../../config/reactConfig';
import { useNotification } from '../../utils/NotificationProvider';
import defaultCoverImg from '../../assets/1.jpg';
import ScrollTitle from './ScrollTitle';

const MusicPlayer = () => {
    // 引用
    const audioRef = useRef(new Audio());
    const progressBarRef = useRef(null);
    const volumeContainerRef = useRef(null);
    const playlistRef = useRef(null); // 新增播放列表引用
    //  播放效果列表
    const playerEffectListRef = useRef([
        {
            id: 'ImmersiveLyrics',
            label: '沉浸式歌词',
            icon: () => <MovieIcon fontSize={'small'}/>
        },
        {
            id: 'VinylPlayer',
            label: '唱片播放',
            icon: () => <AlbumIcon fontSize={'small'}/>
        }
    ])
    // 音频状态管理
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentMode, setCurrentMode] = useState('sequential play');
    const [currentTime, setCurrentTime] = useState(0);
    const [totalTime, setTotalTime] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [temporaryProgress, setTemporaryProgress] = useState(null);
    const [isButtonAnimating, setIsButtonAnimating] = useState(null);
    const [volumeLevel, setVolumeLevel] = useState(25);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [currentPlayerEffect, setCurrentPlayerEffect] = useState(playerEffectListRef.current[0].id)  //  播放效果
    // 添加歌词相关状态
    const [lyrics, setLyrics] = useState([]);
    const [hasLyrics, setHasLyrics] = useState(false);
    const [isSelectingLyrics, setIsSelectingLyrics] = useState(false);
    
    // 播放列表和当前音乐
    const [musicList, setMusicList] = useState([]);
    
    const [currentMusic, setCurrentMusic] = useState(null);
    const [isPlaylistOpen, setIsPlaylistOpen] = useState(false); // 新增播放列表显示状态控制

    const notifyContext = useNotification()
    // 点击外部关闭音量控制器和播放列表
    useEffect(() => {
        function handleClickOutside(event) {
            // 处理音量控制器
            if (showVolumeSlider && 
                volumeContainerRef.current && 
                !volumeContainerRef.current.contains(event.target)) {
                setShowVolumeSlider(false);
            }
            // 处理播放列表点击外部关闭
            if (isPlaylistOpen && 
                playlistRef.current && 
                notifyContext.currentNoficationType !== 'popover' &&
                !playlistRef.current.contains(event.target) &&
                !event.target.closest('.MusicPlayer_playlist_button')) {
                setIsPlaylistOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showVolumeSlider, isPlaylistOpen, notifyContext]);
    
    // 添加拖动进度条相关事件监听
    useEffect(() => {
        const handleMouseMove = (event) => {
            if (!isDragging || !progressBarRef.current) return;
            
            const rect = progressBarRef.current.getBoundingClientRect();
            const clickPosition = event.clientX - rect.left;
            const newProgress = (clickPosition / rect.width) * 100;
            const clampedProgress = Math.min(Math.max(newProgress, 0), 100);
            
            setTemporaryProgress(clampedProgress);
            updateDisplayTime(clampedProgress);
        };
        
        const handleMouseUp = () => {
            if (isDragging && temporaryProgress !== null) {
                handleDragEnd();
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
    }, [isDragging, temporaryProgress]);

    // 初始化加载音乐列表
    useEffect(() => {
        const loadMusicList = async () => {
            try {
                const list = await window.electronFeatures.getMusicList();
                if (list && Array.isArray(list)) {
                    setMusicList(list);
                    if (list.length > 0) {
                        let index = list.findIndex(it => it.id === currentMusic?.id)
                        if (index === -1) { // 当前音乐不在列表中
                            index = 0;
                        }
                        setCurrentMusic(list[index]);
                    }
                }
            } catch (error) {
                console.error('加载音乐列表失败:', error);
            }
        };
        
        loadMusicList();
        
        // 监听音乐列表更新事件
        const musicListUpdateListener = window.electronFeatures.onMessage('music-list-updated', (newList) => {
            if (newList && Array.isArray(newList)) {
                setMusicList(newList);
            }
        });
        
        return () => {
            if (typeof musicListUpdateListener === 'function') {
                musicListUpdateListener();
            }
        };
    }, []);

    
    // 监听音频元素事件
    useEffect(() => {
        const audio = audioRef.current;
        
        const updateProgress = () => {
            const duration = audio.duration;
            const currentTime = audio.currentTime;
            if (duration) {
                const progressPercent = (currentTime / duration) * 100;
                setProgress(progressPercent);
                
                // 更新时间显示
                setCurrentTime(currentTime);
                setTotalTime(duration);
            }
        };
        
        const handleError = (e) => {
            console.error('音频播放错误:', e);
            setIsPlaying(false);
        };
        
        const handlePlay = () => {
            setIsPlaying(true);
        };
        
        const handlePause = () => {
            setIsPlaying(false);
        };
        
        // 添加事件监听
        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('error', handleError);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        
        // 初始化音量
        audio.volume = ((volumeLevel / 100) * MAXVOLUME) / 100;
        
        // 清理函数
        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('error', handleError);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            
            // 停止播放并释放资源
            audio.pause();
            audio.src = '';
        };
    }, []);
    
    // 为了防止依赖问题导致的切换播放模式后导致的useEffect重新执行导致的暂停播放且无法继续播放的问题，单独处理handleEnded事件
    useEffect(() => {
        const audio = audioRef.current;
        
        const handleEnded = () => {
            // 根据当前播放模式决定下一步操作
            if (currentMode === 'single loop') {
                // 单曲循环
                audio.currentTime = 0;
                audio.play().catch(err => console.error('重新播放失败:', err));
            } else if (currentMode === 'sequential play') {
                // 顺序播放
                handleNext();
            } else if (currentMode === 'shuffle') {
                // 随机播放
                playRandomSong();
            }
        };
        
        audio.addEventListener('ended', handleEnded);
        
        return () => {
            audio.removeEventListener('ended', handleEnded);
        };
    }, [currentMode, currentMusic, musicList]);

    // 当前音乐改变时，加载并播放
    useEffect(() => {
        if (currentMusic) {
            const audio = audioRef.current;
            audio.src = currentMusic.path;
            audio.load();
            audio.play().catch(err => {
                console.error('播放失败:', err);
                setIsPlaying(false);
            })
            // 尝试加载歌词
            loadLyricsForCurrentMusic();
        }
    }, [currentMusic]);
    // 播放列表发生变化时，若当前没有音乐正在播放，则播放第一首歌曲
    useEffect(() => {
        // 更新配置文件中的音乐列表和当前音乐
        if (musicList.length > 0 && !currentMusic) {
            setCurrentMusic(musicList[0]);
        } else if(musicList.length === 0) {
            audioRef.current.pause()
            audioRef.current.src = ''
            setCurrentMusic(null)
            setCurrentTime(0)
            setTotalTime(0)
            setProgress(0)
            setIsPlaying(false)
        }
    }, [musicList, currentMusic])
    useLayoutEffect(() => {
        const getUserConfig = async () => {
            let config = await window.electronFeatures.getUserConfig('music')
            setCurrentPlayerEffect(config.playerEffect || playerEffectListRef.current[0].id)
            setMusicList(config.musicLibrary.musicList || [])
            setVolumeLevel(config.volume || 25)
        }
        console.log('useLayoutEffect')
        getUserConfig()
    }, [])
    // 加载当前音乐的歌词
    const loadLyricsForCurrentMusic = async () => {
        if (!currentMusic || !currentMusic.path) return;
        
        try {
            const lyricDataObj = await window.electronFeatures.loadLyrics(currentMusic.path)
            if (lyricDataObj && lyricDataObj.lyricData.length > 0) {
                let lyricsLinkRes = await saveLyricsAssociation(currentMusic.id, lyricDataObj.lyricPath)
                if (lyricsLinkRes && lyricsLinkRes.success) {
                    setLyrics(lyricDataObj.lyricData)
                    setHasLyrics(true)
                }
            } else {
                setLyrics([])
                setHasLyrics(false)
            }
        } catch (error) {
            console.error('加载歌词失败:', error);
            setLyrics([]);
            setHasLyrics(false);
        }
    };
    
    // 手动选择歌词文件
    const handleSelectLyricsFile = async () => {
        if (!currentMusic) {
            // alert('请先选择一首歌曲');
            notifyContext.notify.regularNotify.info('请先选择一首歌曲')
            return;
        }
        
        setIsSelectingLyrics(true);
        
        try {
            const lyricDataObj = await window.electronFeatures.selectLyricsFile();
            if (lyricDataObj && lyricDataObj.lyricData.length > 0) {
                let lyricsLinkRes = await saveLyricsAssociation(currentMusic.id, lyricDataObj.lyricPath)
                if (lyricsLinkRes && lyricsLinkRes.success) {
                    setLyrics(lyricDataObj.lyricData);
                    // console.log('歌词', lyricDataObj.lyricData)
                    setHasLyrics(true);
                }
            } else {
                notifyContext.notify.regularNotify.info('未选择歌词文件或歌词格式不正确')
            }
        } catch (error) {
            console.error('选择歌词文件失败:', error);
            notifyContext.notify.regularNotify.info('选择歌词文件失败')
        } finally {
            setIsSelectingLyrics(false);
        }
    };
    // 保存歌词关联
    const saveLyricsAssociation = async (musicId, lyricPath) => {
        return await window.electronFeatures.saveLyricsAssociation(musicId, lyricPath);
    }
    // 主要播放功能按钮列表
    const mainControlButtons = [
        {
            label: '播放模式',
            value: 'update-music-player-mode',
            iconList: [
                {
                    label: '随机播放',
                    value: 'shuffle',
                    icon: <ShuffleIcon />
                },
                {
                    label: '顺序播放',
                    value: 'sequential play',
                    icon: <RepeatIcon />
                },
                {
                    label: '单曲循环',
                    value: 'single loop',
                    icon: <RepeatOneIcon />
                },
            ]
        }
    ];

    // 获取当前播放模式的图标
    const getCurrentModeIcon = () => {
        const mode = mainControlButtons[0].iconList.find(icon => icon.value === currentMode);
        return mode ? mode.icon : <RepeatIcon />;
    }
    
    // 切换播放状态
    const togglePlay = () => {
        if (currentMusic) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                if(audioRef.current.src == '' || !audioRef.current.src) {
                    return;
                }
                audioRef.current.play().catch(err => {
                    console.error('播放失败:', err);
                    setIsPlaying(false);
                });
            }
            animateButton('play');
        }
    };
    
    // 处理音量变化
    const handleVolumeChange = (e) => {
        const newVolume = parseInt(e.target.value);
        setVolumeLevel(newVolume);
        audioRef.current.volume = ((newVolume / 100) * MAXVOLUME) / 100;
        
        if (newVolume === 0) {
            setIsMuted(true);
            audioRef.current.muted = true;
        } else if (isMuted) {
            setIsMuted(false);
            audioRef.current.muted = false;
        }

        //  更新配置文件
        // console.log('更新音量', newVolume)
        // window.electronFeatures.updateUserConfig('music.volume', newVolume);
    };
    // 保存更新音量
    const updateVolumeSave = (e) => {
        const newVolume = parseInt(e.target.value);
        window.electronFeatures.updateUserConfig('music.volume', newVolume);
    }
    // 切换静音状态
    const toggleMute = () => {
        let lastVolume = volumeLevel;
        let currentIsMuted = isMuted;
        audioRef.current.muted = !currentIsMuted;
        setIsMuted(!currentIsMuted);
        setVolumeLevel(currentIsMuted ? lastVolume : 0); // 恢复音量为25%
        animateButton('volume');
        window.electronFeatures.updateUserConfig('music.volume', currentIsMuted ? lastVolume : 0);
    };
    
    // 处理进度条拖动结束
    const handleDragEnd = () => {
        if (isDragging && temporaryProgress !== null && currentMusic) {
            const duration = audioRef.current.duration;
            const newTime = (temporaryProgress / 100) * duration;
            audioRef.current.currentTime = newTime;
            setProgress(temporaryProgress);
            setTemporaryProgress(null);
        }
        setIsDragging(false);
    };
    
    // 添加选择本地音乐文件的功能
    const handleSelectAudioFiles = async () => {
        try {
            const filePaths = await window.electronFeatures.selectAudioFiles();
            if (filePaths && filePaths.length > 0) {
                // 从此处可以获取到所有音频信息
                const info = await window.electronFeatures.getAudioInfo(filePaths);
                if (info && info.length > 0) {
                    const newMusic = {
                        ...info[0]
                    };
                    
                    setCurrentMusic(newMusic);
                    setIsPlaying(true);
                    
                    // 可以选择添加到播放列表
                    // setMusicList(prev => [...prev, newMusic]);
                    

                    // 或者通知主进程添加到音乐库
                    await window.electronFeatures.sendMessage('add-music-to-library', info);
                }
            }
        } catch (error) {
            console.error('选择音频文件失败:', error);
        }
    };
    
    // 播放上一首歌
    const handlePrevious = () => {
        if (musicList.length > 1 && currentMusic) {
            const currentIndex = musicList.findIndex(music => music.id === currentMusic.id);
            if (currentIndex !== -1) {
                const prevIndex = (currentIndex - 1 + musicList.length) % musicList.length;
                setCurrentMusic(musicList[prevIndex]);
                animateButton('prev');
            } else if (musicList.length > 0) {
                // 当前歌曲不在列表中时，播放第一首
                setCurrentMusic(musicList[0]);
                animateButton('prev');
            }
        }
    };
    
    // 播放下一首歌
    const handleNext = () => {
        if (musicList.length > 1 && currentMusic) {
            const currentIndex = musicList.findIndex(music => music.id === currentMusic.id);
            if (currentIndex !== -1) {
                if (currentMode === 'sequential play') {
                    // 顺序播放
                    const nextIndex = (currentIndex + 1) % musicList.length;
                    setCurrentMusic(musicList[nextIndex]);
                    animateButton('next');
                } else if (currentMode === 'shuffle') {
                    // 随机播放
                    playRandomSong();
                } else if(currentMode === 'single loop') {
                    audioRef.current.currentTime = 0
                }
            } else if (musicList.length > 0) {
                // 当前歌曲不在列表中时，播放第一首
                setCurrentMusic(musicList[0]);
                animateButton('next');
            }
        }
    };

    // 播放随机歌曲
    const playRandomSong = () => {
        if (musicList.length > 1) {
            const currentIndex = currentMusic ? musicList.findIndex(music => music.id === currentMusic.id) : -1;
            let randomIndex;
            
            // 确保不重复播放同一首歌
            do {
                randomIndex = Math.floor(Math.random() * musicList.length);
            } while (randomIndex === currentIndex && musicList.length > 1);
            
            setCurrentMusic(musicList[randomIndex]);
        }
    };

    // 切换播放模式
    const togglePlayMode = () => {
        const modes = mainControlButtons[0].iconList.map(icon => icon.value);
        const currentIndex = modes.indexOf(currentMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        const newMode = modes[nextIndex];
        
        setCurrentMode(newMode);
        animateButton('mode');
        
        // 可选：保存用户播放模式配置
        window.electronFeatures.sendMessage('update-userconfig-music', {
            attrName: ['playMode'],
            value: [newMode]
        });
    };
    
    // 显示/隐藏音量滑块
    const handleVolumeHover = (isHovering) => {
        setShowVolumeSlider(isHovering);
    }
    
    // 切换播放列表显示状态
    const togglePlaylist = () => {
        setIsPlaylistOpen(!isPlaylistOpen);
        animateButton('playlist');
    }

    // 播放选中的歌曲
    const playSelectedSong = (song) => {
        setCurrentMusic(song);
        setIsPlaying(true);
    }
    // 显示移除歌曲的提示
    const showRemoveSonePopover = (e, song) => {
        e.stopPropagation(); // 阻止事件冒泡，避免触发歌曲播放
        notifyContext.notify.popoverNotify.info(e, '确定要从播放列表中移除歌曲吗？', {
            confirmText: '确定',
            cancelText: '取消',
            onConfirm: () => removeFromPlaylist(e, song),
            onCancel: () => {}
        })
    }
    // 从播放列表中删除歌曲
    const removeFromPlaylist = (e, song) => {
        // 通知主进程从列表中删除歌曲
        window.electronFeatures.sendMessage('remove-from-playlist', song.id);
        
        // 如果当前播放的就是要删除的歌曲，则尝试播放下一首
        if (currentMusic && (currentMusic.id === song.id || currentMusic.path === song.path)) {
            handleNext();
        }
    }
    
    // 按钮点击动画
    const animateButton = (buttonType) => {
        setIsButtonAnimating(buttonType);
        setTimeout(() => setIsButtonAnimating(null), 300);
    }
    
    // 处理进度条点击开始拖动
    const handleProgressMouseDown = (event) => {
        event.preventDefault();
        if(!currentMusic || !currentMusic.id) {
            return;
        }
        setIsDragging(true);
        
        const rect = progressBarRef.current.getBoundingClientRect();
        const clickPosition = event.clientX - rect.left;
        const newProgress = (clickPosition / rect.width) * 100;
        const clampedProgress = Math.min(Math.max(newProgress, 0), 100);
        
        setTemporaryProgress(clampedProgress);
        updateDisplayTime(clampedProgress);
    };
    
    // 点击进度条（而不是拖动）
    const handleProgressClick = (event) => {
        if (isDragging) return;
        
        const progressBar = event.currentTarget;
        const clickPosition = event.clientX - progressBar.getBoundingClientRect().left;
        const newProgress = (clickPosition / progressBar.clientWidth) * 100;
        const clampedProgress = Math.min(Math.max(newProgress, 0), 100);
        
        if (audioRef.current.duration) {
            audioRef.current.currentTime = (clampedProgress / 100) * audioRef.current.duration;
            setProgress(clampedProgress);
        }
    };
    // 更新显示时间
    const updateDisplayTime = (progressPercent) => {
        if (audioRef.current.duration) {
            const newTime = (progressPercent / 100) * audioRef.current.duration;
            setCurrentTime(newTime);
        }
    }
    
    // 格式化时间显示
    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    // 切换播放效果
    const handlePlayerEffectChange = (e) => {
        setCurrentPlayerEffect(e.target.value)
        window.electronFeatures.updateUserConfig('music.playerEffect', e.target.value)
    }

    
    return (
        <div className='MusicPlayer_container'>
            <div className='MusicPlayer_display_container'>
                {
                    currentPlayerEffect === 'VinylPlayer'
                    ? <VinylPlayer 
                        isPlaying={isPlaying}
                        labelColor="#1982FC"
                    />
                    : currentPlayerEffect === 'ImmersiveLyrics'
                    ? <ImmersiveLyricsView 
                        albumColor={currentMusic?.color || "#F5F7FA"}
                        secondaryColor={currentMusic?.secondaryColor || "#E4E8F0"}
                        title={currentMusic?.title || "未选择音乐"}
                        artist={currentMusic?.artist || "未知艺术家"}
                        lyrics={lyrics}
                        currentTime={currentTime}
                        onSeek={(time) => {
                            if (audioRef.current) {
                                audioRef.current.currentTime = time;
                            }
                        }}
                    />
                    : <></>
                }
            </div>
            <div className='MusicPlayer_controller_outer_container'>
                <div className="MusicPlayer_info_container">
                    <div className="MusicPlayer_info_cover_container">
                        <img src={currentMusic?.coverUrl || defaultCoverImg} alt="专辑封面" />
                    </div>
                    <ScrollTitle 
                        itemClassName="MusicPlayer_info_title_container"
                        title={currentMusic ? currentMusic.title : '未选择音乐'}
                        hoverScroll={true}
                        handleClick={e => {clickCopy(e, notifyContext.notify.regularNotify.info)}}
                        speed={60}
                    />
                    <ScrollTitle 
                        itemClassName="MusicPlayer_info_artist_container"
                        title={currentMusic ? currentMusic.artist : '未知艺术家'}
                        hoverScroll={true}
                        handleClick={e => {clickCopy(e, notifyContext.notify.regularNotify.info)}}
                        speed={60}
                    />
                    {/* <div 
                        className="MusicPlayer_info_title_container"
                        onClick={e => {clickCopy(e, notifyContext.notify.regularNotify.info)}}
                    >
                        {currentMusic ? currentMusic.title : '未选择音乐'}
                    </div>
                    <div 
                        className="MusicPlayer_info_artist_container"
                        onClick={e => {clickCopy(e, notifyContext.notify.regularNotify.info)}}
                    >
                        {currentMusic ? currentMusic.artist : '未知艺术家'}
                    </div> */}
                </div>
                <div className="MusicPlayer_controller_container">
                    <div className="MusicPlayer_controller_buttons">
                        <button 
                            className={`MusicPlayer_control_button ${isButtonAnimating === 'mode' ? 'animate-click' : ''}`} 
                            onClick={togglePlayMode}>
                            {getCurrentModeIcon()}
                        </button>
                        <button
                            className={`MusicPlayer_control_button ${isButtonAnimating === 'prev' ? 'animate-click' : ''}`}
                            onClick={handlePrevious}>
                            <SkipPreviousIcon />
                        </button>
                        <button 
                            className={`MusicPlayer_control_button play_button ${isButtonAnimating === 'play' ? 'animate-click' : ''}`} 
                            onClick={togglePlay}>
                            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                        </button>
                        <button 
                            className={`MusicPlayer_control_button ${isButtonAnimating === 'next' ? 'animate-click' : ''}`}
                            onClick={handleNext}>
                            <SkipNextIcon />
                        </button>
                        <div 
                            className="MusicPlayer_volume_container"
                            onMouseEnter={() => handleVolumeHover(true)}
                            onMouseLeave={() => handleVolumeHover(false)}
                            ref={volumeContainerRef}
                        >
                            <button 
                                className={`MusicPlayer_control_button ${isButtonAnimating === 'volume' ? 'animate-click' : ''}`} 
                                onClick={toggleMute}>
                                {isMuted || volumeLevel === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
                            </button>
                            <div className={`MusicPlayer_volume_slider_container ${showVolumeSlider ? 'show' : ''}`}>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    value={volumeLevel} 
                                    onChange={handleVolumeChange} 
                                    onMouseUp={updateVolumeSave}
                                    className="MusicPlayer_volume_slider"
                                    style={{"--volume-percentage": `${volumeLevel}%`}}
                                />
                            </div>
                        </div>
						{/* 选择播放样式设置 */}
                        <FormControl variant="standard" size={'small'}>
                            {/* <InputLabel 
                                id="MusicPlayer_control_button_playerPerformance_label"
                                style={{
                                    fontSize: '0.8rem'
                                }}
                            >播放效果</InputLabel> */}
                            <Select
                                labelId="MusicPlayer_control_button_playerPerformance_label"
                                className="MusicPlayer_control_button_playerPerformance_select"
                                value={currentPlayerEffect}
                                onChange={handlePlayerEffectChange}
                                label="Age"
                            >
                                {
                                    playerEffectListRef.current.map((it, id) => (
                                        <MenuItem 
                                            value={it.id}
                                            className="MusicPlayer_control_button_playerPerformance_select_item"
                                            style={{
                                                fontSize: '0.8rem'
                                            }}
                                            title={it.label}
                                        >
                                            {it.icon()}
                                        </MenuItem>
                                    ))
                                }
                            </Select>
                        </FormControl>
                    </div>
                    <div className="MusicPlayer_progress_container">
                        <div className="MusicPlayer_time_current">{formatTime(currentTime)}</div>
                        <div 
                            className={`MusicPlayer_progress_bar ${isDragging ? 'dragging' : ''}`} 
                            onClick={handleProgressClick}
                            onMouseDown={handleProgressMouseDown}
                            ref={progressBarRef}
                        >
                            <div 
                                className="MusicPlayer_progress_completed" 
                                style={{ width: `${temporaryProgress !== null ? temporaryProgress : progress}%` }}
                            >
                                <div className="MusicPlayer_progress_handle"></div>
                            </div>
                        </div>
                        <div className="MusicPlayer_time_total">{formatTime(totalTime)}</div>
                    </div>
                </div>
                <div className="MusicPlayer_buttons_container">
                    <div 
                        className={`MusicPlayer_playlist_button ${isPlaylistOpen ? 'active' : ''} ${isButtonAnimating === 'playlist' ? 'animate-click' : ''}`} 
                        onClick={togglePlaylist}>
                        <QueueMusicIcon />
                    </div>
                </div>
            </div>
            
            {/* 播放列表面板 */}
            <div 
                className={`MusicPlayer_playlist ${isPlaylistOpen ? 'MusicPlayer_playlist_open' : ''}`}
                ref={playlistRef}
            >
                <div className="MusicPlayer_playlist_header">
                    <h3 className="MusicPlayer_playlist_title">
                        播放列表 <span>({musicList.length}首)</span>
                    </h3>
                    <button 
                        className="MusicPlayer_playlist_close_btn" 
                        onClick={togglePlaylist}
                    >
                        <CloseIcon fontSize="small" />
                    </button>
                </div>
                
                <div className="MusicPlayer_playlist_items">
                    {musicList.length === 0 ? (
                        <div className="MusicPlayer_playlist_empty">
                            <div className="MusicPlayer_playlist_empty_text">暂无音乐</div>
                            <button 
                                className="MusicPlayer_playlist_add_btn"
                                onClick={handleSelectAudioFiles}
                            >
                                添加音乐文件
                            </button>
                        </div>
                    ) : (
                        musicList.map((song) => (
                            <div 
                                key={song.path || song.id} 
                                className={`MusicPlayer_playlist_item ${currentMusic && (currentMusic.path === song.path || currentMusic.id === song.id) ? 'MusicPlayer_playlist_item_playing' : ''}`}
                                onDoubleClick={() => playSelectedSong(song)}
                            >
                                <div className="MusicPlayer_playlist_item_cover">
                                    {song.coverUrl ? (
                                        <img src={song.coverUrl} alt={song.title} />
                                    ) : (
                                        <MusicNoteIcon />
                                    )}
                                </div>
                                <div className="MusicPlayer_playlist_item_info">
                                    <div className="MusicPlayer_playlist_item_title">
                                        {song.title}
                                    </div>
                                    <div className="MusicPlayer_playlist_item_artist">
                                        {song.artist} {song.album ? `- ${song.album}` : ''}
                                    </div>
                                </div>
                                {currentMusic && (currentMusic.path === song.path || currentMusic.id === song.id) && (
                                    <div className="MusicPlayer_playlist_item_playing_indicator">
                                        <span>♪</span>
                                    </div>
                                )}
                                <div 
                                    className="MusicPlayer_playlist_item_lyrics_indicator"
                                    title={song.lyricPath ? "已关联歌词，点击修改" : "点击关联歌词"}
                                    onClick={handleSelectLyricsFile}
                                >
                                    <LinkIcon 
                                        fontSize={'small'}
                                        className={song.lyricPath ? "has-lyrics" : ""} 
                                    />
                                </div>
                                <button 
                                    className="MusicPlayer_playlist_remove_btn" 
                                    onClick={(e) => showRemoveSonePopover(e, song)}
                                    title="从播放列表中移除"
                                >
                                    ✕
                                </button>
                            </div>
                        ))
                    )}
                </div>
                
                {musicList.length > 0 && (
                    <div className="MusicPlayer_playlist_footer">
                        <button
                            className="MusicPlayer_playlist_add_btn"
                            onClick={handleSelectAudioFiles}
                        >
                            添加更多音乐
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default MusicPlayer;