import React from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from "@/doctor/NavBar/NavBar";
import "@/doctor/DocDashboard/DocDashboard.css";

const DocDashboard = ({ children }) => {
  const content = children ?? <Outlet />;

  return (
    <div className='dashboard-layout'>
      <main className='main-content'>
        <div className="navbar-wrapper">
          <NavBar />
        </div>

        <div className='content-scroll-area'>
          {content}
        </div>
      </main>
    </div>
  )
}

export default DocDashboard;
