import { createSlice } from "@reduxjs/toolkit";

const initialSearchState = {
    totalPageCount: 0,
    totalPageList: [],
    page: 0,
    searchResultList: []
}

export const searchSlice = createSlice({
    name: "searchState",
    initialState: initialSearchState,
    reducers: {
        pageChange: ( state, action ) => {    //  action中,flag表示页数增减，count表示增减页数
            if (action.payload.flag) {  //  标志位为true，增加页数
                state.page += action.payload.count
            }else {
                state.page -= action.payload.count
            }

        },
        setPageCount: ( state, action ) => {    //  设置搜索结果总数和页数
            console.log(action.payload)
            
            state.totalPageCount = action.payload
            state.totalPageList = Array.from({length: Math.ceil(action.payload / 30) },( _, index ) => index + 1)

        },
        setSearchResultList: ( state, action ) => {
            state.searchResultList = action.payload
        }
    }
})

export const { pageChange, setPageCount, setSearchResultList} = searchSlice.actions
export default searchSlice.reducer