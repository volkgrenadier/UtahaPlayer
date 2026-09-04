import React from 'react'
import './Header.scss'

const BrandMark = () => (
    <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M8 7v10.2c0 5 3.1 7.8 8 7.8s8-2.8 8-7.8V7" />
        <path d="M5 15h4l2.2-4 3.2 9 3-7 2 4H27" />
    </svg>
)

const Header = () => (
    <header className="Header_container">
        <div className="Header_brand">
            <span className="Header_mark"><BrandMark /></span>
            <span className="Header_title">Utaha Player</span>
            <span className="Header_divider" aria-hidden="true" />
            <span className="Header_subtitle">本地媒体中心</span>
        </div>
        <div className="Header_dragSurface" aria-hidden="true" />
    </header>
)

export default Header
