// frontend/src/components/analytics/DateRangePicker.jsx
import React, { useState } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';

const DateRangePicker = ({ onDateChange, defaultRange = 'monthly' }) => {
  const [timeRange, setTimeRange] = useState(defaultRange);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleTimeRangeChange = (e) => {
    const newRange = e.target.value;
    setTimeRange(newRange);
    
    // Calculate dates based on range
    const now = new Date();
    const newStartDate = new Date();
    
    switch (newRange) {
      case 'daily':
        newStartDate.setDate(now.getDate() - 7);
        break;
      case 'weekly':
        newStartDate.setDate(now.getDate() - 30);
        break;
      case 'monthly':
        newStartDate.setMonth(now.getMonth() - 6);
        break;
      case 'yearly':
        newStartDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        newStartDate.setMonth(now.getMonth() - 6);
    }
    
    setStartDate(newStartDate.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
    
    onDateChange({
      timeRange: newRange,
      startDate: newStartDate.toISOString(),
      endDate: now.toISOString()
    });
  };

  const handleCustomDateChange = () => {
    if (startDate && endDate) {
      onDateChange({
        timeRange: 'custom',
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      });
    }
  };

  const handleRefresh = () => {
    onDateChange({
      timeRange,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
      forceRefresh: true
    });
  };

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Time Range:</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <select 
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          value={timeRange}
          onChange={handleTimeRangeChange}
        >
          <option value="daily">Last 7 Days</option>
          <option value="weekly">Last 30 Days</option>
          <option value="monthly">Last 6 Months</option>
          <option value="quarterly">Last Quarter</option>
          <option value="yearly">Last Year</option>
          <option value="custom">Custom Range</option>
        </select>
        
        {timeRange === 'custom' && (
          <>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <span className="self-center text-gray-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              max={new Date().toISOString().split('T')[0]}
            />
            <button
              onClick={handleCustomDateChange}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Apply
            </button>
          </>
        )}
        
        <button
          onClick={handleRefresh}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>
    </div>
  );
};

export default DateRangePicker;