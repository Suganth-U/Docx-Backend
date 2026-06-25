import React, { useEffect, useMemo, useState } from "react";
import useAxiosPrivate from "@/shared/hooks/useAxiosPrivate";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/shared/context/ToastContext";
import { safeToLocaleDateString } from "@/shared/lib/intlDate";
import { 
  Video, 
  Search, 
  RefreshCw, 
  Link as LinkIcon, 
  ExternalLink,
  Calendar,
  Clock,
  User,
  Activity,
  Filter,
  ArrowUpDown
} from "lucide-react";
import "./OnlineConsultation.css";

const formatDateLabel = (value = "") => {
  if (!value) return "Pending";
  return safeToLocaleDateString(value, "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }, "Pending");
};

const formatTimeLabel = (value = "") => {
  if (!value || !value.includes(":")) return value || "Pending";
  const [hourString = "0", minuteString = "00"] = value.split(":");
  const date = new Date();
  date.setHours(Number(hourString), Number(minuteString), 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const statusConfig = {
  requested: { label: "Requested", background: "rgba(251, 191, 36, 0.16)", color: "#b56b00" },
  approved: { label: "Approved", background: "rgba(59, 130, 246, 0.14)", color: "#2563eb" },
  scheduled: { label: "Scheduled", background: "rgba(16, 185, 129, 0.14)", color: "#0f9f67" },
  meeting_pending: { label: "Meeting pending", background: "rgba(124, 58, 237, 0.14)", color: "#7c3aed" },
  rejected: { label: "Rejected", background: "rgba(239, 68, 68, 0.14)", color: "#dc2626" },
  completed: { label: "Completed", background: "rgba(16, 185, 129, 0.14)", color: "#0f9f67" },
  cancelled: { label: "Cancelled", background: "rgba(239, 68, 68, 0.14)", color: "#dc2626" },
  expired: { label: "Hold expired", background: "rgba(100, 116, 139, 0.14)", color: "#475569" },
};

const statusFilters = ["all", "requested", "approved", "meeting_pending", "scheduled", "expired"];

const OnlineConsultation = () => {
  const axiosPrivate = useAxiosPrivate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [linkDrafts, setLinkDrafts] = useState({});
  const [savingId, setSavingId] = useState("");

  const loadConsultations = async () => {
    try {
      setLoading(true);
      const { data } = await axiosPrivate.get("/consultations");
      setConsultations(data);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "We could not load online consultation management."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConsultations();
  }, []);

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
  }, [searchParams]);

  const filteredConsultations = useMemo(() => {
    let result = consultations.filter((consultation) => {
      if (filter !== "all" && consultation.status !== filter) {
        return false;
      }
      if (!search.trim()) {
        return true;
      }
      const haystack = [
        consultation.consultationNumber,
        consultation.patient.name,
        consultation.doctor.name,
        consultation.doctor.specialty,
      ].join(" ").toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });

    result.sort((a, b) => {
      if (sortBy === "status") {
        return a.status.localeCompare(b.status);
      }
      
      const dateA = a.approvedDate ? new Date(a.approvedDate) : new Date(a.requestedDate);
      const dateB = b.approvedDate ? new Date(b.approvedDate) : new Date(b.requestedDate);
      
      if (sortBy === "date-desc") {
        return dateB - dateA;
      }
      return dateA - dateB;
    });

    return result;
  }, [consultations, filter, search, sortBy]);

  const handleSaveLink = async (consultation) => {
    const meetingLink = (linkDrafts[consultation.id] || consultation.meeting?.manualLink || consultation.zoom?.joinUrl || "").trim();

    if (!meetingLink) {
      toast.warning("Enter a meeting link before saving.");
      return;
    }

    setSavingId(consultation.id);

    try {
      await axiosPrivate.put(`/consultations/${consultation.id}/link`, {
        meetingLink,
        meetingPlatform: "other",
        meetingProvider: "manual",
      });
      toast.success("Meeting link updated.");
      loadConsultations();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "We could not update the meeting link."
      );
    } finally {
      setSavingId("");
    }
  };

  // Stats calculation
  const totalConsultations = consultations.length;
  const scheduledCount = consultations.filter(c => c.status === "scheduled").length;
  const pendingMeetingCount = consultations.filter(c => c.status === "meeting_pending").length;

  return (
    <div className="consultation-container premium-user-page">
      {/* Page Header */}
      <div className="premium-header-block" style={{ marginBottom: "24px" }}>
        <div className="title-area">
          <div className="title-icon-wrapper bg-purple-solid">
            <Video size={28} className="txt-white" />
          </div>
          <div>
            <h2 className="page-title">Online Consultations</h2>
            <p className="page-subtitle">Track virtual sessions, approve appointments, and manage meeting links.</p>
          </div>
        </div>
        <button className="add-premium-btn" onClick={loadConsultations}>
          <RefreshCw size={18} /> Refresh Data
        </button>
      </div>

      {/* Stats Row */}
      <div className="consultation-stats-row">
        <div className="consultation-stat-card">
          <div className="consultation-stat-icon" style={{ background: '#ede9fe' }}>
            <Activity size={20} color="#683B93" />
          </div>
          <div>
            <h3>{totalConsultations}</h3>
            <p>Total Consultations</p>
          </div>
        </div>
        <div className="consultation-stat-card">
          <div className="consultation-stat-icon" style={{ background: '#dcfce7' }}>
            <Calendar size={20} color="#059669" />
          </div>
          <div>
            <h3>{scheduledCount}</h3>
            <p>Scheduled Sessions</p>
          </div>
        </div>
        <div className="consultation-stat-card" style={{ borderLeft: pendingMeetingCount > 0 ? "4px solid #f59e0b" : "" }}>
          <div className="consultation-stat-icon" style={{ background: '#fef3c7' }}>
            <LinkIcon size={20} color="#d97706" />
          </div>
          <div>
            <h3>{pendingMeetingCount}</h3>
            <p>Pending Links</p>
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
              placeholder="Search by patient, doctor, specialty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="filter-dropdowns">
            <div className="dropdown-container">
              <Filter size={16} />
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                {statusFilters.map((statusItem) => (
                  <option key={statusItem} value={statusItem}>
                    {statusItem === "all" ? "All Statuses" : statusItem.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="dropdown-container">
              <ArrowUpDown size={16} />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>
        </div>

        {/* Consultation List */}
        {loading ? (
          <div className="empty-state">Loading consultations...</div>
        ) : filteredConsultations.length === 0 ? (
          <div className="empty-state">No consultations match the current filters.</div>
        ) : (
          <div className="consultation-list-grid">
            {filteredConsultations.map((consultation) => {
              const status = statusConfig[consultation.status] || statusConfig.requested;
              const needsManualLink =
                consultation.status === "meeting_pending" ||
                (consultation.paymentStatus === "paid" && !consultation.meeting?.roomReady);

              return (
                <div key={consultation.id} className="consultation-item-card">
                  <div className="consultation-top-row">
                    <div>
                      <h2>{consultation.consultationNumber || "DocX Virtual Consultation"}</h2>
                      <p>
                        <User size={14} /> {consultation.patient.name} with Dr. {consultation.doctor.name}
                      </p>
                    </div>
                    <span 
                      className="status-pill" 
                      style={{ background: status.background, color: status.color }}
                    >
                      {status.label}
                    </span>
                  </div>

                  {/* Concise Information */}
                  <div className="concise-info-row">
                    <div className="info-segment">
                      <Calendar size={15} /> 
                      <strong>Date:</strong> {consultation.approvedDate ? formatDateLabel(consultation.approvedDate) : formatDateLabel(consultation.requestedDate)}
                    </div>
                    <div className="info-segment">
                      <Clock size={15} />
                      <strong>Time:</strong> {consultation.approvedTimeSlot ? formatTimeLabel(consultation.approvedTimeSlot) : formatTimeLabel(consultation.requestedTimeSlot)}
                    </div>
                    <div className="info-segment">
                      <Activity size={15} />
                      <strong>Payment:</strong> {consultation.paymentStatus || "Pending"}
                    </div>
                  </div>

                  {/* Action Notices & Links */}
                  {consultation.meeting?.roomReady && consultation.status === "scheduled" && (
                    <div className="action-notice green">
                      {consultation.meeting?.manualLink ? (
                        <a href={consultation.meeting.manualLink} target="_blank" rel="noreferrer" className="meeting-link">
                          <ExternalLink size={14} /> Open Meeting Link
                        </a>
                      ) : (
                        <span>Secure Jitsi room ready. Join link active during appointment window.</span>
                      )}
                    </div>
                  )}

                  {needsManualLink && (
                    <>
                      <div className="action-notice purple">
                        Backup meeting link needed. Payment complete.
                      </div>
                      <div className="link-editor-inline">
                        <input
                          type="text"
                          placeholder="Paste the backup meeting link here..."
                          value={linkDrafts[consultation.id] || consultation.meeting?.manualLink || consultation.zoom?.joinUrl || ""}
                          onChange={(e) =>
                            setLinkDrafts((current) => ({
                              ...current,
                              [consultation.id]: e.target.value,
                            }))
                          }
                        />
                        <button
                          className="btn-primary"
                          onClick={() => handleSaveLink(consultation)}
                          disabled={savingId === consultation.id}
                        >
                          <LinkIcon size={16} />
                          {savingId === consultation.id ? "Saving..." : "Save Link"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OnlineConsultation;
