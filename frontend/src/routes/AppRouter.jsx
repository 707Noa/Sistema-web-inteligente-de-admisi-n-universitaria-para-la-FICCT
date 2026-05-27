import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Login from '../pages/auth/Login'

export default function AppRouter(){
  return (
    <Routes>
      <Route path="/login" element={<Login/>} />
    </Routes>
  )
}
