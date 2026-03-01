import { useRoutes } from 'react-router-dom'
import Home from '../Home/Home'
import Music from '../Music/Music'
import Video from '../Video/Video'
import Photo from '../Photo/Photo'
import Collect from '../Collect/Collect'
import Resently from '../Resently/Resently'
import PhotoSlideShow from '../Photo/PhotoSlideShow/PhotoSlideShow'
const Routes = () => {
	const routes = useRoutes([
		{ path: '/', element: <Home /> },
		{ path: '/music', element: <Music /> },
		{ path: '/video', element: <Video /> },
		{ path: '/photo', element: <Photo /> },
		{ path: '/collect', element: <Collect /> },
		{ path: '/resently', element: <Resently /> },
		{ path: '/slideshow', element: <PhotoSlideShow /> },
	])
	return routes
}

export default Routes