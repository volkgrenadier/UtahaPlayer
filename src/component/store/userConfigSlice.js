import { createSlice } from '@reduxjs/toolkit';
import userLocalConfig from '../../config/user.json';

const { ipcRenderer } = window.require('electron')
let userConfig = userLocalConfig.user;




const initialUserConfig = {     //  初始状态
    volume: userConfig.volume,  //  音量值
    volumeStatus: userConfig.volumeStatus,            //  音量状态，用于控制音量图标
    themeColor: userConfig.themeColor,
    backgroundImg: userConfig.backgroundImg,
    lastCurrentTime: userConfig.music.lastCurrentTime,
    lastMusicId: userConfig.music.lastMusicId,
    lastMusicDuration: userConfig.music.lastMusicDuration
}

export const userConfigState = createSlice({
    name: 'userConfig',         
    initialState: initialUserConfig,            //  提供初始状态
    reducers: {     //  更新状态的reducer
        changeVolume: (state, action)=> {
            ipcRenderer.send("update-userConfig", {
                attrName: ['volume','volumeStatus'],
                value: [action.payload.volume,action.payload.volumeStatus]
            })
            state.volumeStatus = action.payload.volumeStatus
            state.volume = parseInt(action.payload.volume);
            
        },
        changeThemeColor: (state, action)=> {
            ipcRenderer.send("update-userConfig", {
                attrName: ['themeColor'],
                value: [action.payload]
            })
            state.themeColor = action.payload;
        },
        changeBackgroundImg: (state, action)=> {
            ipcRenderer.send("update-userConfig", {
                attrName: ['backgroundImage'],
                value: [action.payload]
            })
            state.backgroundImg = action.payload;
        },
        changeMusic: (state, action)=> {
            ipcRenderer.send("update-userconfig-music", {
                attrName: ['lastMusicId', 'lastCurrentTime', 'lastMusicDuration'],
                value: [action.payload.lastMusicId, action.payload.lastCurrentTime, action.payload.lastMusicDuration]
            })
            state.lastCurrentTime = action.payload.lastCurrentTime;
            state.lastMusicId = action.payload.lastMusicId;
        },
    }
})



export const { changeVolume, changeThemeColor, changeBackgroundImg, changeMusic } = userConfigState.actions;
export default userConfigState.reducer;

