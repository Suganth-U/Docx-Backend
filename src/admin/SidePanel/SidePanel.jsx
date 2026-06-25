import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Database,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  MonitorPlay,
  Settings,
  ShieldAlert,
  Stethoscope,
  Users,
  CreditCard
} from 'lucide-react';
import { assets } from "@/shared/lib/assets";
import useAuth from "@/shared/hooks/useAuth";
import useAxiosPrivate from "@/shared/hooks/useAxiosPrivate";
import { clearAuthSessionStorage } from "@/shared/lib/authSession";
import "@/admin/SidePanel/SidePanel.css";

const AdminSidePanel = () => {
  const axiosPrivate = useAxiosPrivate();
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const [expandedCategories, setExpandedCategories] = useState({
    dashboard: true,
    users: true,
    appointments: true,
    inventory: true,
    content: true,
    clinical: true,
    settings: true,
    financials: true
  });

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleLogout = async () => {
    try {
      await axiosPrivate.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setAuth({});
      clearAuthSessionStorage();
      navigate("/admin/login", { replace: true });
    }
  };

  const navGroups = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      items: [
        { name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      id: 'users',
      label: 'User Management',
      items: [
        { name: 'Doctors', path: '/admin/doctors', icon: Stethoscope },
        { name: 'Patients', path: '/admin/patients', icon: Users },
      ]
    },
    {
      id: 'appointments',
      label: 'Appointment Desk',
      items: [
        { name: 'All Appointments', path: '/admin/appointments', icon: ClipboardList },
      ]
    },
    {
      id: 'clinical',
      label: 'Clinical Operations',
      items: [
        { name: 'EHR Records', path: '/admin/ehr', icon: HeartPulse },
        { name: 'Online Consultations', path: '/admin/online-consultation', icon: MonitorPlay },
      ]
    },
    {
      id: 'inventory',
      label: 'Pharmacy & Inventory',
      items: [
        { name: 'Pharmacy Store', path: '/admin/pharmacy', icon: Database },
      ]
    },
    {
      id: 'financials',
      label: 'Financials',
      items: [
        { name: 'Payments & Revenue', path: '/admin/payments', icon: CreditCard },
      ]
    },
    {
      id: 'content',
      label: 'Content Management',
      items: [
        { name: 'Manage Blogs', path: '/admin/blogs', icon: BookOpen },
        { name: 'Manage FAQs', path: '/admin/faqs', icon: CircleHelp },
      ]
    },
    {
      id: 'settings',
      label: 'Settings & Config',
      items: [
        { name: 'System Settings', path: '/admin/settings', icon: Settings },
        { name: 'Admin Profile', path: '/admin/profile', icon: ShieldAlert },
      ]
    }
  ];

  return (
    <div className="admin-sidebar-container">
      {/* Brand */}
      <div className="admin-brand">
        <img src={assets.toplogo} alt="DocX" className="admin-logo" />
        <span className="admin-brand-text">DocX.</span>
      </div>

      <div className="admin-nav-scroll">
        {/* Nested Categories */}
        {navGroups.map((group) => (
          <div key={group.id} className="admin-nav-group">
            <div
              className="admin-group-header"
              onClick={() => toggleCategory(group.id)}
            >
              <span className="admin-group-label">{group.label}</span>
              {expandedCategories[group.id] ?
                <ChevronDown size={14} className="group-arrow" /> :
                <ChevronRight size={14} className="group-arrow" />
              }
            </div>

            <div className={`admin-group-content ${expandedCategories[group.id] ? 'expanded' : 'collapsed'}`}>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `admin-nav-item nested ${isActive ? "active" : ""}`
                  }
                >
                  <item.icon size={18} className="admin-nav-icon" />
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="admin-sidebar-footer">
        <button type="button" className="admin-logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSidePanel;
