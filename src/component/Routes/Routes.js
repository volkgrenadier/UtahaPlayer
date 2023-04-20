import { useRoutes } from 'react-router-dom'
import React from 'react'
// import NavColumn from '../Dashboard/NavColumn/NavColumn'
// import Display from '../Dashboard/Display/Display'
import NewSongRec from '../Dashboard/Display/NewSongRec/NewSongRec'
import SearchResult from '../Dashboard/Display/SearchResult/SearchResult'

const Routes = () => {
  const routes = useRoutes([
    {
      path: '/',
      element: <NewSongRec />
    },
    {
      path: 'searchresult',
      element: <SearchResult />
    }
  ])
  return routes
}

export default Routes