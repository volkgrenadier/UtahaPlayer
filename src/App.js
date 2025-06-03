import { useEffect, useRef } from 'react';
<<<<<<< HEAD
import { useSelector } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
=======
import { useSelector } from 'react-redux'
import { NotificationProvider } from './utils/NotificationProvider';
>>>>>>> utaha
import DragWindow from './component/DragWindow/DragWindow';
// import Home from './component/Home/Home';
// import MusicPlayer from './component/MusicPlayer/MusicPlayer';
import Header from './component/Header/Header';
import LeftNav from './component/LeftNav/LeftNav';
// import Music from './component/Music/Music';
// import Vedio from './component/Vedio/Vedio';
// import Collect from './component/Collect/Collect';
// import Resently from './component/Resently/Resently';
import Routes from './component/Routes/Routes';
import './app.scss';

function App() {
<<<<<<< HEAD
	const loginStatus = useSelector(state => state.loginStatus)
	useEffect(() => { //  是否显示登录页

	}, [])
	return (
		
		<div className='app_container'>
			<DragWindow>
				<Header />
			</DragWindow>
			<div className='main_container'>
				<BrowserRouter>
					<LeftNav />
					<div className='right_container'>
						<Routes />
					</div>
				</BrowserRouter>
			</div>
		</div>
	);
}
=======
	// const loginStatus = useSelector(state => state.loginStatus)
	// useEffect(() => { //  是否显示登录页
		
	// }, [])
	return (
		<NotificationProvider>
			<div className='app_container'>
				<DragWindow>
					<Header />
				</DragWindow>
				{/* <Home /> */}
				<MusicPlayer />
			</div>
		</NotificationProvider>
	);
	}
>>>>>>> utaha

export default App;
