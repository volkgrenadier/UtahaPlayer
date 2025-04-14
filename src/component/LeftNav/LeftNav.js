import { NavLink } from 'react-router-dom';
import './LeftNav.scss'


const LeftNav = () => {
	return (
		<div className='sideBar'>
			<NavLink to="/" className={({ isActive }) =>
				isActive ? 'nav-item active' : 'nav-item'
			}>
				Home
			</NavLink>
			<NavLink to="/music" className={({ isActive }) =>
				isActive ? 'nav-item active' : 'nav-item'
			}>
				音乐
			</NavLink>
			<NavLink to="/vedio" className={({ isActive }) =>
				isActive ? 'nav-item active' : 'nav-item'
			}>
				视频
			</NavLink>
			<NavLink to="/collect" className={({ isActive }) =>
				isActive ? 'nav-item active' : 'nav-item'
			}>
				收藏
			</NavLink>
			<NavLink to="/resently" className={({ isActive }) =>
				isActive ? 'nav-item active' : 'nav-item'
			}>
				最近播放
			</NavLink>

		</div>
	)

}

export default LeftNav