import { useRoutes } from 'react-router-dom'
import Home from '../Home/Home'
import Music from '../Music/Music'
import Vedio from '../Vedio/Vedio'
import Collect from '../Collect/Collect'
import Resently from '../Resently/Resently'
const Routes = () => {
	const routes = useRoutes([
		{ path: '/', element: <Home /> },
		{ path: '/music', element: <Music /> },
		{ path: '/vedio', element: <Vedio /> },
		{ path: '/collect', element: <Collect /> },
		{ path: '/resently', element: <Resently /> }
	])
	return routes
}

export default Routes