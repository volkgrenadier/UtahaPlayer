import { configureStore } from '@reduxjs/toolkit'
import loginReducer from './loginSlice'
import userConfigReducer from './userConfigSlice'
import searchReducer from './searchSlice'




export default configureStore({
    reducer: {
        loginStatus: loginReducer,
        userConfig: userConfigReducer,
        searchState: searchReducer
    }
})