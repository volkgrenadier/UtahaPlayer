import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { NotificationProvider } from './utils/NotificationProvider';
import DragWindow from './component/DragWindow/DragWindow';
import Header from './component/Header/Header';
import LeftNav from './component/LeftNav/LeftNav';
import Routes from './component/Routes/Routes';
import './app.scss';

function App() {
	// const loginStatus = useSelector(state => state.loginStatus)
	// useEffect(() => { //  是否显示登录页
		
	// }, [])
	return (
		<NotificationProvider>
			<div className='app_container'>
				<DragWindow>
					<Header />
				</DragWindow>
				<div className='main_container'>
					<HashRouter>
						<LeftNav />
						<div className='right_container'>
							<Routes />
						</div>
					</HashRouter>
				</div>
			</div>
		</NotificationProvider>
	);
}

export default App;
