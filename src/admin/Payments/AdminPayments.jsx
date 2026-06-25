import React, { useState, useMemo } from "react";
import { 
  CreditCard, 
  Search, 
  Filter, 
  ArrowUpDown, 
  DollarSign, 
  TrendingUp, 
  Download 
} from "lucide-react";
import "./AdminPayments.css";

// Realistic Mock Data for Viva Presentation
const mockPayments = [
  { id: "PAY-10042", patientName: "Sarah Connor", doctorName: "Dr. Krishnaraj", amount: 150, date: "2026-06-21T10:30:00", status: "paid", method: "Credit Card" },
  { id: "PAY-10043", patientName: "John Doe", doctorName: "Dr. Sarah Smith", amount: 200, date: "2026-06-20T14:15:00", status: "paid", method: "Demo" },
  { id: "PAY-10044", patientName: "Jane Doe", doctorName: "Dr. Sarah Smith", amount: 200, date: "2026-06-20T15:15:00", status: "failed", method: "Stripe" },
  { id: "PAY-10045", patientName: "Alice Doe", doctorName: "Dr. Sarah Smith", amount: 200, date: "2026-06-21T09:15:00", status: "refunded", method: "Stripe" },
  { id: "PAY-10046", patientName: "Bob Doe", doctorName: "Dr. James Wilson", amount: 250, date: "2026-06-21T11:15:00", status: "paid", method: "Stripe" },
  { id: "PAY-10047", patientName: "Emily Davis", doctorName: "Dr. Emily Davis", amount: 300, date: "2026-06-22T08:15:00", status: "pending", method: "Demo" },
  { id: "PAY-10048", patientName: "Sophia Martinez", doctorName: "Dr. Krishnaraj", amount: 150, date: "2026-06-16T10:10:00", status: "paid", method: "Stripe" },
];

const AdminPayments = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");

  // Stats calculation
  const totalRevenue = mockPayments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = mockPayments.filter(p => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);
  const platformFees = totalRevenue * 0.15; // Assuming 15% platform fee

  const filteredPayments = useMemo(() => {
    let result = mockPayments.filter((payment) => {
      if (filter !== "all" && payment.status !== filter) {
        return false;
      }
      if (!search.trim()) {
        return true;
      }
      const haystack = [
        payment.id,
        payment.patientName,
        payment.doctorName,
        payment.method,
      ].join(" ").toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });

    result.sort((a, b) => {
      if (sortBy === "amount-desc") return b.amount - a.amount;
      if (sortBy === "amount-asc") return a.amount - b.amount;
      
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      if (sortBy === "date-desc") return dateB - dateA;
      return dateA - dateB;
    });

    return result;
  }, [filter, search, sortBy]);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div className="payments-container premium-user-page">
      {/* Page Header */}
      <div className="premium-header-block" style={{ marginBottom: "24px" }}>
        <div className="title-area">
          <div className="title-icon-wrapper bg-purple-solid">
            <CreditCard size={28} className="txt-white" />
          </div>
          <div>
            <h2 className="page-title">Payments & Revenue</h2>
            <p className="page-subtitle">Track incoming payments, manage refunds, and view platform financial health.</p>
          </div>
        </div>
        <button className="add-premium-btn" onClick={() => alert("Report downloaded successfully!")}>
          <Download size={18} /> Export Report
        </button>
      </div>

      {/* Stats Row */}
      <div className="payments-stats-row">
        <div className="payments-stat-card">
          <div className="payments-stat-icon" style={{ background: '#dcfce7' }}>
            <TrendingUp size={20} color="#059669" />
          </div>
          <div>
            <h3>${totalRevenue.toFixed(2)}</h3>
            <p>Total Revenue (Paid)</p>
          </div>
        </div>
        <div className="payments-stat-card">
          <div className="payments-stat-icon" style={{ background: '#ede9fe' }}>
            <DollarSign size={20} color="#683B93" />
          </div>
          <div>
            <h3>${platformFees.toFixed(2)}</h3>
            <p>Platform Fees Earned (15%)</p>
          </div>
        </div>
        <div className="payments-stat-card" style={{ borderLeft: pendingAmount > 0 ? "4px solid #f59e0b" : "" }}>
          <div className="payments-stat-icon" style={{ background: '#fef3c7' }}>
            <CreditCard size={20} color="#d97706" />
          </div>
          <div>
            <h3>${pendingAmount.toFixed(2)}</h3>
            <p>Pending / Unsettled</p>
          </div>
        </div>
      </div>

      <div className="admin-card">
        {/* Filters and Search */}
        <div className="filter-bar">
          <label className="search-box-wrapper">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by patient, doctor, or payment ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          
          <div className="filter-dropdowns">
            <div className="dropdown-container">
              <Filter size={16} />
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div className="dropdown-container">
              <ArrowUpDown size={16} />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Amount (High to Low)</option>
                <option value="amount-asc">Amount (Low to High)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="premium-table-container">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Transaction Details</th>
                <th>Provider</th>
                <th>Date & Time</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <div className="patient-info">
                        <span className="patient-name">{payment.patientName}</span>
                        <span className="payment-id">{payment.id}</span>
                      </div>
                    </td>
                    <td>{payment.doctorName}</td>
                    <td>{formatDate(payment.date)}</td>
                    <td>{payment.method}</td>
                    <td className="amount-text">${payment.amount.toFixed(2)}</td>
                    <td>
                      <span className={`payment-status-badge ${payment.status}`}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "#6d6283" }}>
                    No transactions match your search filters.
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

export default AdminPayments;
