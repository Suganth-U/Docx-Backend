import React from 'react';
import "@/admin/Dashboard/Dashboard.css";
import { assets } from "@/shared/lib/assets";

const TodayDoctors = ({ doctors }) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const nextDoctor = () => {
    setCurrentIndex((prevIndex) => Math.min(prevIndex + 1, doctors.length - 1));
  };

  const prevDoctor = () => {
    setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  const currentDoctor = doctors[currentIndex];

  if (!currentDoctor) {
    return <div>No doctors available today.</div>;
  }

  return (
    <div className="today-doctors-card">
      <div className="card-header">
        <h3>Today Available Doctors</h3>
      </div>
      <div className="doctor-info">
        <h4>Jaffna Hospital</h4>
        <div className="doctor-details">
          <div className="doctor-image">
            <img src={currentDoctor.image || assets.avatar} alt={currentDoctor.name} />
          </div>
          <div className="info">
            <div className="name-navigation">
              <h4>{currentDoctor.name}</h4>
              <div className="navigation-buttons">
                <button onClick={prevDoctor} disabled={currentIndex === 0}>
                  &lt;
                </button>
                <button onClick={nextDoctor} disabled={currentIndex === doctors.length - 1}>
                  &gt;
                </button>
              </div>
            </div>
            <p>{currentDoctor.specialization} {currentDoctor.schedule}</p>
            <div className="rating">
              {Array.from({ length: 5 }).map((_, index) => (
                <span
                  key={index}
                  className={`star ${index < Math.floor(currentDoctor.rating)} ? 'filled' : ''}`}
                >
                  ★
                </span>
              ))}
              <span>{currentDoctor.rating} ({currentDoctor.reviews} reviews)</span>
            </div>
          </div>
        </div>
        <div className="appointments">
          <span className="appointment-count">{currentDoctor.appointments}</span>
          <p>APPOINTMENTS</p>
          <p className="last-appointment">{currentDoctor.lastAppointment}</p>
        </div>
      </div>
    </div>
  );
};

export default TodayDoctors;
