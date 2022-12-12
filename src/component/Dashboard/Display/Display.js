import React, { useEffect } from 'react'
import { getHomeInfo, getRecommandNewSong } from '../../request/request'
import styles from './display.module.scss'
import { testData } from './testdata'
const Display = () => {
  let data = testData
  useEffect(() => {
    // getHomeInfo()
    // .then(r => {
    //   console.log(r)
    // })
    // getRecommandNewSong()
    // .then(r => {
    //   console.log(r)
    // })
    data.map(item => {
      if (item.name.length > 7) {
        item.name = `${item.name.slice(0,6)}...`
      }
      if (item.artists[0].name > 8) {
        item.artists[0].name = `${item.name.slice(0,7)}...`
      }
    })
  },[])
  console.log(testData)
  return (
    <div className={styles.display_container}>
      <div className={styles.display_banner_container}>banner</div>
      <ul className={styles.display_newSongRec_container}>
        {
          data.map(item => {
            return (
              <li key={item.id} className={styles.display_newSongRec_song_container}>
                <img src={require('./utaha_min.png')} alt="456465" className={styles.display_newSongRec_song_img} loading="lazy"/>
                <div className={styles.display_newSongRec_song_text_Container}>
                  <p className={styles.display_newSongRec_song_name}>{item.name}</p>
                  <p className={styles.display_newSongRec_song_artists}>{item.artists[0].name}</p>
                </div>
              </li>
            )
          })
        }
      </ul>
    </div>
  )
}

export default Display