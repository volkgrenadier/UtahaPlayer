import React, { useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { showLogin } from '../store/loginSlice'
import styles from './login.module.scss'
const Login = () => {
    const loginStatus = useSelector(state => state.loginStatus)
    const dispatch = useDispatch();
    const loginContainer = useRef()
    const stopEventPop = (e) => {   //  阻止事件冒泡
        e.stopPropagation();
    }
    const closeLogin = () => {  //  关闭登录框
        dispatch(showLogin(false))
    }
  return (
    <div className={styles.login_container} onMouseDown={(e) => { stopEventPop(e) }} ref={loginContainer}>
        <button className={styles.login_closeButton} onClick={closeLogin}></button>
        <p className={styles.login_loginText}>用户登录</p>
        <div className={styles.login_input_outer_Container}>
            <div className={styles.login_input_inner_container}><span>账号: </span><input type="text" name="" id="" className={styles.login_input}/></div>
            <div className={styles.login_input_inner_container}><span>密码: </span><input type="password" name="" id="" className={styles.login_input}/></div>
            <div className={styles.login_input_button_container}>
                <button className={styles.login_input_button}>登录</button>
                <div className={styles.login_input_button_divider}></div>
                <button className={styles.login_input_button}>注册</button>
            </div>
            
        </div>
    </div>
  )
}

export default Login