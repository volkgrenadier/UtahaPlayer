import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { toFileUrl } from '../../utils/mediaUrl';
import './MiniPlayer.scss';

const AUTO_COLLAPSE_DELAY = 3000;

const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    return minutes + ':' + Math.floor(seconds % 60).toString().padStart(2, '0');
};

const FloatingRecord = ({ track, isPlaying, onTogglePlay }) => {
    const coverSource = toFileUrl(track?.coverUrl || track?.thumbnailUrl || '');
    const [failedCover, setFailedCover] = useState(null);
    const hasCover = Boolean(coverSource && failedCover !== coverSource);

    useEffect(() => setFailedCover(null), [coverSource]);

    return (
        <button
            type="button"
            className={'GlobalMiniPlayer_recordButton' + (isPlaying ? ' is-playing' : '')}
            onClick={onTogglePlay}
            disabled={!track}
            aria-label={isPlaying ? '暂停唱片播放' : '开始唱片播放'}
            title={track?.title || '尚未选择音乐'}
        >
            <span className="GlobalMiniPlayer_record" aria-hidden="true" data-testid="floating-vinyl-record">
                <span className={'GlobalMiniPlayer_recordLabel' + (hasCover ? ' has-cover' : '')}>
                    {hasCover
                        ? <img src={coverSource} alt="" draggable={false} data-testid="floating-vinyl-cover" onError={() => setFailedCover(coverSource)} />
                        : <span className="GlobalMiniPlayer_monogram">U</span>}
                </span>
                <span className="GlobalMiniPlayer_spindle" />
            </span>
            <span className="GlobalMiniPlayer_recordAction" aria-hidden="true">
                {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </span>
        </button>
    );
};

const MiniPlayer = () => {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const panelId = useId();
    const {
        currentMusic, isPlaying, isMuted, currentTime, totalTime, progress, volumeLevel,
        togglePlay, playPrevious, playNext, seekToProgress, applyVolume, toggleMute
    } = useMusicPlayer();
    const [isExpanded, setIsExpanded] = useState(false);
    const panelRef = useRef(null);
    const toggleRef = useRef(null);
    const expandedRef = useRef(false);
    const collapseTimerRef = useRef(null);
    const pointerInsideRef = useRef(false);
    const keyboardFocusRef = useRef(false);
    const keyboardInputRef = useRef(true);
    const activeSliderRef = useRef(null);

    const clearCollapseTimer = useCallback(() => {
        window.clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
    }, []);

    const collapse = useCallback((restoreFocus = false) => {
        clearCollapseTimer();
        // Move focus before making the controls inert, including mouse-focused sliders.
        if (restoreFocus || panelRef.current?.contains(document.activeElement)) {
            toggleRef.current?.focus({ preventScroll: true });
        }
        expandedRef.current = false;
        setIsExpanded(false);
    }, [clearCollapseTimer]);

    const scheduleCollapse = useCallback(() => {
        clearCollapseTimer();
        if (expandedRef.current && !pointerInsideRef.current && !keyboardFocusRef.current && !activeSliderRef.current) {
            collapseTimerRef.current = window.setTimeout(() => collapse(), AUTO_COLLAPSE_DELAY);
        }
    }, [clearCollapseTimer, collapse]);

    useEffect(() => {
        collapse();
        pointerInsideRef.current = false;
        keyboardFocusRef.current = false;
        activeSliderRef.current = null;
    }, [pathname, collapse]);

    useEffect(() => {
        const finishSliderInteraction = () => {
            const slider = activeSliderRef.current;
            if (!slider) return;
            if (slider?.dataset.control === 'volume') applyVolume(slider.value, { persist: true });
            activeSliderRef.current = null;
            scheduleCollapse();
        };
        const handleWindowBlur = () => {
            pointerInsideRef.current = false;
            keyboardFocusRef.current = false;
            finishSliderInteraction();
            scheduleCollapse();
        };
        const handleKeyboardInput = () => { keyboardInputRef.current = true; };
        // A drag can end outside the tile or be cancelled when the window loses focus.
        window.addEventListener('pointerup', finishSliderInteraction);
        window.addEventListener('pointercancel', finishSliderInteraction);
        window.addEventListener('blur', handleWindowBlur);
        window.addEventListener('keydown', handleKeyboardInput, true);
        return () => {
            clearCollapseTimer();
            window.removeEventListener('pointerup', finishSliderInteraction);
            window.removeEventListener('pointercancel', finishSliderInteraction);
            window.removeEventListener('blur', handleWindowBlur);
            window.removeEventListener('keydown', handleKeyboardInput, true);
        };
    }, [applyVolume, clearCollapseTimer, scheduleCollapse]);

    const toggleExpanded = () => {
        if (expandedRef.current) {
            collapse();
        } else {
            expandedRef.current = true;
            setIsExpanded(true);
            scheduleCollapse();
        }
    };

    const handleKeyDown = (event) => {
        keyboardInputRef.current = true;
        keyboardFocusRef.current = true;
        clearCollapseTimer();
        if (event.key === 'Escape' && expandedRef.current) {
            event.preventDefault();
            event.stopPropagation();
            collapse(true);
        }
    };

    const hasTrack = Boolean(currentMusic);
    const controlsDisabled = !isExpanded || !hasTrack;
    const safeProgress = Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0;
    const safeVolume = Number.isFinite(volumeLevel) ? Math.min(100, Math.max(0, volumeLevel)) : 0;

    return (
        <section
            className={'GlobalMiniPlayer' + (isExpanded ? ' is-expanded' : '')}
            aria-label="全局音乐播放器"
            onPointerEnter={() => {
                pointerInsideRef.current = true;
                clearCollapseTimer();
            }}
            onPointerLeave={() => {
                pointerInsideRef.current = false;
                scheduleCollapse();
            }}
            onPointerDownCapture={(event) => {
                keyboardInputRef.current = false;
                keyboardFocusRef.current = false;
                if (event.target.matches('input[type="range"]')) activeSliderRef.current = event.target;
                clearCollapseTimer();
            }}
            onFocusCapture={() => {
                keyboardFocusRef.current = keyboardInputRef.current;
                clearCollapseTimer();
            }}
            onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    keyboardFocusRef.current = false;
                    scheduleCollapse();
                }
            }}
            onKeyDownCapture={handleKeyDown}
        >
            <FloatingRecord track={currentMusic} isPlaying={isPlaying} onTogglePlay={togglePlay} />
            <button
                ref={toggleRef}
                type="button"
                className="GlobalMiniPlayer_toggle"
                onClick={toggleExpanded}
                aria-label={isExpanded ? '收起播放器' : '展开播放器'}
                aria-expanded={isExpanded}
                aria-controls={panelId}
            >
                <ChevronRightIcon />
            </button>
            <div className="GlobalMiniPlayer_panelViewport">
                <div
                    ref={panelRef}
                    id={panelId}
                    className="GlobalMiniPlayer_panel"
                    role="group"
                    aria-label="播放控制"
                    aria-hidden={!isExpanded}
                    inert={!isExpanded}
                >
                    <div className="GlobalMiniPlayer_topRow">
                        <button
                            type="button"
                            className="GlobalMiniPlayer_meta"
                            onClick={() => navigate('/music')}
                            disabled={controlsDisabled}
                            aria-label="在音乐页查看当前歌曲"
                        >
                            <strong title={currentMusic?.title || ''}>{currentMusic?.title || '尚未选择音乐'}</strong>
                            <span title={currentMusic?.artist || ''}>{currentMusic?.artist || '未知艺术家'}</span>
                        </button>
                        <div className="GlobalMiniPlayer_buttons">
                            <button type="button" onClick={playPrevious} disabled={controlsDisabled} aria-label="上一首"><SkipPreviousIcon /></button>
                            <button type="button" className="GlobalMiniPlayer_play" onClick={togglePlay} disabled={controlsDisabled} aria-label={isPlaying ? '暂停' : '播放'}>
                                {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                            </button>
                            <button type="button" onClick={playNext} disabled={controlsDisabled} aria-label="下一首"><SkipNextIcon /></button>
                        </div>
                    </div>
                    <div className="GlobalMiniPlayer_bottomRow">
                        <div className="GlobalMiniPlayer_progressRow">
                            <span>{formatTime(currentTime)}</span>
                            <input
                                type="range" min="0" max="100" step="0.1" value={safeProgress}
                                onChange={(event) => seekToProgress(event.target.value)}
                                disabled={controlsDisabled || !Number.isFinite(totalTime) || totalTime <= 0}
                                aria-label="音乐播放进度"
                                aria-valuetext={formatTime(currentTime) + ' / ' + formatTime(totalTime)}
                                style={{ '--mini-range': safeProgress + '%' }}
                            />
                            <span>{formatTime(totalTime)}</span>
                        </div>
                        <div className="GlobalMiniPlayer_volume">
                            <button type="button" onClick={toggleMute} disabled={controlsDisabled} aria-label={isMuted ? '取消静音' : '静音'}>
                                {isMuted || safeVolume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
                            </button>
                            <input
                                type="range" min="0" max="100" value={safeVolume} data-control="volume"
                                onChange={(event) => applyVolume(event.target.value)}
                                onKeyUp={(event) => applyVolume(event.currentTarget.value, { persist: true })}
                                disabled={controlsDisabled}
                                aria-label="音乐音量"
                                aria-valuetext={safeVolume + '%'}
                                style={{ '--mini-range': safeVolume + '%' }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default MiniPlayer;
