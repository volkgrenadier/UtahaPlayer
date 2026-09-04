import React, { useState, useEffect, useRef } from 'react';
import './ImmersiveLyricsView.scss';

/**
 * 沉浸式歌词播放模式组件 (优化版)
 * 苹果风格设计的沉浸式歌词展示，支持动态背景色
 * 
 * @param {Object} props
 * @param {string} props.albumColor - 专辑主色调
 * @param {string} props.secondaryColor - 专辑次要色调
 * @param {string} props.title - 歌曲标题
 * @param {string} props.artist - 歌手名称
 * @param {Array} props.lyrics - 歌词数组 [{time: 时间秒数, text: "歌词文本"}, ...]
 * @param {number} props.currentTime - 当前播放时间(秒)
 * @param {function} props.onSeek - (可选) 当用户点击特定歌词时的回调函数
 */
const ImmersiveLyricsView = ({
    albumColor = "#6d3155",
    secondaryColor = "#30223a",
    title = "未知歌曲",
    artist = "未知艺术家",
    lyrics = [],
    currentTime = 0,
    onSeek = null
}) => {
    // 当前高亮歌词的索引
    const [activeLyricIndex, setActiveLyricIndex] = useState(0);
    // 歌词容器引用，用于滚动
    const lyricsContainerRef = useRef(null);
    
    // CSS变量，用于动态设置背景色
    const cssVariables = {
        '--album-color-primary': albumColor,
        '--album-color-secondary': secondaryColor
    };
    
    // 监听当前时间变化，更新歌词高亮
    useEffect(() => {
        // 找到当前时间应该显示的歌词
        const newActiveIndex = lyrics.findIndex((lyric, index) => {
            const nextLyric = lyrics[index + 1];
            if (!nextLyric) return true;
            return currentTime >= lyric.time && currentTime < nextLyric.time;
        });
        
        // 如果找到有效索引，且不同于当前索引，则更新
        if (newActiveIndex !== -1 && newActiveIndex !== activeLyricIndex) {
            setActiveLyricIndex(newActiveIndex);
            
            // 滚动到当前歌词位置
            if (lyricsContainerRef.current) {
                const lyricElements = lyricsContainerRef.current.querySelectorAll('.lyrics_item');
                if (lyricElements[newActiveIndex]) {
                    lyricElements[newActiveIndex].scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            }
        }
    }, [currentTime, lyrics, activeLyricIndex]);

    // 获取需要显示的歌词 (前两行，当前行，后两行)
    const getVisibleLyrics = () => {
        const visibleLyrics = [];
        
        // 前两句歌词
        for (let i = Math.max(0, activeLyricIndex - 2); i < activeLyricIndex && i < lyrics.length; i++) {
            visibleLyrics.push({
                text: lyrics[i].text,
                type: 'previous',
                index: i,
                time: lyrics[i].time
            });
        }
        
        // 当前歌词
        if (lyrics[activeLyricIndex]) {
            visibleLyrics.push({
                text: lyrics[activeLyricIndex].text,
                type: 'active',
                index: activeLyricIndex,
                time: lyrics[activeLyricIndex].time
            });
        }
        
        // 后两句歌词
        for (let i = activeLyricIndex + 1; i < Math.min(lyrics.length, activeLyricIndex + 3); i++) {
            visibleLyrics.push({
                text: lyrics[i].text,
                type: 'next',
                index: i,
                time: lyrics[i].time
            });
        }
        
        return visibleLyrics;
    };
    
    // 格式化歌词的辅助函数 - 处理换行
    const formatLyric = (text) => {
        if (!text) return '';
        // 将歌词中的换行符替换为<br>标签
        return text.split('\n').map((line, index) => (
            <React.Fragment key={index}>
                {index > 0 && <br />}
                {line}
            </React.Fragment>
        ));
    };
    

    
    // 处理歌词点击事件 - 如果提供了onSeek回调，则跳转到对应时间
    const handleLyricClick = (time) => {
        if (onSeek && typeof onSeek === 'function') {
            onSeek(time);
        }
    };
    
    // 获取要显示的歌词
    const visibleLyrics = getVisibleLyrics();
    
    return (
        <div className="immersiveLyrics_container" style={cssVariables}>
            {/* 背景层 */}
            <div className="background_layer">
                <div className="color_gradient"></div>
            </div>
            
            {/* 毛玻璃效果覆盖层 */}
            <div className="glass_overlay"></div>
            
            {/* 内容区 */}
            <div className="content_container">
                {/* 顶部信息 */}
                <div className="song_info">
                    <h2 className="title">{title}</h2>
                    <h3 className="artist">{artist}</h3>
                </div>
                
                {/* 歌词区域 */}
                <div className="lyrics_container" ref={lyricsContainerRef}>
                    {visibleLyrics.length > 0 ? (
                        visibleLyrics.map((lyric) => (
                            <div 
                                key={lyric.index} 
                                className={`lyrics_item ${lyric.type} ${onSeek ? 'clickable' : ''}`}
                                onClick={() => onSeek && handleLyricClick(lyric.time)}
                            >
                                {formatLyric(lyric.text)}
                            </div>
                        ))
                    ) : (
                        <div className="lyrics_item empty">暂无歌词</div>
                    )}
                </div>
                
            </div>
        </div>
    );
};

export default ImmersiveLyricsView;
