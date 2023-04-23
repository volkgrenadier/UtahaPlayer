import { createSlice } from "@reduxjs/toolkit";

const initialSearchState = {
    totalPageCount: 0,
    totalPageList: [],
    page: 1,
    searchResultList: [],
    keywords: ''
}

export const searchSlice = createSlice({
    name: "searchState",
    initialState: initialSearchState,
    reducers: {
        pageChange: ( state, action ) => {    //  action.payload表示是否为重置页数
            if (action.payload) {
                state.page = 1
            } else {
                state.page += 1
            }
            

        },
        setPageCount: ( state, action ) => {    //  设置搜索结果总数和页数
            console.log(action.payload)
            
            state.totalPageCount = action.payload
            state.totalPageList = Array.from({length: Math.ceil(action.payload / 30) },( _, index ) => index + 1)

        },
        setSearchResultList: ( state, action ) => { //  设置搜索结果列表
            state.searchResultList = action.payload
        },
        changeKeyword: ( state, action ) => {
            state.keywords = action.payload
        }
    }
})

export const { pageChange, setPageCount, setSearchResultList, changeKeyword} = searchSlice.actions
export default searchSlice.reducer