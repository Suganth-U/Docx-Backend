import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Video, Users, FileText,
  FlaskConical, Pill, Share2, Clock, DollarSign,
  MessageSquare, User, Settings, LogOut, ChevronDown, ChevronRight
} from 'lucide-react';
import { assets } from "@/shared/lib/assets";
import "@/doctor/SidePanel/SidePanel.css";

const DoctorSidePanel = () => {
  const location = useLocation();
  const [expandedCategories, setExpandedCategories] = useState({
    clinical: true,
    prescribing: true,
    administration: true, // Visible by default
    account: true // Visible by default
  });

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const menuStructure = [
    {
      id: 'clinical',
      title: 'Clinical',
      items: [
        { name: 'Dashboard', path: '/doctor/dashboard', icon: LayoutDashboard },
        { name: 'My Appointments', path: '/doctor/appointments', icon: Calendar },
        { name: 'Online Sessions', path: '/doctor/schedule', icon: Video },
        { name: 'Patient Records', path: '/doctor/patients', icon: Users },
      ]
    },
    {
      id: 'prescribing',
      title: 'Prescribing',
      items: [
        { name: 'Prescriptions', path: '/doctor/prescription', icon: FileText },
        { name: 'Requests', path: '/doctor/requests', icon: FileText },
      ]
    },
    {
      id: 'administration',
      title: 'Administration',
      items: [
        { name: 'Shift & Availability', path: '/doctor/my-schedule', icon: Clock },
        { name: 'Messages', path: '/doctor/messages', icon: MessageSquare },
      ]
    },
    {
      id: 'account',
      title: 'Account',
      items: [
        { name: 'Profile', path: '/doctor/profile', icon: User },
        { name: 'Settings', path: '/doctor/settings', icon: Settings },
      ]
    }
  ];

  return (
    <div className="side-panel">
      {/* Logo */}
      <div className="brand-header">
        <img src={assets.toplogo} alt="DocX" className="brand-logo" />
        <span className="brand-text">DocX.</span>
      </div>

      {/* Navigation */}
      <nav className="nav-menu">
        {menuStructure.map((category) => (
          <div key={category.id} className="nav-category">
            <button
              className="category-header"
              onClick={() => toggleCategory(category.id)}
            >
              <span className="category-title">{category.title}</span>
              {expandedCategories[category.id] ?
                <ChevronDown size={14} /> :
                <ChevronRight size={14} />
              }
            </button>

            {expandedCategories[category.id] && (
              <div className="category-items">
                {category.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `nav-item ${isActive ? 'nav-item-active' : ''}`
                    }
                  >
                    <item.icon size={18} className="nav-icon" />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="panel-footer">
        <Link to="/doctor" className="nav-item logout-item">
          <LogOut size={18} className="nav-icon" />
          <span>Logout</span>
        </Link>
      </div>
    </div>
  );
};

export default DoctorSidePanel;
