import { useRoutes } from 'react-router-dom'
import Home from '../Home/Home'
const Routes = () => {
	const routes = useRoutes([
		{ path: '/', element: <Home /> },
		{ path: '/musicplayer', element: <MusicPlayer /> },
		{ path: '/vedio', element: <Vedio /> },
		{ path: '/collect', element: <Collect /> },
		{ path: '/resently', element: <Resently /> }
	])
	return routes
}

export default Routes