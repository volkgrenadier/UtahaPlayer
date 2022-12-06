import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux'
import Home from './component/Dashboard/Dashboard';
import Header from './component/Header/Header';
import Player from './component/Player/Player';
import DragWindow from './component/DragWindow/DragWindow';
import Login from './component/Login/Login'
import styles from './app.module.scss'

function App() {
  const loginContainer = useRef();
  const loginStatus = useSelector(state => state.loginStatus)
  console.log(loginStatus)
  useEffect(() => { //  是否显示登录页
    if (loginStatus.showLogin) {
      loginContainer.current.style.display = 'block'
      loginContainer.current.style.zIndex = 12
    }
    else{
      loginContainer.current.style.display = 'none'
    }
  }, [loginStatus])
  return (
    <div className={styles.app}>
      <DragWindow>
        <Header />
      </DragWindow>
      <div className={styles.app_login_Container} ref={loginContainer}>
        <Login />
      </div>
      <Home />
      <Player />
    </div>
  );
}

export default App;
