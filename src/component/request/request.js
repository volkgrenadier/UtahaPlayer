import axios from 'axios'
import md5 from 'blueimp-md5'   //  引入md5加密
const instance = axios.create({
    baseURL: 'https://www.utaha.tk/',
    timeout: 10000
})

export const phoneLogin_password = ( phoneNumber, password, countryCode = 86 ) => {      //   手机密码登录
    //  第三个参数为国家码，默认为86中国大陆
    let enCodedPassword = md5(password) //  对密码进行md5加密
    let reqOpt = {  //  请求配置
        url: '/login/cellphone',
        params: {
            phone: phoneNumber,
            md5_password: enCodedPassword,
            countrycode: countryCode
        }
    }

    return instance.request(reqOpt)
    
}
export const getCaptcha = ( phoneNumber, countryCode = 86 ) => {      //   获取手机验证码
    //  第三个参数为国家码，默认为86中国大陆
    
    let reqOpt = {  //  请求配置
        url: ' /captcha/sent',
        params: {
            phone: phoneNumber,
            ctcode: countryCode
        }
    }

    return instance.request(reqOpt)
    
}
export const phoneLogin_captcha = ( phoneNumber, captcha, countryCode = 86 ) => {      //   手机验证码登录
    //  第三个参数为国家码，默认为86中国大陆
    
    let reqOpt = {  //  请求配置
        url: '/login/cellphone',
        params: {
            phone: phoneNumber,
            captcha: captcha,
            countrycode: countryCode
        }
    }

    return instance.request(reqOpt)
    
}
export const emailLogin_password = ( email, password ) => {      //   手机验证码登录
    //  v3.30.0后支持手动传入 cookie,登录接口返回内容新增 cookie 字段,保存到本地后,get 请求带上?cookie=xxx (先使用 encodeURIComponent() 编码 cookie 值) 或者 post 请求 body 带上 cookie 即可,如:/user/cloud?cookie=xxx 或者{...，cookie: "xxx"}
    let enCodedPassword = md5(password) //  对密码进行md5加密
    let reqOpt = {  //  请求配置
        url: '/login/cellphone',
        params: {
            email: email,
            password: enCodedPassword,
        }
    }

    return instance.request(reqOpt)
    
}


export const getRecommandNewSong = () => {  //  新歌速递，type为地区类型id，0为全部、7为华语、96为欧美、8为日本、16为韩国
    let reqOpt = {  //  请求配置
        url: '/top/song',
        params: {
            type: 0
        }
    }

    return instance.request(reqOpt)
}

export const getHomeInfo = () => {  //  首页-发现
    let reqOpt = {  //  请求配置
        url: '/homepage/block/page',
    }

    return instance.request(reqOpt)
}