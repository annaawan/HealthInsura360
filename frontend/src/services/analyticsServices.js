// frontend/src/services/analyticsService.js
const API_BASE_URL = 'http://localhost:5000/api';

export const fetchAnalyticsData = async (params = {}) => {
  try {
    console.log('🔍 Fetching analytics from API');
    console.log('📊 Params:', params);
    
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/analytics/dashboard?${queryString}`;
    
    console.log('🌐 URL:', url);
    
    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('✅ Response status:', response.status);
    
    if (!response.ok) {
      console.warn('⚠️ API returned non-OK status:', response.status);
      // Still try to parse if there's a body
      if (response.status !== 204) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`HTTP ${response.status}: ${errorData?.error || response.statusText}`);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📦 Response data received');
    
    return data;

  } catch (error) {
    console.error('💥 Fetch error:', error.message);
    
    // Return demo data with error info
    return {
      success: false,
      error: error.message,
      data: getDemoData()
    };
  }
};

// Local demo data function
export const getDemoData = () => ({
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
      { period: 'Jan', count: 4000 },
      { period: 'Feb', count: 3000 },
      { period: 'Mar', count: 2000 },
      { period: 'Apr', count: 2780 },
      { period: 'May', count: 1890 },
      { period: 'Jun', count: 2390 },
    ],
    revenueData: [
      { period: 'Jan', revenue: 2400 },
      { period: 'Feb', revenue: 1398 },
      { period: 'Mar', revenue: 9800 },
      { period: 'Apr', revenue: 3908 },
      { period: 'May', revenue: 4800 },
      { period: 'Jun', revenue: 3800 },
    ]
  },
  distribution: [
    { name: 'Basic Health Guard', value: 400 },
    { name: 'Premium Family Shield', value: 300 },
    { name: 'Senior Care Plus', value: 200 },
    { name: 'Critical Illness Protect', value: 100 },
  ],
  activity: [
    { description: 'New customer registration', user_name: 'John Smith', entity_type: 'customer', created_at: new Date().toISOString() },
    { description: 'Policy purchased', user_name: 'Sarah Johnson', entity_type: 'policy', created_at: new Date(Date.now() - 900000).toISOString() },
  ]
});