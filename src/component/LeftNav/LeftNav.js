import React from 'react'
import { NavLink } from 'react-router-dom'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded'
import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded'
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded'
import PhotoRoundedIcon from '@mui/icons-material/PhotoRounded'
import './LeftNav.scss'

const navItems = [
    { to: '/', label: '首页', Icon: HomeRoundedIcon, end: true },
    { to: '/music', label: '音乐', Icon: MusicNoteRoundedIcon },
    { to: '/video', label: '视频', Icon: VideocamRoundedIcon },
    { to: '/photo', label: '图片', Icon: PhotoRoundedIcon },
    { to: '/collect', label: '收藏', Icon: FavoriteRoundedIcon },
    { to: '/recent', label: '最近', Icon: AccessTimeRoundedIcon }
]

const preventNavigationDrag = (event) => event.preventDefault()

const LeftNav = () => (
    <aside className="sideBar_container" aria-label="主导航">
        <nav className="sideBar">
            <div className="sideBar_sectionLabel">媒体库</div>
            {navItems.map(({ to, label, Icon, end }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={end}
                    draggable={false}
                    onDragStart={preventNavigationDrag}
                    aria-label={label}
                    title={label}
                    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                    <Icon className="nav-icon" aria-hidden="true" />
                    <span className="nav-txt">{label}</span>
                </NavLink>
            ))}
        </nav>
    </aside>
)

export default LeftNav
