import React from 'react';
import "@/admin/Dashboard/Dashboard.css";
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { assets } from "@/shared/lib/assets";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const PatientsReports = ({ reportData }) => {
  const data = {
    labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    datasets: [
      {
        label: 'Admit',
        data: reportData.dailyAdmissions,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
      {
        label: 'Discharge',
        data: reportData.dailyDischarges,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      },
    ],
  };

  const options = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        max: 120, 
      },
    },
    plugins: {
      legend: {
        display: false, 
      },
    },
  };

  return (
    <div className="patients-reports-card">
      <div className="card-header">
        <h3>Patients Reports</h3>
      </div>
      <div className="reports-overview">
        <div className="report-item admit">
        <div className="icon" style={{marginBottom:"-5px"}}><img src={assets.checkup} width="40px"></img></div> {/* You can use an actual icon component */}
        <div className="count">{reportData.totalAdmissions}</div>
          <div className="label">ADMIT</div>
          <div className="trend">{reportData.admissionTrend}</div>
          <button className="more-details">More Details</button>
        </div>
        <div className="bar-chart">
          <Bar data={data} options={options} />
        </div>
        <div className="report-item discharge">
          <div className="icon" style={{marginBottom:"-5px"}}><img src={assets.cure} width="40px"></img></div> {/* You can use an actual icon component */}
          <div className="count">{reportData.totalDischarges}</div>
          <div className="label">CURED</div>
          <div className="trend">{reportData.dischargeTrend}</div>
          <button className="more-details">More Details</button>
        </div>
      </div>
    </div>
  );
};

export default PatientsReports;