import React from 'react'
import { useSelector } from 'react-redux'
import styles from './searchResult.module.scss'
const SearchResult = () => {
  const searchResultState = useSelector(state => state.searchState)
  console.log(searchResultState)
  return (
    <div className={styles.searchResult_container}>
      <ul className={styles.searchResult_list}>
        {
          searchResultState.searchResultList.map((item, index) => {
            return (
              <li key={index} className={styles.searchResult_list_li} musicId = {item.id}>
                <div>{item.name}</div>
                <div>{item.ar.map( i => <span>{i.name}</span>)}</div>
                <div>{item.al.name}</div>
              </li>
            )
          })
        }
      </ul>
      <ul className={styles.searchResult_list_page_container}>
        {
          searchResultState.totalPageList.map( item => (
            <li>{item}</li>
          ) )
        }
      </ul>
    </div>
  )
}

export default SearchResult