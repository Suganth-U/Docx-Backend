import React, { useState, useEffect } from "react";
import useAxiosPrivate from "@/shared/hooks/useAxiosPrivate";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  AreaChart, Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  RadialBarChart, RadialBar
} from 'recharts';
import {
  Search, Settings, ChevronRight, MoreHorizontal, Calendar, AlertTriangle, RefreshCw,
  Users, CalendarCheck, Stethoscope, DollarSign
} from 'lucide-react';
import { assets } from "@/shared/lib/assets";
import "@/admin/Dashboard/Dashboard.css";

// --- Helper Sub-Components remain the same ---

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
        {/* Simplified purely decorative chart line */}
        <LineChart width={100} height={50} data={data.chartData}>
          <Line type="monotone" dataKey="v" stroke={data.strokeColor} strokeWidth={3} dot={false} />
        </LineChart>
      </div>
    </div>
  </div>
);

// --- Main Dashboard Component ---

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const axiosPrivate = useAxiosPrivate();

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const { data } = await axiosPrivate.get("/admin/dashboard");
      setData(data);
    } catch (error) {
      console.error("Failed to fetch admin stats:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [axiosPrivate]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Dashboard Data...</div>;
  }

  // Safely fallback if data is missing
  const d = data || {};
  const c = d.counts || {};

  // Construct dynamic Top Stat Cards
  const statsData = [
    {
      title: "Patients",
      count: c.patients || 0,
      percentage: "Registered",
      isPositive: true,
      iconBg: "bg-gray-light",
      icon: <Users size={20} color="white" />,
      chartData: [{ v: 20 }, { v: 40 }, { v: 30 }, { v: 50 }],
      strokeColor: "#4ade80"
    },
    {
      title: "Appointments",
      count: c.appointments || 0,
      percentage: "Overview",
      isPositive: true,
      iconBg: "bg-blue-light",
      icon: <CalendarCheck size={20} color="white" />,
      chartData: [{ v: 60 }, { v: 50 }, { v: 60 }, { v: 40 }],
      strokeColor: "#fbbf24"
    },
    {
      title: "Doctors",
      count: c.doctors || 0,
      percentage: "Active",
      isPositive: true,
      iconBg: "bg-green-light",
      icon: <Stethoscope size={20} color="white" />,
      chartData: [{ v: 30 }, { v: 40 }, { v: 35 }, { v: 50 }],
      strokeColor: "#38bdf8"
    },
    {
      title: "Revenue",
      count: `Rs. ${(c.revenue || 0).toLocaleString()}`,
      percentage: "Total",
      isPositive: true,
      iconBg: "bg-orange-light",
      icon: <DollarSign size={20} color="white" />,
      chartData: [{ v: 40 }, { v: 30 }, { v: 50 }, { v: 40 }],
      strokeColor: "#818cf8"
    }
  ];

  // Map demographics
  const ageDemographicsData = d.demographics ? [
    { ageGroup: '0-18', count: d.demographics['0-18'] },
    { ageGroup: '19-35', count: d.demographics['19-35'] },
    { ageGroup: '36-50', count: d.demographics['36-50'] },
    { ageGroup: '51+', count: d.demographics['51+'] },
  ] : [];

  // Map Appointment Status
  const appointmentStatusData = d.appointmentStatus ? [
    { name: 'Completed', value: d.appointmentStatus.Completed, color: '#34d399' },
    { name: 'Pending', value: d.appointmentStatus.Pending, color: '#94a3b8' },
    { name: 'Cancelled', value: d.appointmentStatus.Cancelled, color: '#f87171' },
  ] : [];

  // Map Appointment Types (Physical vs Virtual)
  const appointmentTypesData = d.appointmentTypes ? [
    { name: 'Physical', value: d.appointmentTypes.PHYSICAL, color: '#38bdf8' },
    { name: 'Virtual', value: d.appointmentTypes.VIRTUAL, color: '#a78bfa' },
  ] : [];
  const typeTotal = appointmentTypesData.reduce((acc, curr) => acc + curr.value, 0);

  // Peak Hours Data
  const peakHoursData = d.peakHours || [];

  // E-Pharmacy Data
  const topMedicinesData = d.topMedicines || [];
  const lowStockMedicines = d.lowStockMedicines || [];

  // Revenue Growth
  const revenueData = d.revenueGrowth || [];

  // Top Departments
  const departmentData = d.topDepartments ? d.topDepartments.map((dept, i) => ({
    ...dept,
    color: ['#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa'][i % 5]
  })) : [];

  return (
    <div className="dashboard-container">

      {/* Welcome & Date */}
      <div className="welcome-section">
        <div>
          <h1>Admin Overview</h1>
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

      <div className="grid-split-2">
        {/* Peak Consultation Hours (Line Chart) */}
        <div className="card-panel">
          <div className="panel-header">
            <h3>Peak Consultation Hours</h3>
            <button className="btn-text">Today</button>
          </div>
          <div style={{ width: '100%', height: 260, marginTop: '20px' }}>
            <ResponsiveContainer>
              <LineChart data={peakHoursData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Area Chart */}
        <div className="card-panel">
          <div className="panel-header">
            <h3>Revenue Growth</h3>
            <button className="btn-text">This Year</button>
          </div>
          <div style={{ width: '100%', height: 260, marginTop: '20px' }}>
            <ResponsiveContainer>
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} width={55} tickFormatter={(val) => `Rs. ${val / 1000}k`} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="revenue" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-split-3">
        {/* Physical vs Virtual - Semi-Circle Gauge */}
        <div className="card-panel">
          <div className="panel-header">
            <h3>Consultation Types</h3>
          </div>
          <div className="donut-layout" style={{ marginTop: '10px', flexDirection: 'column' }}>
            <div className="donut-chart-wrapper" style={{ height: '160px' }}>
              <PieChart width={200} height={200}>
                <Pie
                  data={appointmentTypesData}
                  cx={100}
                  cy={150}
                  startAngle={180}
                  endAngle={0}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={4}
                >
                  {appointmentTypesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              </PieChart>
              <div className="donut-center" style={{ top: '80%' }}>
                <span className="donut-count">{typeTotal}</span>
                <span className="donut-label">Booked</span>
              </div>
            </div>
            <div className="donut-legend" style={{ flexDirection: 'row', justifyContent: 'center', gap: '20px', marginTop: '10px' }}>
              {appointmentTypesData.map((d, i) => (
                <div key={i} className="d-legend-item">
                  <span className="dot" style={{ backgroundColor: d.color }}></span> {d.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Appointment Status - Custom Track Bars */}
        <div className="card-panel">
          <div className="panel-header">
            <h3>Status Breakdown</h3>
          </div>
          <div style={{ width: '100%', height: 220, marginTop: '20px' }}>
            <ResponsiveContainer>
              <BarChart data={appointmentStatusData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={26} background={{ fill: '#f8fafc', radius: [6, 6, 0, 0] }}>
                  {appointmentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Age Demographics - Horizontal Tracking bars */}
        <div className="card-panel">
          <div className="panel-header">
            <h3>Age Demographics</h3>
          </div>
          <div style={{ width: '100%', height: 220, marginTop: '20px' }}>
            <ResponsiveContainer>
              <BarChart data={ageDemographicsData} layout="vertical" margin={{ top: 0, right: 20, left: -10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="ageGroup" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }} width={60} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="#94a3b8" radius={[0, 6, 6, 0]} barSize={16} background={{ fill: '#f1f5f9', radius: [0, 6, 6, 0] }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-split-2-meds">
        {/* Top Dispensed Medications - Themed Tracking bars */}
        <div className="card-panel">
          <div className="panel-header">
            <h3>Top Dispensed Meds</h3>
            <button className="btn-text">This Week</button>
          </div>
          <div style={{ width: '100%', height: 260, marginTop: '10px' }}>
            <ResponsiveContainer>
              <BarChart data={topMedicinesData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 500 }} width={90} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]} barSize={16} background={{ fill: '#ecfdf5', radius: [0, 6, 6, 0] }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Critical Low Stock */}
        <div className="card-panel">
          <div className="panel-header">
            <h3>Critical Low-Stock Alerts</h3>
            <span className="status-badge status-red" style={{ background: '#fee2e2', color: '#ef4444', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>{lowStockMedicines.length} Alerts</span>
          </div>
          <div className="table-container" style={{ marginTop: '10px', height: '260px', overflowY: 'auto' }}>
            <table className="custom-table" style={{ marginTop: '0' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                <tr>
                  <th>Medicine Name</th>
                  <th>Category</th>
                  <th>Stock Left</th>
                </tr>
              </thead>
              <tbody>
                {lowStockMedicines.length === 0 ? <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>No critical alerts.</td></tr> :
                  lowStockMedicines.map((med, i) => (
                    <tr key={i}>
                      <td className="font-medium">{med.name}</td>
                      <td className="text-gray">{med.category}</td>
                      <td>
                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{med.stock} units</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card-panel">
        <div className="panel-header">
          <h3>Specialty Demand & Utilization</h3>
          <button className="btn-text">Overview</button>
        </div>
        <div style={{ width: '100%', height: 340, marginTop: '0px' }}>
          <ResponsiveContainer>
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={departmentData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <PolarAngleAxis dataKey="name" tick={{ fill: '#4b5563', fontSize: 13, fontWeight: 600 }} />
              <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={false} axisLine={false} />
              <Radar name="Demand" dataKey="value" stroke="#38bdf8" strokeWidth={3} fill="#38bdf8" fillOpacity={0.4} dot={{ r: 4, fill: '#38bdf8' }} />
              <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;