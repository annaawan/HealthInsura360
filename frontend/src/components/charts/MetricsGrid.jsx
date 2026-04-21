// frontend/src/components/charts/MetricsGrid.jsx
import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

const MetricsGrid = ({ metrics }) => {
  if (!metrics || metrics.length === 0) {
    return <div className="text-gray-500">No metrics available</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${metric.bgColor || 'bg-blue-100'} rounded-lg flex items-center justify-center`}>
                <Icon className={`h-5 w-5 ${metric.iconColor || 'text-blue-600'}`} />
              </div>
              <div className={`flex items-center gap-1 ${metric.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {metric.isPositive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                <span className="text-sm font-medium">{metric.change}</span>
              </div>
            </div>
            <div className="text-gray-600 text-sm mb-1">{metric.label}</div>
            <div className="text-xl font-bold text-gray-900">{metric.value}</div>
            {metric.description && (
              <div className="text-gray-500 text-xs mt-1">{metric.description}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MetricsGrid;