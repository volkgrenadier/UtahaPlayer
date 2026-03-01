import { useLocation } from 'react-router-dom'
import { NotificationProvider } from './utils/NotificationProvider'
import DragWindow from './component/DragWindow/DragWindow'
import Header from './component/Header/Header'
import LeftNav from './component/LeftNav/LeftNav'
import Routes from './component/Routes/Routes'
import './app.scss'

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
				<div className='app_container'>
					<DragWindow>
						<Header />
					</DragWindow>
					<div className='main_container'>
						<LeftNav />
						<div className='right_container'>
							<Routes />
						</div>
					</div>
				</div>
			)
		}
		</NotificationProvider>
	)
}

export default App