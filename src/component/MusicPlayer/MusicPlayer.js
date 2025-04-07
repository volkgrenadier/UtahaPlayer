import React, { useState, useEffect, useRef } from 'react';
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
import './MusicPlayer.scss';
import VinylPlayer from './VinylPlayer';
import defaultCoverImg from '../../assets/1.jpg';

const MusicPlayer = () => {
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
    const [volumeLevel, setVolumeLevel] = useState(75);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    
    // 播放列表和当前音乐
    const [musicList, setMusicList] = useState([]);
    const [currentMusic, setCurrentMusic] = useState(null);
    
    // 引用
    const audioRef = useRef(new Audio());
    const progressBarRef = useRef(null);
    const volumeContainerRef = useRef(null);

    // 点击外部关闭音量控制器
    useEffect(() => {
        function handleClickOutside(event) {
            if (showVolumeSlider && 
                volumeContainerRef.current && 
                !volumeContainerRef.current.contains(event.target)) {
                setShowVolumeSlider(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showVolumeSlider]);
    
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
            if (isDragging && temporaryProgress !== null && currentMusic) {
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
                        setCurrentMusic(list[0]);
                    }
                }
            } catch (error) {
                console.error('加载音乐列表失败:', error);
            }
        };
        
        loadMusicList();
        
        // 监听音乐列表更新事件
        const removeListener = window.electronFeatures.onMessage('music-list-updated', (newList) => {
            if (newList && Array.isArray(newList)) {
                setMusicList(newList);
                if (newList.length > 0 && !currentMusic) {
                    setCurrentMusic(newList[0]);
                }
            }
        });
        
        return () => {
            if (typeof removeListener === 'function') {
                removeListener();
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
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        
        // 初始化音量
        audio.volume = volumeLevel / 100;
        
        // 清理函数
        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            
            // 停止播放并释放资源
            audio.pause();
            audio.src = '';
        };
    }, [currentMode]);

    // 当前音乐改变时，加载并播放
    useEffect(() => {
        if (currentMusic) {
            const audio = audioRef.current;
            audio.src = currentMusic.path;
            audio.load();
            
            if (isPlaying) {
                audio.play().catch(err => {
                    console.error('播放失败:', err);
                    setIsPlaying(false);
                });
            }
        }
    }, [currentMusic]);
    
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
        audioRef.current.volume = newVolume / 100;
        
        if (newVolume === 0) {
            setIsMuted(true);
            audioRef.current.muted = true;
        } else if (isMuted) {
            setIsMuted(false);
            audioRef.current.muted = false;
        }
    };
    
    // 切换静音状态
    const toggleMute = () => {
        audioRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
        animateButton('volume');
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
    const handleSelectAudioFile = async () => {
        try {
            const filePath = await window.electronFeatures.selectAudioFile();
            if (filePath) {
                // 获取音频信息
                const info = await window.electronFeatures.getAudioInfo(filePath);
                if (info) {
                    
                    const newMusic = {
                        id: filePath,
                        path: filePath,
                        title: info.title,
                        artist: info.artist
                    };
                    
                    setCurrentMusic(newMusic);
                    setIsPlaying(true);
                    
                    // 可以选择添加到播放列表
                    // setMusicList(prev => [...prev, newMusic]);
                    
                    // 或者通知主进程添加到音乐库
                    window.electronFeatures.sendMessage('add-music-to-library', filePath);
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
                const nextIndex = (currentIndex + 1) % musicList.length;
                setCurrentMusic(musicList[nextIndex]);
                animateButton('next');
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
    
    // 按钮点击动画
    const animateButton = (buttonType) => {
        setIsButtonAnimating(buttonType);
        setTimeout(() => setIsButtonAnimating(null), 300);
    }
    
    // 处理进度条点击开始拖动
    const handleProgressMouseDown = (event) => {
        event.preventDefault();
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

    return (
        <div className='MusicPlayer_container'>
            <div className='MusicPlayer_display_container'>
                <VinylPlayer 
                    isPlaying={isPlaying}
                    labelColor="#1982FC"
                />
            </div>
            <div className='MusicPlayer_controller_container'>
                <div className="MusicPlayer_info_container">
                    <div className="MusicPlayer_info_cover_container">
                        <img src={defaultCoverImg} alt="专辑封面" />
                    </div>
                    <div className="MusicPlayer_info_title_container">
                        {currentMusic ? currentMusic.title : '未选择音乐'}
                    </div>
                    <div className="MusicPlayer_info_artist_container">
                        {currentMusic ? currentMusic.artist : '点击下方按钮选择音频文件'}
                    </div>
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
                                    className="MusicPlayer_volume_slider"
                                    style={{"--volume-percentage": `${volumeLevel}%`}}
                                />
                            </div>
                        </div>
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
                        className={`MusicPlayer_playlist_button ${isButtonAnimating === 'playlist' ? 'animate-click' : ''}`} 
                        onClick={() => {
                            handleSelectAudioFile();
                            animateButton('playlist');
                        }}>
                        <QueueMusicIcon />
                    </div>
                </div>
            </div>
        </div>
        
    )
}

export default MusicPlayer;