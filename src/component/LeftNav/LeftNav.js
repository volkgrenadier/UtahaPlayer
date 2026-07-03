import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import AccessTimeIcon from '@mui/icons-material/AccessTime';//最近播放
import FavoriteIcon from '@mui/icons-material/Favorite';//收藏
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import VideocamIcon from '@mui/icons-material/Videocam';
import PhotoIcon from '@mui/icons-material/Photo';
import MenuIcon from '@mui/icons-material/Menu';

import './LeftNav.scss';

const LeftNav = () => {
	const [expandStatus, setExpandStatus] = useState(false)
	return (
		<div className='sideBar_container'>
			<div className={`sideBar ${expandStatus? 'sideBar-expand': ''}`}>
				{/* <div className='sideTitle'>
					媒体
				</div> */}
				<div 
					className={`nav-expandButton ${expandStatus? 'nav-expandButton-expanded': ''}`}
					onClick={() => setExpandStatus(!expandStatus)}
				>
					<MenuIcon className='nav-icon'/>
				</div>
				<NavLink to="/" className={({ isActive }) =>
					isActive ? 'nav-item active' : 'nav-item'
				}>
					<HomeRoundedIcon className='nav-icon'/>
					<div className={`nav-txt ${expandStatus? 'nav-txt-show': ''}`}>首页</div>
				</NavLink>
				<NavLink to="/music" className={({ isActive }) =>
					isActive ? 'nav-item active' : 'nav-item'
				}>
					<MusicNoteIcon className='nav-icon'/>
					<div className={`nav-txt ${expandStatus? 'nav-txt-show': ''}`}>音乐</div>
				</NavLink>
				<NavLink to="/video" className={({ isActive }) =>
					isActive ? 'nav-item active' : 'nav-item'
				}>
					<VideocamIcon className='nav-icon'/>
					<div className={`nav-txt ${expandStatus? 'nav-txt-show': ''}`}>视频</div>
				</NavLink>
				<NavLink to="/photo" className={({ isActive }) =>
					isActive ? 'nav-item active' : 'nav-item'
				}>
					<PhotoIcon className='nav-icon'/>
					<div className={`nav-txt ${expandStatus? 'nav-txt-show': ''}`}>图片</div>
				</NavLink>
				<NavLink to="/collect" className={({ isActive }) =>
					isActive ? 'nav-item active' : 'nav-item'
				}>
					<FavoriteIcon className='nav-icon'/>
					<div className={`nav-txt ${expandStatus? 'nav-txt-show': ''}`}>收藏</div>
				</NavLink>
				<NavLink to="/resently" className={({ isActive }) =>
					isActive ? 'nav-item active' : 'nav-item'
				}>
					<AccessTimeIcon className='nav-icon'/>
					<div className={`nav-txt ${expandStatus? 'nav-txt-show': ''}`}>最近播放</div>
				</NavLink>

			</div>
		</div>
		
	)

}

export default LeftNav
