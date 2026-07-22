import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' 

console.log("CLIENT_ID:", import.meta.env.VITE_GOOGLE_CLIENT_ID);
console.log("MAPS_KEY:", import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
