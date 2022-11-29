import React from 'react'
import Audio from './Audio'
import styles from './player.module.scss'
const Player = () => {
  return (
    <div className={styles.player_container}>
        <Audio />
    </div>
  )
}

export default Player