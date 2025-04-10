import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import DragWindow from './component/DragWindow/DragWindow';
// import Home from './component/Home/Home';
// import MusicPlayer from './component/MusicPlayer/MusicPlayer';
import Header from './component/Header/Header';
// import Music from './component/Music/Music';
// import Vedio from './component/Vedio/Vedio';
// import Collect from './component/Collect/Collect';
// import Resently from './component/Resently/Resently';
import Routes from './component/Routes/Routes';
import './app.scss';

function App() {
	const loginStatus = useSelector(state => state.loginStatus)
	useEffect(() => { //  是否显示登录页

	}, [])
	return (
		<div className='app_container'>
			<DragWindow>
				<Header />
			</DragWindow>
			<BrowserRouter>
				{/* 设置样式，路由有问题！！！ */}
				<div>
					<Routes />
				</div>
			</BrowserRouter>
		</div>
	);
}

export default App;
