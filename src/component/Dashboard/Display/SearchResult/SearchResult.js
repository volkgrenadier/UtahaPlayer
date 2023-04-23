import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { pageChange, setSearchResultList } from '../../../store/searchSlice'
import { search } from '../../../request/request'
import styles from './searchResult.module.scss'
const SearchResult = () => {
  const searchResultState = useSelector(state => state.searchState)
  const dispatch = useDispatch()
  console.log(searchResultState)

  
  return (
    <div className={styles.searchResult_container}>
      <ul className={styles.searchResult_list} >
        {
          searchResultState.searchResultList.map((item, index) => {
            return (
              <li key={index} className={styles.searchResult_list_li} musicid = {item.id}>
                <div title={item.name} className={styles.searchResult_list_li_name}>{item.name}</div>
                <div title={item.fullArName} fullvalue={item.fullArName}>{item.ar.map( (i,index) => index === item.ar.length - 1 ? <span>{i.name}</span> :<span>{i.name}、</span>)}</div>
                <div className={styles.searchResult_list_li_alName} title={item.al.name} fullvalue={item.al.name}>{item.al.name}</div>
              </li>
            )
          })
        }
      </ul>
      {/* <ul className={styles.searchResult_list_page_container} onClick={e => tryChangePage(e)}>
        {
          searchResultState.searchResultList.length > 0 ? (
            <li className={styles.searchResult_list_page_li} key={-1} isset={'change'} isnext={"false"}>{'<'}</li>
          ) : {

          }
        }
        {
          searchResultState.totalPageList.map( (item, index) => (
            <li className={`${styles.searchResult_list_page_li} ${searchResultState.page === item ? styles.searchResult_list_page_li_selected : ''}`} key={index} isset={'set'} page={item}>{item}</li>
          ) )
        }
        {
          searchResultState.searchResultList.length > 0 ? (
            <li className={styles.searchResult_list_page_li} key={searchResultState.searchResultList.length} isset={'change'} isnext={"true"}>{'>'}</li>
          ) : {

          }
        }
      </ul> */}
    </div>
  )
}

export default SearchResult