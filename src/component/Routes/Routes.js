import { useRoutes } from 'react-router-dom'
import React from 'react'
import NavColumn from '../Dashboard/NavColumn/NavColumn'
import Display from '../Dashboard/Display/Display'

const Routes = () => {
  const routes = useRoutes([
    {
      path: '/',
      element: <NavColumn />
    },
    {
      path: 'music',
      element: <Display />
    }
  ])
  return routes
}

export default Routes