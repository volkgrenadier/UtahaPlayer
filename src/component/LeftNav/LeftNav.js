import { NavLink } from 'react-router-dom';
import './LeftNav.scss'


const LeftNav = () => {
	return (
		<div className='SideBar'>
			<nav>
				<NavLink to="/" className={({ isActive }) => isActive ? "active-link" : ""}>
					Home
				</NavLink>
				<NavLink to="/music" className={({ isActive }) => isActive ? "active-link" : ""}>
					音乐
				</NavLink>
				<NavLink to="/vedio" className={({ isActive }) => isActive ? "active-link" : ""}>
					视频
				</NavLink>
				<NavLink to="/collect" className={({ isActive }) => isActive ? "active-link" : ""}>
					收藏
				</NavLink>
				<NavLink to="/resently" className={({ isActive }) => isActive ? "active-link" : ""}>
					最近播放
				</NavLink>
			</nav>
		</div>
	)

}

export default LeftNav