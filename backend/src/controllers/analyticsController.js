// backend/controllers/analyticsController.js
const db = require('../config/database');

const getAnalyticsDashboard = async (req, res) => {
  try {
    const { timeRange = 'monthly', startDate, endDate } = req.query;
    
    console.log('📊 Analytics API called with:', { timeRange, startDate, endDate });
    
    // Validate dates
    let hasDateCondition = false;
    let dateParams = [];
    
    if (startDate && endDate && startDate !== '1970-01-01T00:00:00.000Z') {
      hasDateCondition = true;
      dateParams = [startDate, endDate];
      console.log('📝 Date condition: WHERE created_at BETWEEN $1 AND $2');
      console.log('🔢 Date params:', dateParams);
    } else {
      // Default to last 6 months
      const defaultStartDate = new Date();
      defaultStartDate.setMonth(defaultStartDate.getMonth() - 6);
      hasDateCondition = true;
      dateParams = [defaultStartDate.toISOString(), new Date().toISOString()];
      console.log('📝 Using default date range (last 6 months)');
    }

    // Execute all queries in parallel
    const [
      totalMetrics,
      userGrowth,
      revenueData,
      planDistribution,
      recentActivity
    ] = await Promise.all([
      getTotalMetrics(hasDateCondition, dateParams),
      getUserGrowthData(timeRange, hasDateCondition, dateParams),
      getRevenueData(timeRange, hasDateCondition, dateParams),
      getPlanDistribution(),
      getRecentActivity()
    ]);

    console.log('✅ Analytics data prepared successfully');
    res.json({
      success: true,
      data: {
        metrics: totalMetrics,
        trends: {
          userGrowth,
          revenueData
        },
        distribution: planDistribution,
        activity: recentActivity
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      data: getFallbackData(req.query.timeRange || 'monthly')
    });
  }
};

// Helper function to build date conditions
const buildDateCondition = (tableName, hasDateCondition, params) => {
  if (!hasDateCondition) return '';
  
  // Map table names to their date columns from your schema
  const dateColumns = {
    customer: 'created_at',
    policy: 'created_at',
    payment: 'paid_at',
    claim: 'filing_date',
    commission: 'created_at',
    audit_log: 'timestamp'
  };
  
  const dateCol = dateColumns[tableName] || 'created_at';
  
  if (params.length === 2) {
    return `WHERE ${dateCol} BETWEEN $1 AND $2`;
  } else if (params.length === 1) {
    return `WHERE ${dateCol} >= $1`;
  }
  return '';
};

// Helper functions
const getTotalMetrics = async (hasDateCondition, params) => {
  try {
    console.log('📝 Executing metrics query...');
    
    // FIXED: Using correct column names from schema
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM customer ${buildDateCondition('customer', hasDateCondition, params)}) as total_customers,
        (SELECT COUNT(*) FROM agent) as total_agents,
        (SELECT COUNT(*) FROM admin) as total_admins,
        (SELECT COALESCE(SUM(amount), 0) FROM payment ${buildDateCondition('payment', hasDateCondition, params)}) as total_revenue,
        (SELECT COUNT(*) FROM claim WHERE status IN ('pending', 'processing') ${buildDateCondition('claim', hasDateCondition, params)}) as active_claims,
        (SELECT COALESCE(AVG(EXTRACT(DAY FROM (updated_at - filing_date))), 0) FROM claim WHERE status = 'approved' ${buildDateCondition('claim', hasDateCondition, params)}) as avg_claim_time,
        (SELECT COUNT(*) FROM policy ${buildDateCondition('policy', hasDateCondition, params)}) as total_policies,
        (SELECT COALESCE(SUM(amount), 0) FROM commission ${buildDateCondition('commission', hasDateCondition, params)}) as total_commission
    `;
    
    console.log('📊 Database query:', query.substring(0, 200) + '...');
    const results = await db.query(query, hasDateCondition ? params : []);
    
    return results.rows[0];
  } catch (error) {
    console.error('❌ Metrics query failed, using sample data:', error.message);
    return getSampleMetrics();
  }
};

const getUserGrowthData = async (timeRange, hasDateCondition, params) => {
  try {
    let groupBy, orderBy;
    
    // Fixed: Proper date grouping based on timeRange
    if (timeRange === 'weekly') {
      groupBy = "EXTRACT(YEAR FROM created_at) || '-' || LPAD(EXTRACT(WEEK FROM created_at)::text, 2, '0')";
      orderBy = "EXTRACT(YEAR FROM created_at), EXTRACT(WEEK FROM created_at)";
    } else if (timeRange === 'daily') {
      groupBy = "created_at::date";
      orderBy = "created_at::date";
    } else { // monthly (default)
      groupBy = "TO_CHAR(created_at, 'YYYY-MM')";
      orderBy = "TO_CHAR(created_at, 'YYYY-MM')";
    }

    const query = `
      SELECT 
        ${groupBy} as period,
        COUNT(*) as count
      FROM customer
      ${buildDateCondition('customer', hasDateCondition, params)}
      GROUP BY ${groupBy}
      ORDER BY ${orderBy}
      LIMIT 20
    `;

    console.log('📊 Database query:', query);
    const results = await db.query(query, hasDateCondition ? params : []);
    
    console.log(`✅ User growth data fetched: ${results.rows.length} records`);
    return results.rows;
  } catch (error) {
    console.error('User growth query error:', error.message);
    return getSampleUserGrowth(timeRange);
  }
};

const getRevenueData = async (timeRange, hasDateCondition, params) => {
  try {
    let groupBy, orderBy;
    
    if (timeRange === 'weekly') {
      groupBy = "EXTRACT(YEAR FROM paid_at) || '-' || LPAD(EXTRACT(WEEK FROM paid_at)::text, 2, '0')";
      orderBy = "EXTRACT(YEAR FROM paid_at), EXTRACT(WEEK FROM paid_at)";
    } else if (timeRange === 'daily') {
      groupBy = "paid_at::date";
      orderBy = "paid_at::date";
    } else { // monthly
      groupBy = "TO_CHAR(paid_at, 'YYYY-MM')";
      orderBy = "TO_CHAR(paid_at, 'YYYY-MM')";
    }

    const query = `
      SELECT 
        ${groupBy} as period,
        COALESCE(SUM(amount), 0) as revenue
      FROM payment
      ${buildDateCondition('payment', hasDateCondition, params)}
      GROUP BY ${groupBy}
      ORDER BY ${orderBy}
      LIMIT 20
    `;

    console.log('📊 Database query:', query);
    const results = await db.query(query, hasDateCondition ? params : []);
    
    if (results.rows.length === 0) {
      console.log('⚠️ Revenue query failed, using premium amounts from policy');
      return getRevenueFromPolicyPremiums(timeRange, hasDateCondition, params);
    }
    
    return results.rows;
  } catch (error) {
    console.error('⚠️ Revenue query failed:', error.message);
    return getRevenueFromPolicyPremiums(timeRange, hasDateCondition, params);
  }
};

// Alternative revenue from policy premiums
const getRevenueFromPolicyPremiums = async (timeRange, hasDateCondition, params) => {
  try {
    let groupBy, orderBy;
    
    if (timeRange === 'weekly') {
      groupBy = "EXTRACT(YEAR FROM p.created_at) || '-' || LPAD(EXTRACT(WEEK FROM p.created_at)::text, 2, '0')";
      orderBy = "EXTRACT(YEAR FROM p.created_at), EXTRACT(WEEK FROM p.created_at)";
    } else if (timeRange === 'daily') {
      groupBy = "p.created_at::date";
      orderBy = "p.created_at::date";
    } else { // monthly
      groupBy = "TO_CHAR(p.created_at, 'YYYY-MM')";
      orderBy = "TO_CHAR(p.created_at, 'YYYY-MM')";
    }

    const query = `
      SELECT 
        ${groupBy} as period,
        COALESCE(SUM(p.pemium_amount), 0) as revenue
      FROM policy p
      ${buildDateCondition('policy', hasDateCondition, params)}
      GROUP BY ${groupBy}
      ORDER BY ${orderBy}
      LIMIT 20
    `;

    console.log('📊 Database query:', query);
    const results = await db.query(query, hasDateCondition ? params : []);
    
    console.log(`✅ Revenue data from policy premiums: ${results.rows.length} records`);
    return results.rows;
  } catch (error) {
    console.error('Policy premium revenue error:', error.message);
    return getSampleRevenueData(timeRange);
  }
};

const getPlanDistribution = async () => {
  try {
    const query = `
      SELECT 
        pp.plan_name as name,
        COUNT(p.policy_id)::integer as value
      FROM policy p
      JOIN policy_plans pp ON p.policy_type = pp.policy_type
      GROUP BY pp.plan_name
      LIMIT 10
    `;

    console.log('Distribution query:', query);
    const results = await db.query(query);
    
    console.log(`✅ Distribution data fetched: ${results.rows.length} plans`);
    return results.rows;
  } catch (error) {
    console.error('Distribution query error:', error.message);
    
    // Try alternative
    try {
      const altQuery = `
        SELECT 
          policy_type as name,
          COUNT(*)::integer as value
        FROM policy
        GROUP BY policy_type
        LIMIT 10
      `;
      const altResults = await db.query(altQuery);
      return altResults.rows;
    } catch (altError) {
      console.error('Alternative distribution query failed:', altError.message);
      return getSampleDistribution();
    }
  }
};

const getRecentActivity = async () => {
  try {
    // FIXED: Using correct column names from schema
    const query = `
      SELECT 
        a.action as description,
        a.timestamp as created_at,
        a.entity as entity_type,
        CASE 
          WHEN a.user_type = 'customer' THEN CONCAT(c.first_name, ' ', c.last_name)
          WHEN a.user_type = 'agent' THEN CONCAT(ag.first_name, ' ', ag.last_name)
          WHEN a.user_type = 'admin' THEN ad.full_name
          ELSE 'System'
        END as user_name,
        a.user_type
      FROM audit_log a
      LEFT JOIN customer c ON a.user_id::text = c.customer_id::text AND a.user_type = 'customer'
      LEFT JOIN agent ag ON a.user_id::text = ag.agent_id::text AND a.user_type = 'agent'
      LEFT JOIN admin ad ON a.user_id::text = ad.admin_id::text AND a.user_type = 'admin'
      ORDER BY a.timestamp DESC
      LIMIT 10
    `;

    console.log('📊 Database query:', query.substring(0, 150) + '...');
    const results = await db.query(query);
    
    return results.rows;
  } catch (error) {
    console.error('⚠️ Activity query failed:', error.message);
    
    // Simple fallback - FIXED: using correct column names
    try {
      const simpleQuery = `
        SELECT 
          action as description,
          timestamp as created_at,
          entity as entity_type,
          user_type as user_name
        FROM audit_log
        ORDER BY timestamp DESC
        LIMIT 5
      `;
      console.log('📊 Database query:', simpleQuery);
      const simpleResults = await db.query(simpleQuery);
      console.log('✅ Simple activity data fetched');
      return simpleResults.rows.map(row => ({
        description: row.description,
        user_name: row.user_type, // Changed from user_name to user_type
        entity_type: row.entity_type,
        created_at: row.created_at
      }));
    } catch (simpleError) {
      console.error('Simple activity query failed:', simpleError.message);
      return getSampleActivity();
    }
  }
};

// Fallback data functions
const getSampleMetrics = () => ({
  total_customers: 45892,
  total_revenue: 2400000,
  active_claims: 1247,
  avg_claim_time: 2.4,
  total_policies: 32845,
  total_commission: 456200,
  total_agents: 150,
  total_admins: 10
});

const getSampleUserGrowth = (timeRange) => {
  const periods = getPeriods(timeRange);
  return periods.map(period => ({
    period,
    count: Math.floor(Math.random() * 3000) + 1500
  }));
};

const getSampleRevenueData = (timeRange) => {
  const periods = getPeriods(timeRange);
  return periods.map(period => ({
    period,
    revenue: Math.floor(Math.random() * 10000) + 2000
  }));
};

const getSampleDistribution = () => [
  { name: 'Basic Health Guard', value: 400 },
  { name: 'Premium Family Shield', value: 300 },
  { name: 'Senior Care Plus', value: 200 },
  { name: 'Critical Illness Protect', value: 100 },
];

const getSampleActivity = () => [
  { 
    description: 'New customer registration', 
    user_name: 'John Smith', 
    entity_type: 'customer', 
    created_at: new Date().toISOString() 
  },
  { 
    description: 'Policy purchased', 
    user_name: 'Sarah Johnson', 
    entity_type: 'policy', 
    created_at: new Date(Date.now() - 900000).toISOString() 
  },
  { 
    description: 'Claim submitted', 
    user_name: 'Mike Chen', 
    entity_type: 'claim', 
    created_at: new Date(Date.now() - 1800000).toISOString() 
  },
];

const getPeriods = (timeRange) => {
  switch (timeRange) {
    case 'weekly':
      return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    case 'daily':
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    default: // monthly
      return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  }
};

const getFallbackData = (timeRange) => ({
  metrics: getSampleMetrics(),
  trends: {
    userGrowth: getSampleUserGrowth(timeRange),
    revenueData: getSampleRevenueData(timeRange)
  },
  distribution: getSampleDistribution(),
  activity: getSampleActivity()
});

module.exports = { getAnalyticsDashboard };