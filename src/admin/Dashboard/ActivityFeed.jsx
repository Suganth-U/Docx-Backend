import React from 'react';
import "@/admin/Dashboard/Dashboard.css";

const ActivityFeed = ({ activities }) => {
  return (
    <div className="activity-feed-card">
      <div className="card-header">
        <h3>Activity</h3>
        <div className="filter-dropdown">
          <span>All</span>
          <svg viewBox="0 0 24 24" fill="currentColor" className="dropdown-icon">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </div>
      </div>
      <ul className="activity-list">
        {activities.map((activity) => (
          <li key={activity.id} className="activity-item">
            <div className="icon-container">
              {activity.icon}
            </div>
            <div className="activity-details">
              <p className="activity-text">{activity.text}</p>
              <p className="activity-time">{activity.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ActivityFeed;