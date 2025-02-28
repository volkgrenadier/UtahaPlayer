import { useRoutes } from 'react-router-dom'
import Home from '../Home/Home'
const Routes = () => {
  const routes = useRoutes([
    {
      path: '/',
      element: <Home />
    },
  ])
  return routes
}

export default Routes