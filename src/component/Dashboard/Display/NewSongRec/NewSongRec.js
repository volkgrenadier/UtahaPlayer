import React, { useLayoutEffect, useState} from 'react'
import { getHomeInfo, getRecommandNewSong, search } from '../../../request/request'
import styles from './newSongRec.module.scss'
const NewSongRec = () => {
    const [recSongType, setRecSoneType] = useState(0)
    const [data, setData] = useState([])  //  新歌速递全部数据
    const [shortData, setShortData] = useState([])  //  新歌速递展示的简要数据
    
    // let data = testData
    useLayoutEffect(() => {
        // getHomeInfo()
        // .then(r => {
        //   console.log(r)
        // })
        getRecommandNewSong()
        .then(r => {
        // console.log(r)
        let list = [];
        for (let i = 0; i < 12; i++) {
            let item = r.data.data[i]
            if (item.name.length > 7) {
            item.name = `${item.name.slice(0,6)}...`
            }
            if (item.artists[0].name > 8) {
            item.artists[0].name = `${item.name.slice(0,7)}...`
            }
            list.push(item)
        }
        setShortData(list)
        setData(r.data.data)
        
        })
        // data.map(item => {
        //   if (item.name.length > 7) {
        //     item.name = `${item.name.slice(0,6)}...`
        //   }
        //   if (item.artists[0].name > 8) {
        //     item.artists[0].name = `${item.name.slice(0,7)}...`
        //   }
        // })
    },[])
    // console.log(testData)
    const changeRecSongType = (e) => {  //  改变新歌速递的地区
        let type = e.target.getAttribute('sort')
        console.log(type)
        // console.log(e.target.attributes[1].value)
        if (!type || recSongType == type) {  //  如果当前点击的就是当前已选中的或点击的不是四个分类的地方，那么不再执行
        return 
        }
        setRecSoneType(type)
        getRecommandNewSong(type)
        .then(r => {
        console.log(r)
        let list = [];
        for (let i = 0; i < 12; i++) {
            let item = r.data.data[i]
            if (item.name.length > 7) {
            item.name = `${item.name.slice(0,6)}...`
            }
            if (item.artists[0].name > 8) {
            item.artists[0].name = `${item.name.slice(0,7)}...`
            }
            list.push(item)
        }
        setShortData(list)
        setData(r.data.data)
        // console.log(r.data.data)
        })
    }
    return (
        <div className={styles.newSongRec_newSongRec_outer_container}>
        <div className={styles.newSongRec_newSongRec_text}>
          {/* <div className={styles.newSongRec_newSongRec_text_topic}>新歌速递</div> */}
          <div className={styles.newSongRec_newSongRec_text_sort_container} onClick = { e=> {changeRecSongType(e)} }>
            <div className={`${styles.newSongRec_newSongRec_text_sort} ${recSongType == 0 ? styles.newSongRec_newSongRec_text_sort_active :''}`} sort='0'>全部</div>
            <div className={`${styles.newSongRec_newSongRec_text_sort} ${recSongType == 7 ? styles.newSongRec_newSongRec_text_sort_active :''}`} sort='7'>华语</div>
            <div className={`${styles.newSongRec_newSongRec_text_sort} ${recSongType == 96 ? styles.newSongRec_newSongRec_text_sort_active :''}`} sort='96'>欧美</div>
            <div className={`${styles.newSongRec_newSongRec_text_sort} ${recSongType == 8 ? styles.newSongRec_newSongRec_text_sort_active :''}`} sort='8'>日本</div>
            <div className={`${styles.newSongRec_newSongRec_text_sort} ${recSongType == 16 ? styles.newSongRec_newSongRec_text_sort_active :''}`} sort='16'>韩国</div>
          </div>
        </div>
        <ul className={styles.newSongRec_newSongRec_container}>
          {
            shortData.map(item => {
              return (
                <li key={item.id} className={styles.newSongRec_newSongRec_song_container}>
                  <div className={styles.newSongRec_newSongRec_song_img_container}>
                    <img src={item.album.blurPicUrl} alt="" className={styles.newSongRec_newSongRec_song_img} loading="lazy"/>
                    <div className={styles.newSongRec_newSongRec_song_img_curtain}></div>
                  </div>
                  <div className={styles.newSongRec_newSongRec_song_text_Container}>
                    <p className={styles.newSongRec_newSongRec_song_name}>{item.name}</p>
                    <p className={styles.newSongRec_newSongRec_song_artists}>{item.artists[0].name}</p>
                  </div>
                </li>
              )
            })
          }
        </ul>
      </div>
    )
}

export default NewSongRec