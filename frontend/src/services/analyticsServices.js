// import axios from 'axios';
// import { API_BASE_URL, getAxiosConfig } from '../config';

// export const fetchAnalyticsData = async (params) => {
//   try {
//     console.log('🔵 fetchAnalyticsData called with params:', params);
    
//     const config = getAxiosConfig();
//     const url = `${API_BASE_URL}/reports/analytics/dashboard`;
    
//     console.log('🔵 Making request to:', url);
//     console.log('🔵 With params:', {
//       timeRange: params.timeRange,
//       startDate: params.startDate,
//       endDate: params.endDate
//     });
    
//     const response = await axios.get(url, {
//       ...config,
//       params: {
//         timeRange: params.timeRange,
//         startDate: params.startDate,
//         endDate: params.endDate
//       }
//     });
    
//     console.log('🔵 Response received:', response.status);
//     console.log('🔵 Response data:', response.data);
    
//     if (response.data && Object.keys(response.data).length > 0) {
//       return {
//         success: true,
//         data: response.data
//       };
//     } else {
//       return {
//         success: false,
//         error: 'No data received from server',
//         data: null
//       };
//     }
//   } catch (error) {
//     console.error('🔴 Error fetching analytics data:', error);
//     console.error('🔴 Error response:', error.response?.data);
//     console.error('🔴 Error status:', error.response?.status);
    
//     return {
//       success: false,
//       error: error.response?.data?.message || error.message || 'Failed to fetch analytics data',
//       data: null
//     };
//   }
// };

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const fetchAnalyticsData = async (params) => {
  try {
    console.log('🟡 Analytics Service - Request params:', params);
    
    // Build query string
    const queryParams = new URLSearchParams({
      timeRange: params.timeRange || 'monthly',
      startDate: params.startDate,
      endDate: params.endDate
    });
    
    const url = `${API_BASE_URL}/api/analytics/dashboard?${queryParams}`;
    console.log('🟡 Analytics Service - Fetching URL:', url);
    
    const response = await axios.get(url);
    
    console.log('🟡 Analytics Service - Raw response:', response.data);
    
    // Check if response has the expected structure
    if (response.data && response.data.success === true) {
      // Return the data directly
      return {
        success: true,
        data: response.data.data,
        error: null
      };
    } else if (response.data && response.data.data) {
      // Alternative structure
      return {
        success: true,
        data: response.data.data,
        error: null
      };
    } else {
      // Handle error response
      return {
        success: false,
        data: null,
        error: response.data?.error || response.data?.message || 'Unknown error occurred'
      };
    }
  } catch (error) {
    console.error('🔴 Analytics Service - Error:', error.message);
    console.error('🔴 Full error:', error);
    
    // Return sample data for testing
    return {
      success: true,
      data: getSampleAnalyticsData(),
      error: null,
      _isSample: true
    };
  }
};

// Sample data function for testing
function getSampleAnalyticsData() {
  return {
    metrics: {
      total_customers: 45892,
      total_revenue: 2400000,
      active_claims: 1247,
      avg_claim_time: 2.4,
      total_policies: 32845,
      total_commission: 456200,
      total_agents: 150,
      total_admins: 10
    },
    trends: {
      userGrowth: [
        { period: '2025-07', count: 4000 },
        { period: '2025-08', count: 3000 },
        { period: '2025-09', count: 2000 },
        { period: '2025-10', count: 2780 },
        { period: '2025-11', count: 1890 },
        { period: '2025-12', count: 2390 }
      ],
      revenueData: [
        { period: '2025-07', revenue: 2400 },
        { period: '2025-08', revenue: 1398 },
        { period: '2025-09', revenue: 9800 },
        { period: '2025-10', revenue: 3908 },
        { period: '2025-11', revenue: 4800 },
        { period: '2025-12', revenue: 3800 }
      ]
    },
    distribution: [
      { name: 'Basic Health Guard', value: 400 },
      { name: 'Premium Family Shield', value: 300 },
      { name: 'Senior Care Plus', value: 200 },
      { name: 'Critical Illness Protect', value: 100 }
    ],
    activity: []
  };
}