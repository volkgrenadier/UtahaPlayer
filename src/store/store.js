import { configureStore } from '@reduxjs/toolkit'
import loginReducer from './loginSlice'
import userConfigReducer from './userConfigSlice'




export default configureStore({
    reducer: {
        loginAndLogout: loginReducer,
        userConfig: userConfigReducer
    }
})