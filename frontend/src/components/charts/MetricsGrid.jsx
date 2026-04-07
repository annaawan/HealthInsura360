// components/charts/MetricsGrid.jsx
import React, { useRef, useEffect } from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import './ChartConfig.jsx'; // Import the registration file

const MetricsGrid = ({ data, type = 'line' }) => {
  const chartRef = useRef(null);

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  const renderChart = () => {
    const chartProps = {
      ref: chartRef,
      data: data || {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
        datasets: [{
          label: 'Default Data',
          data: [12, 19, 3, 5, 2],
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
        }
      }
    };

    switch(type) {
      case 'line':
        return <Line {...chartProps} />;
      case 'bar':
        return <Bar {...chartProps} />;
      case 'pie':
        return <Pie {...chartProps} />;
      default:
        return <Line {...chartProps} />;
    }
  };

  return (
    <div style={{ height: '400px', width: '100%', position: 'relative' }}>
      {renderChart()}
    </div>
  );
};

export default MetricsGrid;