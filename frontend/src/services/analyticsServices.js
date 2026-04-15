import axios from 'axios';
import { API_BASE_URL, getAxiosConfig } from '../config';

export const fetchAnalyticsData = async (params) => {
  try {
    console.log('🔵 fetchAnalyticsData called with params:', params);
    
    const config = getAxiosConfig();
    const url = `${API_BASE_URL}/reports/analytics/dashboard`;
    
    console.log('🔵 Making request to:', url);
    console.log('🔵 With params:', {
      timeRange: params.timeRange,
      startDate: params.startDate,
      endDate: params.endDate
    });
    
    const response = await axios.get(url, {
      ...config,
      params: {
        timeRange: params.timeRange,
        startDate: params.startDate,
        endDate: params.endDate
      }
    });
    
    console.log('🔵 Response received:', response.status);
    console.log('🔵 Response data:', response.data);
    
    if (response.data && Object.keys(response.data).length > 0) {
      return {
        success: true,
        data: response.data
      };
    } else {
      return {
        success: false,
        error: 'No data received from server',
        data: null
      };
    }
  } catch (error) {
    console.error('🔴 Error fetching analytics data:', error);
    console.error('🔴 Error response:', error.response?.data);
    console.error('🔴 Error status:', error.response?.status);
    
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to fetch analytics data',
      data: null
    };
  }
};