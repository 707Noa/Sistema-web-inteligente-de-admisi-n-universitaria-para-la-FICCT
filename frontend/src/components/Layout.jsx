import React from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}
