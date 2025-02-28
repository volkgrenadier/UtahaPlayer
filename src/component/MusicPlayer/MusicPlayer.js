import React, { useState, useEffect, useRef } from 'react'
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
import './MusicPlayer.scss'
import imgObj from '../../assets/1.jpg'

const MusicPlayer = () => {
    // 状态管理
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentMode, setCurrentMode] = useState('sequential play');
    const [currentTime, setCurrentTime] = useState('2:14');
    const [totalTime, setTotalTime] = useState('3:45');
    const [progress, setProgress] = useState(60); // 模拟进度百分比
    const [isDragging, setIsDragging] = useState(false);
    const [temporaryProgress, setTemporaryProgress] = useState(null);
    const [isButtonAnimating, setIsButtonAnimating] = useState(null);
    const [volumeLevel, setVolumeLevel] = useState(75);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    
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
            if (isDragging && temporaryProgress !== null) {
                setProgress(temporaryProgress);
                setTemporaryProgress(null);
                // 这里可以添加实际调整音频播放位置的代码
                console.log(`最终调整进度到: ${temporaryProgress}%`);
            }
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
    }, [isDragging, temporaryProgress]);

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
    ]

    // 获取当前播放模式的图标
    const getCurrentModeIcon = () => {
        const mode = mainControlButtons[0].iconList.find(icon => icon.value === currentMode);
        return mode ? mode.icon : <RepeatIcon />;
    }
    
    // 切换播放状态
    const togglePlay = () => {
        setIsPlaying(!isPlaying);
        animateButton('play');
    }

    // 切换播放模式
    const togglePlayMode = () => {
        const modes = mainControlButtons[0].iconList.map(icon => icon.value);
        const currentIndex = modes.indexOf(currentMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        setCurrentMode(modes[nextIndex]);
        animateButton('mode');
    }

    // 切换静音状态
    const toggleMute = () => {
        setIsMuted(!isMuted);
        animateButton('volume');
    }
    
    // 处理音量变化
    const handleVolumeChange = (e) => {
        const newVolume = parseInt(e.target.value);
        setVolumeLevel(newVolume);
        if (newVolume === 0) {
            setIsMuted(true);
        } else if (isMuted) {
            setIsMuted(false);
        }
    }
    
    // 显示/隐藏音量滑块
    const handleVolumeHover = (isHovering) => {
        setShowVolumeSlider(isHovering);
    }
    
    // 按钮点击动画
    const animateButton = (buttonType) => {
        setIsButtonAnimating(buttonType);
        setTimeout(() => setIsButtonAnimating(null), 300);
    }
    
    // 上一首
    const handlePrevious = () => {
        console.log('播放上一首');
        animateButton('prev');
    }
    
    // 下一首
    const handleNext = () => {
        console.log('播放下一首');
        animateButton('next');
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
        
        setProgress(clampedProgress);
        
        // 这里可以添加实际的音频播放位置调整逻辑
        updateDisplayTime(clampedProgress);
        console.log(`点击调整进度到: ${clampedProgress}%`);
    };
    
    // 更新显示时间
    const updateDisplayTime = (progressPercent) => {
        // 总时长为3:45 (225秒)
        const totalSeconds = 225;
        const currentSeconds = Math.floor(totalSeconds * (progressPercent / 100));
        
        const minutes = Math.floor(currentSeconds / 60);
        const seconds = currentSeconds % 60;
        
        setCurrentTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }

    return (
        <div className='MusicPlayer_container'>
            <div className="MusicPlayer_info_container">
                <div className="MusicPlayer_info_cover_container">
                    <img src={imgObj} alt="专辑封面" />
                </div>
                <div className="MusicPlayer_info_title_container">
                    不可思议的病历
                </div>
                <div className="MusicPlayer_info_artist_container">
                    濑户麻沙美
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
                    <div className="MusicPlayer_time_current">{currentTime}</div>
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
                    <div className="MusicPlayer_time_total">{totalTime}</div>
                </div>
            </div>
            <div className="MusicPlayer_buttons_container">
                <div 
                    className={`MusicPlayer_playlist_button ${isButtonAnimating === 'playlist' ? 'animate-click' : ''}`} 
                    onClick={() => {
                        console.log('播放列表');
                        animateButton('playlist');
                    }}>
                    <QueueMusicIcon />
                </div>
            </div>
        </div>
    )
}

export default MusicPlayer