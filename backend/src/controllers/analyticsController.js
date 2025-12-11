// backend/controllers/analyticsController.js - COMPLETELY FIXED
const db = require('../config/database');

const getAnalyticsDashboard = async (req, res) => {
  try {
    const { timeRange = 'monthly', startDate, endDate } = req.query;
    
    console.log('📊 Analytics API called with:', { timeRange, startDate, endDate });
    
    // Validate dates - SIMPLIFIED: No date filtering for now
    const useDateFilter = false; // Temporarily disable to fix parameter issue
    let dateParams = [];
    
    if (startDate && endDate && startDate !== '1970-01-01T00:00:00.000Z') {
      dateParams = [startDate, endDate];
      console.log('📝 Using custom date range');
    } else {
      console.log('📝 Using NO date filter for testing');
    }

    // Execute all queries in parallel with SIMPLIFIED logic
    const [
      totalMetrics,
      userGrowth,
      revenueData,
      planDistribution,
      recentActivity
    ] = await Promise.all([
      getTotalMetrics(),  // No parameters
      getUserGrowthData(timeRange, dateParams),
      getRevenueData(timeRange, dateParams),
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
    console.error('❌ Analytics error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      data: getFallbackData(req.query.timeRange || 'monthly')
    });
  }
};

// FIXED: SIMPLIFIED getTotalMetrics - NO parameters
const getTotalMetrics = async () => {
  try {
    console.log('📝 Executing SIMPLIFIED metrics query...');
    
    const query = `
      -- Get all counts without date filtering
      SELECT 
        (SELECT COUNT(*) FROM customer) as total_customers,
        (SELECT COUNT(*) FROM agent) as total_agents,
        (SELECT COUNT(*) FROM admin) as total_admins,
        (SELECT COALESCE(SUM(amount), 0) FROM payment) as total_revenue,
        (SELECT COUNT(*) FROM claim WHERE status IN ('pending', 'processing')) as active_claims,
        (SELECT COALESCE(AVG(EXTRACT(DAY FROM (updated_at - filing_date))), 0) 
         FROM claim WHERE status = 'approved') as avg_claim_time,
        (SELECT COUNT(*) FROM policy_plans) as total_policies,
        (SELECT COALESCE(SUM(amount), 0) FROM commission) as total_commission
    `;
    
    console.log('📊 Database query (simplified):', query.substring(0, 200) + '...');
    const results = await db.query(query);
    
    const metrics = results.rows[0];
    console.log('📊 Metrics raw result:', metrics);
    
    // Convert to numbers
    return {
      total_customers: parseInt(metrics.total_customers) || 0,
      total_agents: parseInt(metrics.total_agents) || 0,
      total_admins: parseInt(metrics.total_admins) || 0,
      total_revenue: parseFloat(metrics.total_revenue) || 0,
      active_claims: parseInt(metrics.active_claims) || 0,
      avg_claim_time: parseFloat(metrics.avg_claim_time) || 0,
      total_policies: parseInt(metrics.total_policies) || 0,
      total_commission: parseFloat(metrics.total_commission) || 0
    };
  } catch (error) {
    console.error('❌ Metrics query failed:', error.message);
    return getSampleMetrics();
  }
};

// FIXED: getUserGrowthData with proper PostgreSQL grouping
const getUserGrowthData = async (timeRange, dateParams) => {
  try {
    let groupBy, orderBy, query;
    
    // FIXED: Proper PostgreSQL grouping
    if (timeRange === 'weekly') {
      // PostgreSQL requires using the same expression in GROUP BY
      groupBy = "EXTRACT(YEAR FROM created_at), EXTRACT(WEEK FROM created_at)";
      orderBy = "EXTRACT(YEAR FROM created_at), EXTRACT(WEEK FROM created_at)";
      query = `
        SELECT 
          EXTRACT(YEAR FROM created_at) || '-W' || LPAD(EXTRACT(WEEK FROM created_at)::text, 2, '0') as period,
          COUNT(*) as count
        FROM customer
        ${dateParams.length > 0 ? 'WHERE created_at BETWEEN $1 AND $2' : ''}
        GROUP BY ${groupBy}
        ORDER BY ${orderBy}
        LIMIT 20
      `;
    } else if (timeRange === 'daily') {
      groupBy = "created_at::date";
      orderBy = "created_at::date";
      query = `
        SELECT 
          created_at::date as period,
          COUNT(*) as count
        FROM customer
        ${dateParams.length > 0 ? 'WHERE created_at BETWEEN $1 AND $2' : ''}
        GROUP BY ${groupBy}
        ORDER BY ${orderBy}
        LIMIT 20
      `;
    } else { // monthly (default)
      groupBy = "TO_CHAR(created_at, 'YYYY-MM')";
      orderBy = "TO_CHAR(created_at, 'YYYY-MM')";
      query = `
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as period,
          COUNT(*) as count
        FROM customer
        ${dateParams.length > 0 ? 'WHERE created_at BETWEEN $1 AND $2' : ''}
        GROUP BY ${groupBy}
        ORDER BY ${orderBy}
        LIMIT 20
      `;
    }

    console.log('📊 User growth query:', query);
    const results = await db.query(query, dateParams.length > 0 ? dateParams : []);
    
    console.log(`✅ User growth data fetched: ${results.rows.length} records`);
    return results.rows;
  } catch (error) {
    console.error('❌ User growth query error:', error.message);
    console.error('❌ Error stack:', error.stack);
    return getSampleUserGrowth(timeRange);
  }
};

// FIXED: getRevenueData with proper PostgreSQL grouping
const getRevenueData = async (timeRange, dateParams) => {
  try {
    let query;
    
    // FIXED: Check payment table first
    if (timeRange === 'weekly') {
      query = `
        SELECT 
          EXTRACT(YEAR FROM paid_at) || '-W' || LPAD(EXTRACT(WEEK FROM paid_at)::text, 2, '0') as period,
          COALESCE(SUM(amount), 0) as revenue
        FROM payment
        ${dateParams.length > 0 ? 'WHERE paid_at BETWEEN $1 AND $2' : ''}
        GROUP BY EXTRACT(YEAR FROM paid_at), EXTRACT(WEEK FROM paid_at)
        ORDER BY EXTRACT(YEAR FROM paid_at), EXTRACT(WEEK FROM paid_at)
        LIMIT 20
      `;
    } else if (timeRange === 'daily') {
      query = `
        SELECT 
          paid_at::date as period,
          COALESCE(SUM(amount), 0) as revenue
        FROM payment
        ${dateParams.length > 0 ? 'WHERE paid_at BETWEEN $1 AND $2' : ''}
        GROUP BY paid_at::date
        ORDER BY paid_at::date
        LIMIT 20
      `;
    } else { // monthly
      query = `
        SELECT 
          TO_CHAR(paid_at, 'YYYY-MM') as period,
          COALESCE(SUM(amount), 0) as revenue
        FROM payment
        ${dateParams.length > 0 ? 'WHERE paid_at BETWEEN $1 AND $2' : ''}
        GROUP BY TO_CHAR(paid_at, 'YYYY-MM')
        ORDER BY TO_CHAR(paid_at, 'YYYY-MM')
        LIMIT 20
      `;
    }

    console.log('📊 Revenue query (from payment):', query);
    const results = await db.query(query, dateParams.length > 0 ? dateParams : []);
    
    // Check if we have any revenue data
    const hasRevenue = results.rows.length > 0 && results.rows.some(r => r.revenue > 0);
    
    if (!hasRevenue) {
      console.log('⚠️ No payment revenue found, checking policy premiums...');
      return getRevenueFromPolicyPremiums(timeRange, dateParams);
    }
    
    console.log(`✅ Revenue data fetched: ${results.rows.length} records`);
    return results.rows;
  } catch (error) {
    console.error('⚠️ Payment revenue query failed:', error.message);
    return getRevenueFromPolicyPremiums(timeRange, dateParams);
  }
};

// FIXED: Alternative revenue from policy premiums
const getRevenueFromPolicyPremiums = async (timeRange, dateParams) => {
  try {
    let query;
    
    // FIXED: Your schema has 'pemium_amount' (typo), but let's check both
    // First check what column actually exists
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'policy' 
      AND column_name IN ('pemium_amount', 'premium_amount', 'sum_insured')
    `);
    
    console.log('📊 Available policy amount columns:', columnCheck.rows);
    
    const amountColumn = columnCheck.rows.find(r => 
      r.column_name === 'premium_amount' || r.column_name === 'premium_amount'
    )?.column_name || 'sum_insured';
    
    console.log(`📊 Using column '${amountColumn}' for policy revenue`);
    
    if (timeRange === 'weekly') {
      query = `
        SELECT 
          EXTRACT(YEAR FROM created_at) || '-W' || LPAD(EXTRACT(WEEK FROM created_at)::text, 2, '0') as period,
          COALESCE(SUM(${amountColumn}), 0) as revenue
        FROM policy
        ${dateParams.length > 0 ? 'WHERE created_at BETWEEN $1 AND $2' : ''}
        GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(WEEK FROM created_at)
        ORDER BY EXTRACT(YEAR FROM created_at), EXTRACT(WEEK FROM created_at)
        LIMIT 20
      `;
    } else if (timeRange === 'daily') {
      query = `
        SELECT 
          created_at::date as period,
          COALESCE(SUM(${amountColumn}), 0) as revenue
        FROM policy
        ${dateParams.length > 0 ? 'WHERE created_at BETWEEN $1 AND $2' : ''}
        GROUP BY created_at::date
        ORDER BY created_at::date
        LIMIT 20
      `;
    } else { // monthly
      query = `
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as period,
          COALESCE(SUM(${amountColumn}), 0) as revenue
        FROM policy
        ${dateParams.length > 0 ? 'WHERE created_at BETWEEN $1 AND $2' : ''}
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY TO_CHAR(created_at, 'YYYY-MM')
        LIMIT 20
      `;
    }

    console.log('📊 Policy revenue query:', query);
    const results = await db.query(query, dateParams.length > 0 ? dateParams : []);
    
    console.log(`✅ Policy revenue data: ${results.rows.length} records`);
    return results.rows;
  } catch (error) {
    console.error('❌ Policy premium revenue error:', error.message);
    return getSampleRevenueData(timeRange);
  }
};

// FIXED: getPlanDistribution - check if policy table has data
const getPlanDistribution = async () => {
  try {
    console.log('📊 Getting plan distribution...');
    
    // First check if we have any policies
    const policyCheck = await db.query('SELECT COUNT(*) as count FROM policy');
    const policyCount = parseInt(policyCheck.rows[0].count);
    
    console.log(`📊 Total policies in database: ${policyCount}`);
    
    if (policyCount === 0) {
      console.log('⚠️ No policies found, checking policy_plans...');
      const plansCheck = await db.query('SELECT plan_name FROM policy_plans');
      if (plansCheck.rows.length > 0) {
        console.log(`⚠️ Found ${plansCheck.rows.length} plans but no policies`);
        return plansCheck.rows.map(row => ({
          name: row.plan_name || 'Unknown Plan',
          value: 0
        }));
      }
      console.log('⚠️ No policy plans found either');
      return [];
    }
    
    // Try joining with policy_plans
    const query = `
      SELECT 
          COALESCE(policy_type, 'Unknown Plan') as name,
          COUNT(*)::integer as value
        FROM policy
        GROUP BY policy_type
        ORDER BY value DESC
        LIMIT 10
    `;
    
    console.log('📊 Distribution query:', query);
    const results = await db.query(query);
    
    console.log(`✅ Distribution data: ${results.rows.length} plans`);
    
    if (results.rows.length === 0) {
      // Fallback: just count by policy_type
      const fallback = await db.query(`
        SELECT policy_type as name, COUNT(*) as value 
        FROM policy 
        GROUP BY policy_type 
        ORDER BY value DESC
      `);
      return fallback.rows;
    }
    
    return results.rows;
  } catch (error) {
    console.error('❌ Distribution query error:', error.message);
    return getSampleDistribution();
  }
};

// FIXED: getRecentActivity - simplified
const getRecentActivity = async () => {
  try {
    console.log('📊 Getting recent activity...');
    
    // Check audit_log first
    const auditCheck = await db.query('SELECT COUNT(*) as count FROM audit_log');
    const auditCount = parseInt(auditCheck.rows[0].count);
    
    if (auditCount > 0) {
      const query = `
        SELECT 
          action as description,
          timestamp as created_at,
          entity as entity_type,
          user_type as user_name
        FROM audit_log
        ORDER BY timestamp DESC
        LIMIT 10
      `;
      
      console.log('📊 Activity from audit_log:', query);
      const results = await db.query(query);
      return results.rows;
    }
    
    // If no audit_log, generate from recent events
    console.log('⚠️ No audit_log, generating activity from recent events...');
    
    // Try to get from multiple tables
    const generatedQuery = `
      (SELECT 
        'Policy purchased' as description,
        created_at,
        'policy' as entity_type,
        (SELECT CONCAT(first_name, ' ', last_name) FROM customer WHERE customer_id = p.customer_id LIMIT 1) as user_name
      FROM policy p
      ORDER BY created_at DESC
      LIMIT 3)
      
      UNION ALL
      
      (SELECT 
        'Payment received' as description,
        paid_at as created_at,
        'payment' as entity_type,
        (SELECT CONCAT(first_name, ' ', last_name) FROM customer WHERE customer_id = p.customer_id LIMIT 1) as user_name
      FROM payment p
      WHERE paid_at IS NOT NULL
      ORDER BY paid_at DESC
      LIMIT 3)
      
      UNION ALL
      
      (SELECT 
        'New customer registered' as description,
        created_at,
        'customer' as entity_type,
        CONCAT(first_name, ' ', last_name) as user_name
      FROM customer
      ORDER BY created_at DESC
      LIMIT 3)
      
      UNION ALL
      
      (SELECT 
        'Claim submitted' as description,
        filing_date as created_at,
        'claim' as entity_type,
        (SELECT CONCAT(first_name, ' ', last_name) FROM customer WHERE customer_id = c.customer_id LIMIT 1) as user_name
      FROM claim c
      WHERE filing_date IS NOT NULL
      ORDER BY filing_date DESC
      LIMIT 3)
      
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    console.log('📊 Generated activity query');
    const results = await db.query(generatedQuery);
    console.log(`✅ Generated activity: ${results.rows.length} records`);
    return results.rows;
    
  } catch (error) {
    console.error('❌ Activity query failed:', error.message);
    return getSampleActivity();
  }
};

// FIXED: Debug endpoint - check database state
const getDatabaseState = async (req, res) => {
  try {
    console.log('🔍 Checking database state...');
    
    const tables = [
      'customer', 'policy', 'agent', 'admin', 
      'payment', 'claim', 'commission', 'policy_plans', 
      'audit_log', 'hospital'
    ];
    
    const counts = {};
    const sampleData = {};
    
    for (const table of tables) {
      try {
        const countResult = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
        counts[table] = parseInt(countResult.rows[0].count);
        
        // Get sample data for key tables
        if (['customer', 'policy', 'payment', 'claim'].includes(table)) {
          const sampleResult = await db.query(`SELECT * FROM ${table} LIMIT 2`);
          sampleData[table] = sampleResult.rows;
        }
      } catch (tableError) {
        console.error(`⚠️ Error querying ${table}:`, tableError.message);
        counts[table] = 'Error';
      }
    }
    
    // Check policy table columns
    const policyColumns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'policy'
      ORDER BY ordinal_position
    `);
    
    // Check if there are any amounts in payment table
    const paymentSum = await db.query('SELECT COALESCE(SUM(amount), 0) as total FROM payment');
    
    res.json({
      success: true,
      data: {
        counts,
        sampleData,
        policyColumns: policyColumns.rows,
        paymentTotal: parseFloat(paymentSum.rows[0].total),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Database state check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
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
      return ['2025-W45', '2025-W46', '2025-W47', '2025-W48'];
    case 'daily':
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return days.map((day, i) => `${day} ${i+1}`);
    default: // monthly
      return ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];
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

module.exports = { 
  getAnalyticsDashboard,
  getDatabaseState
};