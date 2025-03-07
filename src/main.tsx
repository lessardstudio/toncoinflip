import { Buffer } from 'buffer';

// Полифил для Buffer в браузере
window.Buffer = window.Buffer || Buffer;

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App'

import {  ToastContainer } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';



createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastContainer
      position="bottom-right"
      autoClose={1000}
      limit={5}
      />
    <App/>
  </StrictMode>,
)
