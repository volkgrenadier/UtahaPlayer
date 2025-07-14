import { NavLink } from 'react-router-dom';
import './LeftNav.scss';
import AccessTimeIcon from '@mui/icons-material/AccessTime';//最近播放
import FavoriteIcon from '@mui/icons-material/Favorite';//收藏
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import VideocamIcon from '@mui/icons-material/Videocam';

const LeftNav = () => {
	return (
		
		<div className='sideBar'>
			{/* <NavLink to="/" className={({ isActive }) =>
				isActive ? 'nav-item active' : 'nav-item'
			}>
				Home
			</NavLink> */}
			<div className='sideTitle'>
				媒体库
			</div>
			<NavLink to="/music" className={({ isActive }) =>
				isActive ? 'nav-item active' : 'nav-item'
			}>
				<MusicNoteIcon className='nav-icon'/>
				<div className='nav-txt'>音乐</div>
			</NavLink>
			<NavLink to="/video" className={({ isActive }) =>
				isActive ? 'nav-item active' : 'nav-item'
			}>
				<VideocamIcon className='nav-icon'/>
				<div className='nav-txt'>视频</div>
			</NavLink>
			<NavLink to="/collect" className={({ isActive }) =>
				isActive ? 'nav-item active' : 'nav-item'
			}>
				<FavoriteIcon className='nav-icon'/>
				<div className='nav-txt'>收藏</div>
			</NavLink>
			<NavLink to="/resently" className={({ isActive }) =>
				isActive ? 'nav-item active' : 'nav-item'
			}>
				<AccessTimeIcon className='nav-icon'/>
				<div className='nav-txt'>最近播放</div>
			</NavLink>

		</div>
	)

}

export default LeftNav