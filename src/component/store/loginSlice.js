import { createSlice } from '@reduxjs/toolkit'

const initialLoginState = {
    isLogin: false,
    token : '',
    showLogin: false
}

export const loginSlice = createSlice({
    name: 'loginStatus',
    initialState: initialLoginState,    //  提供初始状态
    reducers: {                         //  更新状态的reducer
        login: (state, action) => {     
            state.isLogin = true;
            state.token = action.payload;
        },
        logout: (state) => {
            state.isLogin = false;
            state.token = '';
        },
        showLogin: (state,action) => {
            state.showLogin = action.payload
        }
    }
})

export const { login, logout, showLogin } = loginSlice.actions
export default loginSlice.reducer