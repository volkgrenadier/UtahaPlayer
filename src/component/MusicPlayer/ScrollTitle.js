import React, { useState, useRef, useEffect } from 'react'
import './ScrollTitle.scss';

/**
 * @description: 滚动标题组件
 * @param {string} title - 滚动的标题文本
 * @param {boolean} hoverScroll - 是否在鼠标悬停时滚动
 * @param {function} handleClick - 点击标题时的回调函数
 * @param {number} speed - 滚动速度，默认值为20，单位为px/s，值越大，速度越快，取值范围大于0
 * @param {string} itemClassName - 标题的类名
 * @retruns {JSX.Element} 滚动标题组件
 */
const ScrollTitle = ({title, hoverScroll, handleClick = false, speed = 20, itemClassName=''}) => {
    speed = speed > 0 ? speed : 20
    const containerRef = useRef(null)
    const contentRef = useRef(null)
    const [scrolling, setScrolling] = useState(false)
    const [shouldAnimate, setShouldAnimate] = useState(false)
    const [cssVariables, setCssVariables] = useState({
        '--scroll-distance': '0px',
        '--scroll-duration': '1s',
    })
    /**
     * 计算滚动距离和持续时间
     */
    useEffect(() => {
        let needAnimate = containerRef.current.scrollWidth > containerRef.current.clientWidth
        let scrollDistance = containerRef.current.scrollWidth - containerRef.current.clientWidth
        console.log(`cssVariables-${title}`, {
            '--scroll-distance': `-${scrollDistance}px`,
            '--scroll-duration': `${Math.abs(scrollDistance)/speed}s`,
        })
        setCssVariables({
            '--scroll-distance': `-${scrollDistance}px`,
            '--scroll-duration': `${Math.abs(scrollDistance)/speed}s`,
        })
        setShouldAnimate(needAnimate)
    }, [title])
    return (
        <div 
            className={`ScrollTitle_container`}
            ref={containerRef}
            style={cssVariables}
        >
            <div 
                className={`
                    ScrollTitle_content 
                    ${shouldAnimate && hoverScroll ? 'ScrollTitle_content_hoverScroll' : ''} 
                    ${itemClassName}
                `}
                ref={contentRef}
                onClick={ handleClick ? (e) => handleClick(e) : null }
            >
                { title }
            </div>
        </div>
    )
}

export default ScrollTitle