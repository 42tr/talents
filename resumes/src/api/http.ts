// src/api/http.ts
import axios from 'axios'
import type { AxiosInstance, AxiosResponse } from 'axios'

const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // 根据需要配置
  timeout: 10000
})

// 请求拦截器
http.interceptors.request.use(
  (config) => {
    // 可在此添加 Token
    // if (localStorage.getItem('token')) {
    //   config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`
    // }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
http.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

export default http
