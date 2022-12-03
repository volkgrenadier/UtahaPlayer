import React,{ useState } from 'react'
import styles from './header.module.scss'
const Header = () => {
    const { ipcRenderer } = window.require('electron');
    const [winStatus, setWinStatus] = useState(false);//  window status: true or false
    const myClose =() => {
        ipcRenderer.send('close-window');
        console.log("关闭窗口")
    }
    const changeWindow = async (flag) => { //  send window events to main process
      
      switch (flag) {
        case 'minimize':      //  minimize window
          ipcRenderer.send('minimize-window');
          break;
      
        case 'maximize':        //  maximize window or restore window
          
          let backImgFlag = await ipcRenderer.invoke('maximize-window');

          backImgFlag ?           //  if backImgFlag === true means that now the window is not max, so the background of button should be maximize, in this case, the value of winStatus should be false
          setWinStatus(false) : 
          setWinStatus(true);

          break;
        default:
          break;
      }
    }
  return (
    <div className={styles.header_container}>
        <button onClick={() =>{myClose()}} className={styles.header_button} id={styles.header_button_close}></button>
        <button onClick={() =>{changeWindow('maximize')}} className={styles.header_button} id={winStatus ? styles.header_button_fullScreen_max : styles.header_button_fullScreen_min}></button>
        <button onClick={() =>{changeWindow('minimize')}} className={styles.header_button} id={styles.header_button_minimizeScreen}></button>
    </div>
  )
}

export default Header