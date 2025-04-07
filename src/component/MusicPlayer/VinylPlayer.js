import React, { useEffect, useRef } from 'react';
import './VinylPlayer.scss';

/**
 * 唱片播放效果组件
 * @param {Object} props
 * @param {boolean} props.isPlaying - 是否处于播放状态
 * @param {string} props.labelColor - 唱片标签颜色 (可选，默认为蓝色)
 * @param {string} props.coverImage - 专辑封面图片URL
 * @param {function} props.onTogglePlay - 点击唱片时的回调函数 (可选)
 * @param {string} props.className - 自定义CSS类名 (可选)
 * @param {Object} props.style - 自定义内联样式 (可选)
 */
const VinylPlayer = ({ 
    isPlaying = false, 
    labelColor = '#1982FC', 
    coverImage = null,
    onTogglePlay = null,
    className = '',
    style = {}
}) => {
    const svgRef = useRef(null);
    const prevPlayingStateRef = useRef(isPlaying);
    const initialRenderRef = useRef(true);
  
    // 监听播放状态变化，控制唱片和唱臂动画
    useEffect(() => {
        if (!svgRef.current) return;
    
        const recordSpinning = svgRef.current.getElementById('recordSpinning');
        const armToRecord = svgRef.current.getElementById('armToRecord');
        const armToSide = svgRef.current.getElementById('armToSide');
        const armVibration = svgRef.current.getElementById('armVibration');
        
        // 首次渲染时，根据初始播放状态调整唱臂位置（无动画）
        if (initialRenderRef.current) {
            initialRenderRef.current = false;
            
            const tonearm = svgRef.current.getElementById('tonearm');
            if (tonearm) {
                if (isPlaying) {
                    // 如果初始状态是播放，将唱臂直接放到唱片上（无动画）
                    tonearm.setAttribute('transform', 'rotate(-20 0 0)');
                    
                    // 启动唱片旋转
                    if (recordSpinning) {
                        recordSpinning.beginElement();
                    }
                    
                    // 启动唱臂振动
                    if (armVibration) {
                        armVibration.beginElement();
                    }
                } else {
                    // 如果初始状态是暂停，确保唱臂在右侧位置（无动画）
                    tonearm.setAttribute('transform', 'rotate(-50 0 0)');
                }
            }
            return; // 首次渲染仅设置初始状态，不执行后续动画
        }
        
        // 播放状态发生变化时
        if (isPlaying !== prevPlayingStateRef.current) {
            if (isPlaying) {
                // 从暂停到播放：唱臂从右侧移到唱片上
                if (armToRecord) {
                    armToRecord.beginElement();
                }
                
                // 稍作延迟后启动唱片旋转和唱臂振动
                setTimeout(() => {
                    if (recordSpinning) {
                        recordSpinning.beginElement();
                    }
                    
                    // 唱臂完全放到唱片上后再添加振动
                    setTimeout(() => {
                    if (armVibration) {
                        armVibration.beginElement();
                    }
                    }, 400);
                }, 850);
            } else {
                // 从播放到暂停：先停止唱片旋转和振动，然后移动唱臂到右侧
                if (recordSpinning) {
                    recordSpinning.endElement();
                }
                
                if (armVibration) {
                    armVibration.endElement();
                }
                
                // 短暂延迟后移动唱臂到右侧
                setTimeout(() => {
                    if (armToSide) {
                        armToSide.beginElement();
                    }
                }, 300);
            }
            
            // 更新前一个播放状态的引用
            prevPlayingStateRef.current = isPlaying;
        }
        }, [isPlaying]);
    
        // 处理点击事件
        const handleClick = (e) => {
        // 阻止事件冒泡和默认行为
        e.preventDefault();
        e.stopPropagation();
        
        if (onTogglePlay) {
            onTogglePlay();
        }
        };
    
        // 辅助函数：调整颜色亮度
        const shadeColor = (color, percent) => {
        let R = parseInt(color.substring(1, 3), 16);
        let G = parseInt(color.substring(3, 5), 16);
        let B = parseInt(color.substring(5, 7), 16);
    
        R = parseInt(R * (100 + percent) / 100);
        G = parseInt(G * (100 + percent) / 100);
        B = parseInt(B * (100 + percent) / 100);
    
        R = (R < 255) ? R : 255;
        G = (G < 255) ? G : 255;
        B = (B < 255) ? B : 255;
    
        R = Math.max(0, R).toString(16).padStart(2, '0');
        G = Math.max(0, G).toString(16).padStart(2, '0');
        B = Math.max(0, B).toString(16).padStart(2, '0');
    
        return `#${R}${G}${B}`;
        };
  
    return (
        <div 
            className={`VinylPlayer_container ${className}`} 
            onClick={handleClick}
            onMouseDown={(e) => e.preventDefault()}
            onTouchStart={(e) => e.preventDefault()}
            tabIndex="-1"
            role="button"
            aria-label={isPlaying ? "暂停" : "播放"}
            style={{
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
                ...style
            }}
        >
            <svg 
                viewBox="50 75 300 250" 
                xmlns="http://www.w3.org/2000/svg"
                ref={svgRef}
            >
                {/* 定义渐变和滤镜 */}
                <defs>
                {/* 背景渐变 */}
                {/* <linearGradient id="backgroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: "#f9f9f9", stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: "#f1f1f1", stopOpacity: 1 }} />
                </linearGradient> */}
                
                {/* 底座渐变 - 增强质感 */}
                <linearGradient id="highQualityBaseGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: "#ffffff", stopOpacity: 1 }} />
                    <stop offset="40%" style={{ stopColor: "#f8f8f8", stopOpacity: 1 }} />
                    <stop offset="60%" style={{ stopColor: "#f2f2f2", stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: "#e8e8e8", stopOpacity: 1 }} />
                </linearGradient>
                
                {/* 底座侧面渐变 */}
                <linearGradient id="baseSideGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: "#e8e8e8", stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: "#d0d0d0", stopOpacity: 1 }} />
                </linearGradient>
                
                {/* 高品质金属效果 */}
                <linearGradient id="premiumMetalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: "#eeeeee", stopOpacity: 1 }} />
                    <stop offset="40%" style={{ stopColor: "#e0e0e0", stopOpacity: 1 }} />
                    <stop offset="60%" style={{ stopColor: "#d8d8d8", stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: "#cccccc", stopOpacity: 1 }} />
                </linearGradient>
                
                {/* 高光效果 */}
                <linearGradient id="highlightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: "rgba(255,255,255,0.9)", stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: "rgba(255,255,255,0)", stopOpacity: 1 }} />
                </linearGradient>
                
                {/* 唱片渐变 - 增强质感 */}
                <radialGradient id="enhancedVinylGradient" cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
                    <stop offset="0%" style={{ stopColor: "#2a2a2a", stopOpacity: 1 }} />
                    <stop offset="70%" style={{ stopColor: "#1a1a1a", stopOpacity: 1 }} />
                    <stop offset="90%" style={{ stopColor: "#0a0a0a", stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: "#050505", stopOpacity: 1 }} />
                </radialGradient>
                
                {/* 唱片光泽 - 增强质感 */}
                <radialGradient id="enhancedVinylShine" cx="30%" cy="30%" r="70%" fx="30%" fy="30%">
                    <stop offset="0%" style={{ stopColor: "rgba(255,255,255,0.15)", stopOpacity: 1 }} />
                    <stop offset="50%" style={{ stopColor: "rgba(255,255,255,0.05)", stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: "rgba(255,255,255,0)", stopOpacity: 1 }} />
                </radialGradient>
                
                {/* 封面边缘渐变 - 提供深度感 */}
                <linearGradient id="coverEdgeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: "rgba(0,0,0,0.3)", stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: "rgba(0,0,0,0.1)", stopOpacity: 1 }} />
                </linearGradient>
                
                {/* 封面阴影滤镜 */}
                <filter id="coverShadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="0.5" result="blur"/>
                    <feOffset in="blur" dx="0" dy="0.5" result="offsetBlur"/>
                    <feComponentTransfer in="offsetBlur">
                    <feFuncA type="linear" slope="0.5"/>
                    </feComponentTransfer>
                    <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
                
                {/* 封面裁剪路径 */}
                <clipPath id="albumCoverClip">
                    <circle cx="0" cy="0" r="30" />
                </clipPath>
                
                {/* 噪点纹理 */}
                <filter id="vinylNoise" x="0%" y="0%" width="100%" height="100%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="5" stitchTiles="stitch" result="noise"/>
                    <feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.05 0" in="noise" result="noiseFade"/>
                    <feComposite operator="in" in="noiseFade"/>
                </filter>
                
                {/* 底座阴影 */}
                <filter id="enhancedBaseShadow" x="-10%" y="-10%" width="120%" height="140%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
                    <feOffset in="blur" dx="0" dy="4" result="offsetBlur"/>
                    <feComponentTransfer in="offsetBlur">
                    <feFuncA type="linear" slope="0.2"/>
                    </feComponentTransfer>
                    <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
                
                {/* 组件阴影 */}
                <filter id="enhancedComponentShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur"/>
                    <feOffset in="blur" dx="0" dy="1.5" result="offsetBlur"/>
                    <feComponentTransfer in="offsetBlur">
                    <feFuncA type="linear" slope="0.25"/>
                    </feComponentTransfer>
                    <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
                
                {/* 磨砂玻璃效果 */}
                <filter id="enhancedFrostedGlass" x="-10%" y="-10%" width="120%" height="120%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur"/>
                    <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 19 -9" result="glassMorph"/>
                    <feComposite in="SourceGraphic" in2="glassMorph" operator="atop"/>
                </filter>
                </defs>

                {/* 背景 */}
                <rect x="0" y="0" width="400" height="400" fill="url(#backgroundGradient)"/>

                {/* 主底座 - 增强质感设计 */}
                <g filter="url(#enhancedBaseShadow)">
                {/* 底座背板 - 提供深度和质感 */}
                <path d="M60,290 H340 V310 H60 Z" fill="url(#baseSideGradient)"/>
                <path d="M65,290 L75,280 H325 L335,290 Z" fill="#d6d6d6"/>
                
                {/* 底座主体 - 真实感细节 */}
                <rect x="75" y="240" width="250" height="40" rx="3" fill="url(#highQualityBaseGradient)"/>
                
                {/* 底座边缘装饰 - 增加细节 */}
                <rect x="85" y="245" width="230" height="30" rx="2" fill="#f0f0f0" stroke="#e6e6e6" strokeWidth="0.5" strokeOpacity="0.8"/>
                
                {/* 底座表面纹理 - 微妙的纹理和高光 */}
                <rect x="95" y="250" width="210" height="20" rx="1" fill="#f8f8f8" filter="url(#enhancedFrostedGlass)"/>
                <rect x="95" y="250" width="210" height="10" rx="1" fill="url(#highlightGradient)" opacity="0.4"/>
                
                {/* 底座控制区指示 */}
                <g transform="translate(200, 260)">
                    <rect x="-50" y="0" width="100" height="1" rx="0.5" fill="#e0e0e0" opacity="0.8"/>
                    <circle cx="-30" cy="5" r="2" fill="#d0d0d0"/>
                    <circle cx="0" cy="5" r="2" fill="#d0d0d0"/>
                    <circle cx="30" cy="5" r="2" fill="#d0d0d0"/>
                </g>
                </g>

                {/* 唱片机主体 - 增强质感 */}
                <g filter="url(#enhancedComponentShadow)">
                {/* 主体面板 */}
                <rect x="85" y="130" width="230" height="105" rx="8" fill="#f0f0f0" stroke="#e6e6e6" strokeWidth="1"/>
                
                {/* 面板纹理和高光 */}
                <rect x="90" y="135" width="220" height="95" rx="6" fill="#fcfcfc"/>
                <rect x="90" y="135" width="220" height="40" rx="6" fill="url(#highlightGradient)" opacity="0.3"/>
                
                {/* 表面微妙纹理 */}
                <rect x="90" y="135" width="220" height="95" rx="6" fill="#ffffff" opacity="0.05" filter="url(#vinylNoise)"/>
                </g>

                {/* 唱片机转盘底座 - 增强质感 */}
                <g transform="translate(200, 180)" filter="url(#enhancedComponentShadow)">
                {/* 转盘外圈 - 金属质感 */}
                <circle cx="0" cy="0" r="75" fill="url(#premiumMetalGradient)" stroke="#e0e0e0" strokeWidth="0.5"/>
                
                {/* 转盘表面 - 带有微妙纹理 */}
                <circle cx="0" cy="0" r="72" fill="#f5f5f5" stroke="#e8e8e8" strokeWidth="0.5"/>
                <circle cx="0" cy="0" r="72" fill="#ffffff" opacity="0.05" filter="url(#vinylNoise)"/>
                
                {/* 转盘垫 - 更真实的材质 */}
                <circle cx="0" cy="0" r="68" fill="#e0e0e0"/>
                <circle cx="0" cy="0" r="67" fill="#e5e5e5"/>
                
                {/* 转盘中心轴 - 金属质感 */}
                <circle cx="0" cy="0" r="6" fill="url(#premiumMetalGradient)"/>
                <circle cx="0" cy="0" r="5" fill="#e0e0e0"/>
                <circle cx="0" cy="0" r="3" fill="url(#premiumMetalGradient)"/>
                <circle cx="0" cy="0" r="1.5" fill="#c0c0c0"/>
                </g>

                {/* 唱片 - 大幅增强质感 */}
                <g id="vinyl-record" transform="translate(200, 180)" filter="url(#enhancedComponentShadow)">
                {/* 唱片主体 - 使用复合填充增加深度和质感 */}
                <circle cx="0" cy="0" r="65" fill="url(#enhancedVinylGradient)"/>
                
                {/* 唱片纹理层 - 增加微妙的噪点和不均匀性 */}
                <circle cx="0" cy="0" r="65" fill="#000000" opacity="0.05" filter="url(#vinylNoise)"/>
                
                {/* 唱片光泽层 - 模拟真实反光 */}
                <circle cx="0" cy="0" r="65" fill="url(#enhancedVinylShine)" opacity="0.6"/>
                
                {/* 唱片沟槽 - 精细且清晰可见 */}
                <g>
                    <circle cx="0" cy="0" r="62" fill="none" stroke="#000000" strokeWidth="0.2" opacity="0.3"/>
                    <circle cx="0" cy="0" r="59" fill="none" stroke="#000000" strokeWidth="0.2" opacity="0.3"/>
                    <circle cx="0" cy="0" r="56" fill="none" stroke="#000000" strokeWidth="0.2" opacity="0.3"/>
                    <circle cx="0" cy="0" r="53" fill="none" stroke="#000000" strokeWidth="0.2" opacity="0.3"/>
                    <circle cx="0" cy="0" r="50" fill="none" stroke="#000000" strokeWidth="0.2" opacity="0.3"/>
                    <circle cx="0" cy="0" r="47" fill="none" stroke="#000000" strokeWidth="0.2" opacity="0.3"/>
                    <circle cx="0" cy="0" r="44" fill="none" stroke="#000000" strokeWidth="0.2" opacity="0.3"/>
                    <circle cx="0" cy="0" r="41" fill="none" stroke="#000000" strokeWidth="0.2" opacity="0.3"/>
                    <circle cx="0" cy="0" r="38" fill="none" stroke="#000000" strokeWidth="0.2" opacity="0.3"/>
                    <circle cx="0" cy="0" r="35" fill="none" stroke="#000000" strokeWidth="0.2" opacity="0.3"/>
                </g>
                
                {/* 唱片细沟纹理 - 每个大沟槽之间的微小沟槽 */}
                <g opacity="0.2">
                    <circle cx="0" cy="0" r="60.5" fill="none" stroke="#000000" strokeWidth="0.1"/>
                    <circle cx="0" cy="0" r="57.5" fill="none" stroke="#000000" strokeWidth="0.1"/>
                    <circle cx="0" cy="0" r="54.5" fill="none" stroke="#000000" strokeWidth="0.1"/>
                    <circle cx="0" cy="0" r="51.5" fill="none" stroke="#000000" strokeWidth="0.1"/>
                    <circle cx="0" cy="0" r="48.5" fill="none" stroke="#000000" strokeWidth="0.1"/>
                    <circle cx="0" cy="0" r="45.5" fill="none" stroke="#000000" strokeWidth="0.1"/>
                    <circle cx="0" cy="0" r="42.5" fill="none" stroke="#000000" strokeWidth="0.1"/>
                    <circle cx="0" cy="0" r="39.5" fill="none" stroke="#000000" strokeWidth="0.1"/>
                    <circle cx="0" cy="0" r="36.5" fill="none" stroke="#000000" strokeWidth="0.1"/>
                </g>
                
                {/* 唱片边缘光泽和细节 */}
                <circle cx="0" cy="0" r="65" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
                <circle cx="0" cy="0" r="64.5" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.5"/>
                
                {/* 专辑封面位置 - 圆形裁剪区域 */}
                <g filter="url(#coverShadow)">
                    {/* 专辑封面外边框 */}
                    <circle cx="0" cy="0" r="32" fill="url(#coverEdgeGradient)"/>
                    <circle cx="0" cy="0" r="31" fill="#000000" opacity="0.1"/>
                    
                    {/* 专辑封面图片 - 使用裁剪路径确保圆形 */}
                    <g clipPath="url(#albumCoverClip)">
                    {/* 封面占位符 - 当没有提供封面图片时显示 */}
                    {!coverImage && (
                        <circle cx="0" cy="0" r="30" fill={labelColor} />
                    )}
                    
                    {/* 实际封面图片 - 当提供封面图片时显示 */}
                    {coverImage && (
                        <image 
                        x="-30" 
                        y="-30" 
                        width="60" 
                        height="60" 
                        xlinkHref={coverImage} 
                        preserveAspectRatio="xMidYMid slice"
                        />
                    )}
                    </g>
                    
                    {/* 中心孔 - 金属质感 */}
                    <circle cx="0" cy="0" r="5" fill="#c0c0c0"/>
                    <circle cx="0" cy="0" r="4" fill="#d0d0d0"/>
                    <circle cx="0" cy="0" r="3" fill="#e0e0e0"/>
                    <circle cx="0" cy="0" r="2" fill="#d0d0d0"/>
                </g>
                
                {/* 唱片纹理标记 - 使旋转更明显且增添质感 */}
                <g opacity="0.1">
                    <line x1="-65" y1="0" x2="-32" y2="0" stroke="#ffffff" strokeWidth="0.5"/>
                    <line x1="0" y1="-65" x2="0" y2="-32" stroke="#ffffff" strokeWidth="0.5"/>
                    <line x1="46" y1="-46" x2="23" y2="-23" stroke="#ffffff" strokeWidth="0.5"/>
                    <line x1="-46" y1="-46" x2="-23" y2="-23" stroke="#ffffff" strokeWidth="0.5"/>
                    <line x1="46" y1="46" x2="23" y2="23" stroke="#ffffff" strokeWidth="0.5"/>
                    <line x1="-46" y1="46" x2="-23" y2="23" stroke="#ffffff" strokeWidth="0.5"/>
                </g>
                
                {/* 唱片表面光点 - 随机分布的微小高光点 */}
                <circle cx="38" cy="-52" r="0.3" fill="#ffffff" opacity="0.7"/>
                <circle cx="-42" cy="48" r="0.25" fill="#ffffff" opacity="0.6"/>
                <circle cx="56" cy="15" r="0.2" fill="#ffffff" opacity="0.8"/>
                <circle cx="-20" cy="-58" r="0.3" fill="#ffffff" opacity="0.7"/>
                <circle cx="12" cy="60" r="0.25" fill="#ffffff" opacity="0.7"/>
                
                {/* 唱片旋转动画 - 播放状态 */}
                <animateTransform 
                    id="recordSpinning"
                    attributeName="transform"
                    attributeType="XML"
                    type="rotate"
                    from="0 0 0"
                    to="360 0 0"
                    dur="3s"
                    repeatCount="indefinite"
                    additive="sum"
                    calcMode="spline"
                    keySplines="0.45 0 0.55 1"/>
                </g>

                {/* 唱臂基座 - 增强质感 */}
                <g transform="translate(300, 150)" filter="url(#enhancedComponentShadow)">
                {/* 基座主体 - 高级金属质感 */}
                <rect x="-15" y="-15" width="30" height="30" rx="5" fill="url(#premiumMetalGradient)" stroke="#d5d5d5" strokeWidth="0.5"/>
                <rect x="-14" y="-14" width="28" height="28" rx="4" fill="#f0f0f0" stroke="#e5e5e5" strokeWidth="0.5"/>
                
                {/* 高光边缘 */}
                <rect x="-14" y="-14" width="28" height="14" rx="4" fill="url(#highlightGradient)" opacity="0.3"/>
                
                {/* 中心轴承 - 金属质感 */}
                <circle cx="0" cy="0" r="10" fill="url(#premiumMetalGradient)" stroke="#e0e0e0" strokeWidth="0.5"/>
                <circle cx="0" cy="0" r="8" fill="#f0f0f0"/>
                <circle cx="0" cy="0" r="6" fill="#e8e8e8"/>
                <circle cx="0" cy="0" r="4" fill="#d8d8d8"/>
                <circle cx="0" cy="0" r="2" fill="#c0c0c0"/>
                </g>

                {/* 唱臂 - 修正动画行为 */}
                <g transform="translate(300, 150)">
                {/* 唱臂组，默认在右侧位置 */}
                <g id="tonearm" transform="rotate(-20 0 0)">
                    {/* 唱臂杆 - 金属质感 */}
                    <path id="armPath" d="M0,0 Q-20,15 -50,25 L-85,30" fill="none" stroke="url(#premiumMetalGradient)" strokeWidth="3" strokeLinecap="round"/>
                    
                    {/* 唱臂杆高光 */}
                    <path d="M0,0 Q-20,15 -50,25 L-85,30" fill="none" stroke="url(#highlightGradient)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                    
                    {/* 唱臂关节 - 增加细节 */}
                    <circle cx="-50" cy="25" r="1.5" fill="#c0c0c0"/>
                    
                    {/* 唱头 - 高品质设计 */}
                    <g transform="translate(-85, 30)">
                    <rect x="-8" y="-3" width="12" height="6" rx="1" fill="#b0b0b0" stroke="#a0a0a0" strokeWidth="0.3"/>
                    <rect x="-7" y="-2" width="10" height="4" rx="1" fill="#c8c8c8"/>
                    <rect x="-6" y="-1" width="8" height="2" rx="0.5" fill="#d8d8d8"/>
                    
                    {/* 唱针 */}
                    <rect x="3" y="0" width="4" height="1" rx="0.5" fill="#909090"/>
                    <rect x="6.5" y="0" width="0.5" height="2" rx="0.25" fill="#707070"/>
                    
                    {/* 唱头连接件 */}
                    <rect x="-6" y="-3" width="2" height="6" rx="0.5" fill="#a0a0a0"/>
                    </g>
                    
                    {/* 唱臂平衡重 - 金属质感 */}
                    <g transform="translate(15, 0)">
                    <ellipse cx="0" cy="0" rx="7" ry="5" fill="url(#premiumMetalGradient)"/>
                    <ellipse cx="0" cy="-1" rx="6" ry="2" fill="url(#highlightGradient)" opacity="0.4"/>
                    <ellipse cx="2" cy="0" rx="4" ry="3" fill="#d0d0d0"/>
                    </g>
                    
                    {/* 唱臂放下状态 - 从右侧放到唱片上 (播放) */}
                    <animateTransform 
                        id="armToRecord"
                        attributeName="transform"
                        attributeType="XML"
                        type="rotate"
                        from="-50 0 0"
                        to="-20 0 0"
                        dur="0.8s"
                        begin="indefinite"
                        calcMode="spline"
                        keySplines="0.44 0.98 0.65 0.94"
                        fill="freeze"
                    />
                    
                    {/* 唱臂举起状态 - 从唱片上移到右侧 (暂停) */}
                    <animateTransform 
                        id="armToSide"
                        attributeName="transform"
                        attributeType="XML"
                        type="rotate"
                        from="-20 0 0"
                        to="-50 0 0"
                        dur="0.8s"
                        begin="indefinite"
                        calcMode="spline"
                        keySplines="0.32 0 0.67 0"
                        fill="freeze"
                    />
                    
                    {/* 微妙的唱臂振动 - 播放中 */}
                    <animateTransform 
                        id="armVibration"
                        attributeName="transform"
                        attributeType="XML"
                        type="rotate"
                        values="0 0 0; 0.1 0 0; 0 0 0; -0.1 0 0; 0 0 0"
                        dur="0.8s"
                        repeatCount="indefinite"
                        begin="indefinite"
                        additive="sum"
                        calcMode="spline"
                        keySplines="0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1"
                    />
                </g>
                </g>
            </svg>
        </div>
    );
};

export default VinylPlayer;