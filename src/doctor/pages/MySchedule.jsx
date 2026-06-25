import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { 
  FaClock, FaHospital, FaPlus, FaTrash, 
  FaVideo, FaChevronLeft, FaChevronRight, FaTimesCircle 
} from "react-icons/fa";
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, 
  isBefore, startOfDay 
} from "date-fns";
import api from "@/shared/lib/api";
import { useToast } from "@/shared/context/ToastContext";
import FieldError from "@/shared/components/common/FieldError";
import { clearFieldError, validateRequiredFields } from "@/shared/lib/formValidation";
import { useNavigate } from "react-router-dom";
import { sriLankanHospitals } from "@/shared/data/hospitals";

import "./MySchedule.css"; // We'll create this for specific complex grid styles

// --- Styled Components ---

const Page = styled.div`
  min-height: 100vh;
  padding: 30px;
  background: #f7f7fb;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 28px;

  h1 {
    margin: 0 0 6px;
    color: #281a43;
    font-size: 2rem;
  }

  p {
    margin: 0;
    color: #6d6283;
    line-height: 1.65;
  }
`;

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Panel = styled.div`
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.03);
  border: 1px solid rgba(104, 59, 147, 0.08);
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  h2 {
    font-size: 1.15rem;
    margin: 0;
    color: #281a43;
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;

const AddButton = styled.button`
  background: #f4edff;
  color: #683b93;
  border: none;
  padding: 6px 12px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;

  &:hover {
    background: #e9d5ff;
  }
`;

const RuleCard = styled.div`
  padding: 16px;
  border-radius: 12px;
  background: ${props => props.$isVirtual ? '#f0fdf4' : '#f8fafc'};
  border: 1px solid ${props => props.$isVirtual ? '#bbf7d0' : '#e2e8f0'};
  margin-bottom: 12px;
  position: relative;
`;

const DeleteBtn = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;

  &:hover {
    background: #fee2e2;
  }
`;

const RuleTitle = styled.div`
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
  font-size: 0.95rem;
`;

const RuleDetail = styled.div`
  font-size: 0.85rem;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
`;

/* Modals */
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(18, 8, 30, 0.48);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
`;

const ModalCard = styled.div`
  width: min(500px, 100%);
  padding: 28px;
  border-radius: 24px;
  background: #ffffff;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;

  label {
    color: #281a43;
    font-size: 0.9rem;
    font-weight: 700;
  }

  input, select, textarea {
    width: 100%;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid #e4ddef;
    outline: none;
    font-family: inherit;

    &:focus {
      border-color: #683b93;
    }
  }
`;

const BtnGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
`;

const Button = styled.button`
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  border: ${props => props.$primary ? 'none' : '1px solid #cbd5e1'};
  background: ${props => props.$primary ? 'linear-gradient(135deg, #683b93 0%, #8d63c6 100%)' : 'white'};
  color: ${props => props.$primary ? 'white' : '#475569'};
`;

