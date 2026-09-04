import { useLocation } from 'react-router-dom'
import { NotificationProvider } from './utils/NotificationProvider'
import Header from './component/Header/Header'
import LeftNav from './component/LeftNav/LeftNav'
import Routes from './component/Routes/Routes'
import MiniPlayer from './component/Player/MiniPlayer'
import { shouldShowGlobalMiniPlayer } from './component/Player/playerVisibility'
import { MusicPlayerProvider, useMusicPlayer } from './context/MusicPlayerContext'
import './app.scss'

export const PlayerAwareLayout = () => {
	const location = useLocation()
	const { currentMusic, isPlaying } = useMusicPlayer()
	const showMiniPlayer = shouldShowGlobalMiniPlayer({
		pathname: location.pathname,
		currentMusic,
		isPlaying
	})

	return (
		<div className={`app_container${showMiniPlayer ? ' has-mini-player' : ''}`} data-testid="app-shell">
			<Header />
			<div className='main_container'>
				<LeftNav />
				<div className='right_container'>
					<Routes />
				</div>
			</div>
			{showMiniPlayer && <MiniPlayer />}
		</div>
	)
}

function App() {
	const location = useLocation()

	const isSlideShow = location.pathname === '/slideshow'

	return (
		<NotificationProvider>
		{
			isSlideShow 
			? (
				// 播放窗口极简模式
				<div className="slideshow_layout">
					<Routes />
				</div>
			) 
			: (
				// 正常主界面
				<MusicPlayerProvider>
					<PlayerAwareLayout />
				</MusicPlayerProvider>
			)
		}
		</NotificationProvider>
	)
}

export default App
