import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

function DoughnutChart({ chartData }) {
  const options = {
    responsive: true,
    width: 350,
    height: 350,
    plugins: {
      legend: {
        position: "bottom",
      },
    },
  };

  return (
    <div className="doughnut-chart">
      <Doughnut data={chartData} options={options} />
    </div>
  );
}

export default DoughnutChart;