const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const MySchedule = () => {
  const toast = useToast();
  
  // Data States
  const [physicalSchedules, setPhysicalSchedules] = useState([]);
  const [virtualSchedules, setVirtualSchedules] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [physicalAppointments, setPhysicalAppointments] = useState([]);
  const [virtualAppointments, setVirtualAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Calendar States
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Modal States
  const [modalType, setModalType] = useState(null); // 'physical', 'virtual', 'leave'
  const [selectedDate, setSelectedDate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  
  // Forms
  const [scheduleForm, setScheduleForm] = useState({
    hospitalName: "",
    dayOfWeek: "Monday",
    startTime: "09:00",
    endTime: "12:00",
    slotDuration: "15",
  });
  
  const [leaveForm, setLeaveForm] = useState({
    reason: ""
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [physRes, virtRes, leaveRes, apptRes, consultRes] = await Promise.all([
        api.get("/doctor/schedules/mine"),
        api.get("/consultations/schedules/mine"),
        api.get("/doctor/leaves"),
        api.get("/doctor/appointments"),
        api.get("/consultations")
      ]);
      setPhysicalSchedules(physRes.data || []);
      setVirtualSchedules(virtRes.data || []);
      setLeaves(leaveRes.data || []);
      setPhysicalAppointments(apptRes.data?.appointments || []);
      setVirtualAppointments(consultRes.data || []);
    } catch {
      toast.error("Failed to load schedules and availability");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Calendar Logic ---
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => {
    return (
      <div className="calendar-header">
        <button onClick={prevMonth}><FaChevronLeft /></button>
        <h2>{format(currentMonth, "MMMM yyyy")}</h2>
        <button onClick={nextMonth}><FaChevronRight /></button>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentMonth, { weekStartsOn: 1 });
    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="calendar-day-name" key={i}>
          {format(addDays(startDate, i), "EEE")}
        </div>
      );
    }
    return <div className="calendar-days-row">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    const today = startOfDay(new Date());

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const dateKey = format(day, "yyyy-MM-dd");
        const dayName = format(day, "EEEE");
        const cloneDay = day;

        const isLeave = leaves.find(l => l.dateKey === dateKey);
        
        // Find if this day has recurring rules
        const physRules = physicalSchedules.filter(s => s.dayOfWeek === dayName);
        const virtRules = virtualSchedules.filter(s => s.dayOfWeek === dayName);

        // Find actual bookings for this date
        const dayPhysAppts = physicalAppointments.filter(a => a.dateKey === dateKey && a.status !== 'cancelled');
        const dayVirtAppts = virtualAppointments.filter(a => a.approvedDateKey === dateKey && !['expired', 'cancelled', 'rejected'].includes(a.status));
        const totalBookings = dayPhysAppts.length + dayVirtAppts.length;

        const isPast = isBefore(day, today);

        days.push(
          <div
            className={`calendar-cell ${!isSameMonth(day, monthStart) ? "disabled" : ""} ${isSameDay(day, new Date()) ? "today" : ""} ${isPast ? "past" : ""}`}
            key={day}
            onClick={() => {
              if (isSameMonth(day, monthStart)) {
                setSelectedDate(cloneDay);
                setModalType('day_actions');
              }
            }}
          >
            <span className="number">{formattedDate}</span>
            <div className="cell-content">
              {isLeave && (
                <div className="badge badge-leave">Off</div>
              )}
              {totalBookings > 0 && !isLeave && (
                <div className="badge" style={{background:'#e0e7ff', color:'#4f46e5'}}>{totalBookings} Bookings</div>
              )}
              {!isLeave && totalBookings === 0 && physRules.length > 0 && (
                <div className="badge badge-phys">{physRules.length} Clinic</div>
              )}
              {!isLeave && totalBookings === 0 && virtRules.length > 0 && (
                <div className="badge badge-virt">{virtRules.length} Virtual</div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="calendar-row" key={day}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="calendar-body">{rows}</div>;
  };

  // --- Handlers ---
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validateRequiredFields(scheduleForm, {
      ...(modalType === "physical" ? { hospitalName: "Hospital/Clinic" } : {}),
      dayOfWeek: "Day of week",
      startTime: "Start time",
      endTime: "End time",
      slotDuration: "Slot duration",
    });

    if (scheduleForm.startTime && scheduleForm.endTime && scheduleForm.startTime >= scheduleForm.endTime) {
      nextErrors.endTime = "End time must be after start time.";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    setSaving(true);
    try {
      if (modalType === 'physical') {
        await api.post("/doctor/schedules", {
          ...scheduleForm,
          slotDuration: Number(scheduleForm.slotDuration),
        });
        toast.success("Physical schedule added");
      } else if (modalType === 'virtual') {
        await api.post("/consultations/schedules", {
          ...scheduleForm,
          slotDuration: 20, // Virtual usually fixed
        });
        toast.success("Virtual schedule added");
      }
      setModalType(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add schedule");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkLeave = async () => {
    setSaving(true);
    try {
      const dateKey = format(selectedDate, "yyyy-MM-dd");
      await api.post("/doctor/leaves", {
        dateKey,
        reason: leaveForm.reason
      });
      toast.success("Day marked as unavailable");
      setModalType(null);
      setLeaveForm({ reason: "" });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark day off");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAppointment = async (id, type) => {
    const reason = window.prompt("Reason for cancellation?");
    if (reason === null) return;
    
    try {
      if (type === 'physical') {
        await api.put(`/doctor/appointments/${id}`, { status: 'cancelled', cancellationReason: reason || 'Other' });
      } else {
        await api.put(`/consultations/${id}/status`, { status: 'rejected', reason: reason || 'Other' });
      }
      toast.success("Appointment cancelled successfully");
      loadData();
    } catch {
      toast.error("Failed to cancel appointment");
    }
  };

  const handleRemoveLeave = async (leaveId) => {
    try {
      await api.delete(`/doctor/leaves/${leaveId}`);
      toast.success("Availability restored for this date");
      setModalType(null);
      loadData();
    } catch {
      toast.error("Failed to restore availability");
    }
  };

  const handleDeleteSchedule = async (id, type) => {
    if (!window.confirm("Remove this recurring rule?")) return;
    try {
      if (type === 'physical') {
        await api.delete(`/doctor/schedules/${id}`);
      } else {
        await api.delete(`/consultations/schedules/${id}`);
      }
      toast.success("Schedule rule removed");
      loadData();
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  return (
    <Page>
      <Header>
        <div>
          <h1>Master Schedule & Availability</h1>
          <p>Control your recurring physical/virtual hours and mark specific dates off.</p>
        </div>
      </Header>

      {loading ? (
        <p>Loading schedule workspace...</p>
      ) : (
        <DashboardGrid>
          <Sidebar>
            {/* Physical Rules Panel */}
            <Panel>
              <PanelHeader>
                <h2><FaHospital color="#683b93" /> Physical Hours</h2>
                <AddButton onClick={() => {
                  setScheduleForm({ ...scheduleForm, hospitalName: "" });
                  setModalType('physical');
                }}><FaPlus/> Add</AddButton>
              </PanelHeader>
              {physicalSchedules.length === 0 ? (
                <p style={{fontSize:'0.9rem', color:'#64748b'}}>No physical hours set.</p>
              ) : (
                physicalSchedules.map(s => (
                  <RuleCard key={s._id}>
                    <DeleteBtn onClick={() => handleDeleteSchedule(s._id, 'physical')}><FaTrash size={12}/></DeleteBtn>
                    <RuleTitle>{s.dayOfWeek}</RuleTitle>
                    <RuleDetail><FaClock/> {s.startTime} - {s.endTime}</RuleDetail>
                    <RuleDetail><FaHospital/> {s.hospital?.name || "Clinic"}</RuleDetail>
                  </RuleCard>
                ))
              )}
            </Panel>

            {/* Virtual Rules Panel */}
            <Panel>
              <PanelHeader>
                <h2><FaVideo color="#10b981" /> Virtual Hours</h2>
                <AddButton onClick={() => setModalType('virtual')}><FaPlus/> Add</AddButton>
              </PanelHeader>
              {virtualSchedules.length === 0 ? (
                <p style={{fontSize:'0.9rem', color:'#64748b'}}>No virtual hours set.</p>
              ) : (
                virtualSchedules.map(s => (
                  <RuleCard key={s._id} $isVirtual>
                    <DeleteBtn onClick={() => handleDeleteSchedule(s._id, 'virtual')}><FaTrash size={12}/></DeleteBtn>
                    <RuleTitle>{s.dayOfWeek}</RuleTitle>
                    <RuleDetail><FaClock/> {s.startTime} - {s.endTime}</RuleDetail>
                  </RuleCard>
                ))
              )}
            </Panel>
          </Sidebar>

          {/* Master Calendar */}
          <Panel style={{ padding: '32px' }}>
            <div className="calendar-container">
              {renderHeader()}
              {renderDays()}
              {renderCells()}
            </div>
            <div className="calendar-legend">
              <span className="legend-item"><span className="dot dot-phys"></span> Physical Clinic</span>
              <span className="legend-item"><span className="dot dot-virt"></span> Virtual Session</span>
              <span className="legend-item"><span className="dot dot-leave"></span> Unavailable / Leave</span>
            </div>
          </Panel>
        </DashboardGrid>
      )}

      {/* Modals */}
      {(modalType === 'physical' || modalType === 'virtual') && (
        <ModalOverlay onClick={() => setModalType(null)}>
          <ModalCard onClick={e => e.stopPropagation()}>
            <h2 style={{marginTop: 0, marginBottom: '24px'}}>
              Add Recurring {modalType === 'physical' ? 'Physical' : 'Virtual'} Rule
            </h2>
            <form onSubmit={handleScheduleSubmit} noValidate>
              {modalType === 'physical' && (
                <Field>
                  <label>Hospital/Clinic</label>
                  <input
                    list="hosp-list"
                    required
                    value={scheduleForm.hospitalName}
                    onChange={e => {
                      setScheduleForm({...scheduleForm, hospitalName: e.target.value});
                      clearFieldError(setFieldErrors, "hospitalName");
                    }}
                    placeholder="Select or type venue"
                    aria-invalid={Boolean(fieldErrors.hospitalName)}
                  />
                  <datalist id="hosp-list">
                    {sriLankanHospitals.map(h => <option key={h} value={h} />)}
                  </datalist>
                  <FieldError message={fieldErrors.hospitalName} />
                </Field>
              )}
              
              <FormGrid>
                <Field>
                  <label>Day of Week</label>
                  <select
                    value={scheduleForm.dayOfWeek}
                    onChange={e => {
                      setScheduleForm({...scheduleForm, dayOfWeek: e.target.value});
                      clearFieldError(setFieldErrors, "dayOfWeek");
                    }}
                    aria-invalid={Boolean(fieldErrors.dayOfWeek)}
                  >
                    {dayOrder.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <FieldError message={fieldErrors.dayOfWeek} />
                </Field>
                {modalType === 'physical' && (
                  <Field>
                    <label>Slot Duration</label>
                    <select
                      value={scheduleForm.slotDuration}
                      onChange={e => {
                        setScheduleForm({...scheduleForm, slotDuration: e.target.value});
                        clearFieldError(setFieldErrors, "slotDuration");
                      }}
                      aria-invalid={Boolean(fieldErrors.slotDuration)}
                    >
                      <option value="10">10 min</option>
                      <option value="15">15 min</option>
                      <option value="20">20 min</option>
                      <option value="30">30 min</option>
                    </select>
                    <FieldError message={fieldErrors.slotDuration} />
                  </Field>
                )}
              </FormGrid>

              <FormGrid>
                <Field>
                  <label>Start Time</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.startTime}
                    onChange={e => {
                      setScheduleForm({...scheduleForm, startTime: e.target.value});
                      clearFieldError(setFieldErrors, "startTime");
                    }}
                    aria-invalid={Boolean(fieldErrors.startTime)}
                  />
                  <FieldError message={fieldErrors.startTime} />
                </Field>
                <Field>
                  <label>End Time</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.endTime}
                    onChange={e => {
                      setScheduleForm({...scheduleForm, endTime: e.target.value});
                      clearFieldError(setFieldErrors, "endTime");
                    }}
                    aria-invalid={Boolean(fieldErrors.endTime)}
                  />
                  <FieldError message={fieldErrors.endTime} />
                </Field>
              </FormGrid>

              <BtnGroup>
                <Button type="button" onClick={() => setModalType(null)}>Cancel</Button>
                <Button type="submit" $primary disabled={saving}>{saving ? 'Saving...' : 'Save Rule'}</Button>
              </BtnGroup>
            </form>
          </ModalCard>
        </ModalOverlay>
      )}

      {/* Day Actions Modal */}
      {modalType === 'day_actions' && selectedDate && (
        <ModalOverlay onClick={() => { setModalType(null); setSelectedPatient(null); }}>
          <ModalCard onClick={e => e.stopPropagation()} style={{ width: 'min(700px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{margin: 0}}>
                {selectedPatient ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setSelectedPatient(null)}>
                    <FaChevronLeft size={16} /> Details
                  </span>
                ) : (
                  format(selectedDate, "EEEE, MMMM do, yyyy")
                )}
              </h2>
              <button onClick={() => { setModalType(null); setSelectedPatient(null); }} style={{background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'#64748b'}}><FaTimesCircle/></button>
            </div>
            
            {(() => {
              if (selectedPatient) {
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: '#0f172a' }}>{selectedPatient.patientName || selectedPatient.patient?.name || 'Unknown Patient'}</h3>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: '#64748b' }}>Type</p>
                          <strong style={{ color: selectedPatient.isVirtual ? '#10b981' : '#683b93' }}>{selectedPatient.isVirtual ? 'Virtual Consultation' : 'Physical Clinic'}</strong>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: '#64748b' }}>Time</p>
                          <strong>{selectedPatient.timeSlot || selectedPatient.approvedTimeSlot}</strong>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: '#64748b' }}>Status</p>
                          <strong style={{ textTransform: 'capitalize' }}>{selectedPatient.status}</strong>
                        </div>
                        {!selectedPatient.isVirtual && (
                          <div>
                            <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: '#64748b' }}>Venue</p>
                            <strong>{selectedPatient.venueName || 'Clinic'}</strong>
                          </div>
                        )}
                        {selectedPatient.patientEmail && (
                          <div>
                            <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: '#64748b' }}>Email</p>
                            <strong>{selectedPatient.patientEmail}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setSelectedPatient(null)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 600 }}>Back</button>
                      
                      {selectedPatient.isVirtual && (
                        <button onClick={() => navigate('/doctor/schedule')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                          Go to Virtual Workspace
                        </button>
                      )}
                      
                      {!selectedPatient.isVirtual && (
                        <button onClick={() => navigate(`/doctor/appointments/${selectedPatient.id}`)} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                          View Full Record
                        </button>
                      )}

                      <button onClick={() => { handleCancelAppointment(selectedPatient.id, selectedPatient.isVirtual ? 'virtual' : 'physical'); setSelectedPatient(null); }} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                        Cancel Booking
                      </button>
                    </div>
                  </div>
                );
              }

              const dateKey = format(selectedDate, "yyyy-MM-dd");
              const existingLeave = leaves.find(l => l.dateKey === dateKey);
              
              const dayPhysAppts = physicalAppointments.filter(a => a.dateKey === dateKey && a.status !== 'cancelled');
              const dayVirtAppts = virtualAppointments.filter(a => a.approvedDateKey === dateKey && !['expired', 'cancelled', 'rejected'].includes(a.status));
              const totalBookings = dayPhysAppts.length + dayVirtAppts.length;

              const isPast = isBefore(selectedDate, startOfDay(new Date()));

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Bookings Section */}
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: '#1e293b' }}>
                      Scheduled Patients ({totalBookings})
                    </h3>
                    
                    {totalBookings === 0 ? (
                      <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>No patients booked for this date.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {dayPhysAppts.map(apt => (
                          <div key={apt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedPatient({...apt, isVirtual: false})} className="patient-card">
                            <div>
                              <strong style={{ display: 'block', color: '#0f172a' }}>{apt.patientName}</strong>
                              <span style={{ fontSize: '0.8rem', color: '#64748b' }}><span style={{color: '#683b93', fontWeight: 600}}>Physical</span> • {apt.timeSlot} • {apt.venueName}</span>
                            </div>
                            {!isPast && (
                              <button onClick={(e) => { e.stopPropagation(); handleCancelAppointment(apt.id, 'physical'); }} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, zIndex: 2 }}>
                                Cancel
                              </button>
                            )}
                          </div>
                        ))}
                        {dayVirtAppts.map(apt => (
                          <div key={apt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedPatient({...apt, isVirtual: true})} className="patient-card">
                            <div>
                              <strong style={{ display: 'block', color: '#0f172a' }}>{apt.patient?.name || 'Patient'}</strong>
                              <span style={{ fontSize: '0.8rem', color: '#64748b' }}><span style={{color: '#10b981', fontWeight: 600}}>Virtual</span> • {apt.approvedTimeSlot}</span>
                            </div>
                            {!isPast && (
                              <button onClick={(e) => { e.stopPropagation(); handleCancelAppointment(apt.id, 'virtual'); }} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, zIndex: 2 }}>
                                Cancel
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Leave Section */}
                  {!isPast && (
                    <div style={{ background: existingLeave ? '#fef2f2' : 'white', padding: '20px', borderRadius: '16px', border: `1px solid ${existingLeave ? '#fecaca' : '#e2e8f0'}` }}>
                      {existingLeave ? (
                        <>
                          <h3 style={{ margin: '0 0 8px', color: '#b91c1c', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FaTimesCircle/> Marked as Unavailable
                          </h3>
                          <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#991b1b' }}>{existingLeave.reason}</p>
                          <Button type="button" onClick={() => handleRemoveLeave(existingLeave._id)} style={{ width: '100%' }}>
                            Restore Availability
                          </Button>
                        </>
                      ) : (
                        <>
                          <h3 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '1.05rem' }}>Take Day Off</h3>
                          <p style={{ color:'#64748b', fontSize:'0.9rem', marginBottom:'16px', marginTop: 0 }}>
                            Marking this day as unavailable will override any recurring rules.
                            {totalBookings > 0 && <span style={{display:'block', color:'#ef4444', fontWeight:600, marginTop:'8px'}}>Warning: You have {totalBookings} patients booked. You should cancel them first before taking leave.</span>}
                          </p>
                          <Field>
                            <input 
                              type="text" 
                              placeholder="Enter reason for leave"
                              value={leaveForm.reason}
                              onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})}
                              style={{ padding: '10px 14px' }}
                            />
                          </Field>
                          <Button type="button" onClick={handleMarkLeave} disabled={saving} style={{background:'#ef4444', color:'white', border:'none', width: '100%', padding: '12px'}}>
                            {saving ? 'Processing...' : 'Mark as Unavailable'}
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                </div>
              );
            })()}

          </ModalCard>
        </ModalOverlay>
      )}

    </Page>
  );
};

export default MySchedule;
