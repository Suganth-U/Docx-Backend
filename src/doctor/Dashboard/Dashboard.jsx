import React, { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Calendar, Clock, Users, DollarSign, FileText, Stethoscope,
  Activity, UserPlus, Settings, RefreshCw, CalendarCheck
} from 'lucide-react';
import api from "@/shared/lib/api";
import "@/doctor/Dashboard/Dashboard.css";

// --- Sub-Components ---

const StatCard = ({ data }) => (
  <div className="stat-card">
    <div className="stat-header">
      <div className={`stat-icon-circle ${data.iconBg}`} style={{ backgroundColor: data.strokeColor }}>
        {data.icon || <Settings size={20} color="white" />}
      </div>
      <div className={`stat-badge ${data.isPositive ? 'badge-green' : 'badge-red'}`}>
        {data.percentage}
      </div>
    </div>
    <div className="stat-body">
      <div className="stat-info">
        <h3>{data.count}</h3>
        <p>{data.title}</p>
      </div>
      <div className="stat-chart">
          <LineChart width={100} height={50} data={data.chartData}>
            <Line type="monotone" dataKey="v" stroke={data.strokeColor} strokeWidth={3} dot={false} />
          </LineChart>
      </div>
    </div>
  </div>
);

const AppointmentItem = ({ apt }) => (
  <div className="request-item">
    <div className="req-avatar">
      <img src={`https://ui-avatars.com/api/?name=${apt.name}&background=random`} alt="avt" />
    </div>
    <div className="req-info">
      <h4>{apt.name}</h4>
      <p><Clock size={12} /> {apt.time}</p>
    </div>
    <div className={`req-dept dept-${apt.status.toLowerCase()}`}>
      {apt.type}
    </div>
    <div className={`status-indicator ${apt.status.toLowerCase()}`}>
      {apt.status}
    </div>
  </div>
);

// --- Main Dashboard Component ---

