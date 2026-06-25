import React from 'react';
import NavBar from "@/admin/NavBar/NavBar";
import "@/admin/AdminDashboard/AdminDashboard.css"; // Reusing the layout CSS

const AdminLayout = ({ children }) => {
    return (
        <div className='admin-layout'>
            <main className="admin-main">
                <div className="admin-navbar">
                    <NavBar />
                </div>
                <div className="admin-content">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
