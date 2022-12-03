import React from 'react'
import { HashRouter } from 'react-router-dom'
import NavColumn from './NavColumn/NavColumn'
import Display from './Display/Display'
import styles from './dashboard.module.scss'
const Dashboard = () => {
  return (
    
    <HashRouter>
      <div className={styles.dashboard_container}>
        <NavColumn />
        <Display />
      </div>
    </HashRouter>
  )
}

export default Dashboard