const DoctorDashboard = () => {
  const [doctorName, setDoctorName] = useState("Doctor");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statsData, setStatsData] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      // Fetch Doctor Profile
      const { data: userData } = await api.get('/auth/me');
      setDoctorName(userData.name || "Doctor");

      // Fetch Stats
      const { data: d } = await api.get('/doctor/stats');
      setDashboardData(d);

      // Map Top Stat Cards Data
      setStatsData([
        {
          title: "Total Patients",
          count: d.totalPatients || 0,
          percentage: "Unique",
          isPositive: true,
          iconBg: "bg-blue-light",
          icon: <Users size={20} color="white" />,
          chartData: [{ v: 20 }, { v: 40 }, { v: 30 }, { v: 50 }],
          strokeColor: "#3b82f6"
        },
        {
          title: "Today's Appointments",
          count: d.todaysAppointmentsCount || 0,
          percentage: "Scheduled",
          isPositive: true,
          iconBg: "bg-orange-light",
          icon: <CalendarCheck size={20} color="white" />,
          chartData: [{ v: 60 }, { v: 50 }, { v: 60 }, { v: 40 }],
          strokeColor: "#f97316"
        },
        {
          title: "Total Consultations",
          count: d.totalConsultations || 0,
          percentage: "All Time",
          isPositive: true,
          iconBg: "bg-purple-light",
          icon: <Activity size={20} color="white" />,
          chartData: [{ v: 30 }, { v: 40 }, { v: 35 }, { v: 50 }],
          strokeColor: "#a855f7"
        },
        {
          title: "Total Revenue",
          count: `Rs. ${d.totalRevenue || 0}`,
          percentage: "Estimated",
          isPositive: true,
          iconBg: "bg-pink-light",
          icon: <DollarSign size={20} color="white" />,
          chartData: [{ v: 40 }, { v: 30 }, { v: 50 }, { v: 40 }],
          strokeColor: "#ec4899"
        }
      ]);

    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Dashboard Data...</div>;
  }

  const d = dashboardData || {};

  const quickActions = [
    { icon: Users, label: "My Patients", bgClass: "icon-card-blue" },
    { icon: Calendar, label: "Appointments", bgClass: "icon-card-green" },
    { icon: FileText, label: "Prescriptions", bgClass: "icon-card-yellow" },
    { icon: Stethoscope, label: "Profile", bgClass: "icon-card-cyan" },
  ];

  const totalApptsWeek = (d.weeklyAppointments || []).reduce((sum, item) => sum + item.appointments, 0);

  return (
    <div className="dashboard-container">

      {/* Welcome & Date */}
      <div className="welcome-section">
        <div>
          <h1>Welcome, {doctorName}</h1>
          <p>You have {d.todaysAppointmentsCount || 0} appointments today.</p>
        </div>
        <div className="date-picker-mock" style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={fetchDashboardData}>
          <RefreshCw size={16} className={refreshing ? 'spin-icon' : ''} /> {refreshing ? 'Refreshing...' : 'Refresh'}
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="stats-grid">
        {statsData.map((stat, index) => (
          <StatCard key={index} data={stat} />
        ))}
      </div>

      {/* Middle Section: Today's Appointments & Weekly Chart */}
      <div className="grid-split-2">
        {/* Left: Upcoming Sessions for Today */}
        <div className="card-panel">
          <div className="panel-header">
            <h3>Upcoming Sessions</h3>
            <button className="btn-outline">View All</button>
          </div>
          <div className="request-list">
            {(d.upcomingSessions || []).length > 0 ? (d.upcomingSessions || []).map((apt, i) => (
              <AppointmentItem key={i} apt={{ name: apt.patient, time: `${apt.date} • ${apt.time}`, type: apt.type, status: 'Active' }} />
            )) : <p style={{ padding: '20px', color: '#888' }}>No upcoming sessions</p>}
          </div>
        </div>

        {/* Right: Weekly Appointments Chart */}
        <div className="card-panel">
          <div className="panel-header">
            <h3>Weekly Appointments</h3>
            <button className="btn-text">View All</button>
          </div>
          <div className="chart-legend-custom">
            <span>Total Appointments This Week: <strong>{totalApptsWeek}</strong></span>
          </div>
          <div style={{ width: '100%', height: 280, marginTop: '10px' }}>
            <ResponsiveContainer>
              <AreaChart data={d.weeklyAppointments || []}>
                <defs>
                  <linearGradient id="colorAppts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} cursor={{ fill: 'transparent' }} />
                <Area type="monotone" dataKey="appointments" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAppts)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="quick-actions-grid">
        {quickActions.map((action, i) => (
          <div key={i} className={`icon-card ${action.bgClass}`}>
            <div className="icon-wrapper">
              <action.icon size={32} />
            </div>
            <p>{action.label}</p>
          </div>
        ))}
      </div>

      {/* Middle Grid: Recent Patients, Gender Chart */}
      <div className="grid-split-2">
        {/* Recent Patients */}
        <div className="card-panel">
          <div className="panel-header">
            <h3>Recent Patients</h3>
            <button className="btn-text">View All</button>
          </div>
          <div className="reports-list">
            {(d.recentPatients || []).length > 0 ? (d.recentPatients || []).map((patient, i) => (
              <div key={i} className="report-item">
                <div className="report-icon blue">
                  <UserPlus size={16} />
                </div>
                <div className="report-info">
                  <h5>{patient.name}</h5>
                  <p>{patient.diagnosis} • {patient.lastVisit}</p>
                </div>
                <span className={`mini-badge ${patient.status.toLowerCase()}`}>
                  {patient.status}
                </span>
              </div>
            )) : <p style={{ padding: '20px', color: '#888' }}>No recent patients</p>}
          </div>
        </div>

        {/* Patient Gender Distribution */}
        <div className="card-panel">
          <div className="panel-header">
            <h3>Patient Demographics</h3>
            <button className="btn-text">Details</button>
          </div>
          <div className="donut-simple-layout">
            <div className="donut-chart-wrapper">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={d.patientGenderData || []}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#ec4899" />
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} cursor={{ fill: 'transparent' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <span className="donut-label">Total Valid</span>
                <span className="donut-count">{d.totalPatients}</span>
              </div>
            </div>
            <div className="gender-stats">
              {(d.patientGenderData || []).map((genderItem, i) => (
                <div className="gender-stat" key={i}>
                  <div className={`gender-icon ${genderItem.name.toLowerCase()}`}><Users size={20} /></div>
                  <div>
                    <p className="gender-label">{genderItem.name}</p>
                    <p className="gender-pct">{genderItem.percentage}%</p>
                    <p className="gender-change">{genderItem.value} patients</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lower Section: Revenue & Prescriptions */}
      <div className="grid-split-2">
        {/* Monthly Revenue */}
        <div className="card-panel">
          <div className="panel-header">
            <h3>Monthly Revenue</h3>
            <button className="btn-text">This Year</button>
          </div>
          <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
            <ResponsiveContainer>
              <BarChart data={d.monthlyRevenue || []} margin={{ top: 10, right: 0, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(val) => `Rs ${val / 1000}k`} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} cursor={{ fill: 'transparent' }} formatter={(val) => `Rs. ${val.toLocaleString()}`} />
                <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Prescriptions */}
        <div className="card-panel">
          <div className="panel-header">
            <h3>Recent Prescriptions</h3>
            <button className="btn-text">View All</button>
          </div>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Rx ID</th>
                  <th>Patient</th>
                  <th>Medication</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {(d.recentPrescriptions || []).length > 0 ? (d.recentPrescriptions || []).map((rx, i) => (
                  <tr key={i}>
                    <td className="text-gray">{rx.id}</td>
                    <td className="font-medium">{rx.patient}</td>
                    <td className="text-gray">{rx.medication}</td>
                    <td className="text-gray">{rx.date}</td>
                  </tr>
                )) : <tr><td colSpan="4" style={{ textAlign: "center", padding: "20px", color: "#888" }}>No recent prescriptions.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Appointments */}
      <div className="card-panel">
        <div className="panel-header">
          <h3>Recent Appointments</h3>
          <button className="btn-text">View All</button>
        </div>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Apt ID</th>
                <th>Patient Name</th>
                <th>Type</th>
                <th>Date & Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(d.recentAppointments || []).length > 0 ? (
                (d.recentAppointments || []).map((apt, i) => (
                  <tr key={i}>
                    <td className="text-gray">{apt.id}</td>
                    <td>
                      <div className="user-cell">
                        <img src={`https://ui-avatars.com/api/?name=${apt.name}&background=random`} alt="u" />
                        {apt.name}
                      </div>
                    </td>
                    <td className="text-gray">{apt.type}</td>
                    <td className="text-gray">{apt.date}</td>
                    <td>
                      <span className={`status-badge ${apt.status === 'Completed' || apt.status === 'Active' ? 'status-green' : 'status-purple'}`}>
                        {apt.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "20px", color: "#888" }}>
                    No recent appointments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default DoctorDashboard;