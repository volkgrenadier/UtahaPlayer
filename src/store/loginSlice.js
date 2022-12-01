import { createSlice } from '@reduxjs/toolkit'

const initialLoginState = {
    isLogin: false,
    token : ''
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
        }
    }
})

export const { login, logout } = loginSlice.actions
export default loginSlice.reducer