import React from "react";
import Chart from "react-apexcharts";

const PatientPieChart = () => {
  const options = {
    chart: {
      type: "donut",
    },
    labels: ["Woman", "Man"],
    colors: ["#00a8ff", "#d1e3f6"],
    legend: {
      position: "bottom",
      horizontalAlign: "center",
      itemMargin: {
        vertical: 10,
      },
      fontSize: "12px",
      labels: {
        colors: "#3D2660",
        useSeriesColors: false,
      },
      markers: {
        width: 12, 
        height: 12,
      },
    },
  };

  const series = [440, 550];

  return (
    <div className="patient-pie-chart">
      <Chart options={options} series={series} type="donut" width="250" />
    </div>
  );
};

export default PatientPieChart;
