import React, { useLayoutEffect, useState} from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { changeKeyword, pageChange, setPageCount, setSearchResultList } from '../../store/searchSlice'
import { getHomeInfo, getRecommandNewSong, search } from '../../request/request'
import Routes from '../../Routes/Routes'
import { routesList } from '../../Routes/routesList'
import styles from './display.module.scss'
import { testData } from './testdata'
const Display = () => {
  const [inputVal, setInputVal] = useState('')  //  搜索标签输入值
  const [path, setPath] = useState('/') //  当前路径
  const searchState = useSelector(state => state.searchState)
  const nav = useNavigate()
  const dispatch = useDispatch()
  const searchFun = () => {  //  搜索
    // console.log('执行了')
    if ( inputVal !== '' ) {  //  输入不为空
      dispatch( changeKeyword( inputVal ) )
      dispatch( pageChange(true) )
      search( inputVal )
      .then( r=> {
        console.log(r)
        if (r.data.code === 200) {  //  成功返回数据
          for (let i = 0; i < r.data.result.songs.length; i++) {   //  处理获得每首歌歌手的完整字符串
            r.data.result.songs[i].fullArName = ''
            for (let j = 0; j < r.data.result.songs[i].ar.length; j++) {
                if (j !== r.data.result.songs[i].ar.length - 1) {
                    r.data.result.songs[i].fullArName += `${r.data.result.songs[i].ar[j].name}、`
                } else {
                    r.data.result.songs[i].fullArName += r.data.result.songs[i].ar[j].name
                }
                
            }
          }
          dispatch( setPageCount(r.data.result.songCount) )
          dispatch( setSearchResultList( r.data.result.songs ) )
          setPath('searchresult')
          nav('searchresult')
        }
      })
    }
  }
  const changePath = (e) => {  //  改变路由
    // console.log(e.target)
    if (e.target.attributes['path']) {
      setPath(e.target.attributes['path'].value)
      nav(e.target.attributes['path'].value)
    }
  }


  const scrollForMoreSongs = e => {
    // console.log(e)
    if (searchState.keywords !== '' && e.target.clientHeight + e.target.scrollTop + 2 >= e.target.scrollHeight) {
      //  下一页数据
      console.log('next page')
      dispatch( pageChange(false) )
      search( searchState.keywords, searchState.page + 1  )
      .then( r=> {
        if (r.data.code === 200) {
          for (let i = 0; i < r.data.result.songs.length; i++) {   //  处理获得每首歌歌手的完整字符串
            r.data.result.songs[i].fullArName = ''
            for (let j = 0; j < r.data.result.songs[i].ar.length; j++) {
                if (j !== r.data.result.songs[i].ar.length - 1) {
                    r.data.result.songs[i].fullArName += `${r.data.result.songs[i].ar[j].name}、`
                } else {
                    r.data.result.songs[i].fullArName += r.data.result.songs[i].ar[j].name
                }
                
            }
          }
          dispatch( setSearchResultList( [...searchState.searchResultList,...r.data.result.songs] ) )
        }
      } )
    }
  }
  return (
    <div className={styles.display_container} onScroll={e => scrollForMoreSongs(e)}>
      <div className={styles.display_input_container}>
        <div className={styles.display_input_inner_container}>
          <input type="text" name="" id="" placeholder='搜索...' className={styles.display_input_input} value={inputVal} onChange={ e => setInputVal(e.target.value) }/>
          <button className={styles.display_input_img} onClick={searchFun}></button>
        </div>
      </div>
      <ul className={styles.display_navBar} onClick={e => changePath(e)}>
        {
          routesList.map( (item, index) => {
            return (
              <li key={index} path={item.path} className={ `${styles.display_navBar_item} ${path === item.path? styles.display_navBar_item_selected: ''}` }>
                {item.name}
              </li>
            )
          } )
        }
      </ul>
      <Routes />
    </div>
  )
}

export default Display