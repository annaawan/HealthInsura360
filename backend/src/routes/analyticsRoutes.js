// backend/src/routes/analyticsRoutes.js - COMPLETELY FIXED
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET analytics data
router.get('/dashboard', async (req, res) => {
  try {
    const { timeRange = 'monthly', startDate, endDate } = req.query;
    
    console.log('📊 Analytics API called with:', { timeRange, startDate, endDate });
    
    // Validate and prepare date parameters
    let dateParams = [];
    let hasDateCondition = false;
    
    if (startDate && endDate && startDate !== '1970-01-01T00:00:00.000Z') {
      dateParams = [startDate, endDate];
      hasDateCondition = true;
    } else {
      // Default to last 6 months
      const defaultStart = new Date();
      defaultStart.setMonth(defaultStart.getMonth() - 6);
      dateParams = [defaultStart.toISOString(), new Date().toISOString()];
      hasDateCondition = true;
    }

    console.log('🔢 Date params:', dateParams);
    
    // Build date condition string based on table
    const buildDateCondition = (tableName, paramIndex = 1) => {
      if (!hasDateCondition) return '';
      
      // Map tables to their date columns from YOUR SCHEMA
      const dateColumns = {
        customer: 'created_at',
        policy: 'created_at',
        payment: 'paid_at',
        claim: 'filing_date',
        commission: 'created_at'
      };
      
      const dateCol = dateColumns[tableName] || 'created_at';
      
      if (dateParams.length === 2) {
        return `WHERE ${dateCol} BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      }
      return `WHERE ${dateCol} >= $${paramIndex}`;
    };

    // Build where clause for subqueries
    const buildWhereClause = (tableName, paramIndex = 1) => {
      if (!hasDateCondition) return '';
      
      const dateColumns = {
        customer: 'created_at',
        policy: 'created_at',
        payment: 'paid_at',
        claim: 'filing_date',
        commission: 'created_at'
      };
      
      const dateCol = dateColumns[tableName] || 'created_at';
      
      if (dateParams.length === 2) {
        return `AND ${dateCol} BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      }
      return `AND ${dateCol} >= $${paramIndex}`;
    };

    console.log('📝 Date condition:', buildDateCondition('customer', 1));

    // FIXED METRICS QUERY - Using correct column names from YOUR SCHEMA
    console.log('📝 Executing metrics query...');
    
    let metrics;
    try {
      // IMPORTANT: All queries use same parameters in correct order
      const metricsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM customer ${buildDateCondition('customer', 1)}) as total_customers,
          (SELECT COUNT(*) FROM agent) as total_agents,
          (SELECT COUNT(*) FROM admin) as total_admins,
          (SELECT COALESCE(SUM(amount), 0) FROM payment ${buildDateCondition('payment', hasDateCondition ? 3 : 1)}) as total_revenue,
          (SELECT COUNT(*) FROM claim WHERE status IN ('pending', 'processing') ${buildWhereClause('claim', hasDateCondition ? 5 : 1)}) as active_claims,
          (SELECT COALESCE(AVG(EXTRACT(DAY FROM (updated_at - filing_date))), 0) FROM claim WHERE status = 'approved' ${buildWhereClause('claim', hasDateCondition ? 7 : 1)}) as avg_claim_time,
          (SELECT COUNT(*) FROM policy ${buildDateCondition('policy', hasDateCondition ? 9 : 1)}) as total_policies,
          (SELECT COALESCE(SUM(amount), 0) FROM commission ${buildDateCondition('commission', hasDateCondition ? 11 : 1)}) as total_commission
      `;
      
      console.log('📊 Database query:', metricsQuery.substring(0, 200) + '...');
      
      // Pass ALL parameters at once
      const allParams = hasDateCondition 
        ? [...dateParams, ...dateParams, ...dateParams, ...dateParams, ...dateParams]
        : [];
      
      const metricsResult = await db.query(metricsQuery, allParams);
      metrics = metricsResult.rows[0];
      
      // Add default values for any missing metrics
      metrics = {
        total_customers: metrics.total_customers || 0,
        total_agents: metrics.total_agents || 0,
        total_admins: metrics.total_admins || 0,
        total_revenue: metrics.total_revenue || 0,
        active_claims: metrics.active_claims || 0,
        avg_claim_time: metrics.avg_claim_time || 0,
        total_policies: metrics.total_policies || 0,
        total_commission: metrics.total_commission || 0
      };
      
      console.log('✅ Metrics query successful:', metrics);
    } catch (queryError) {
      console.error('❌ Metrics query failed, using sample data:', queryError.message);
      metrics = {
        total_customers: 0,
        total_agents: 0,
        total_admins: 0,
        total_revenue: 0,
        active_claims: 0,
        avg_claim_time: 0,
        total_policies: 0,
        total_commission: 0
      };
    }

    // Get user growth data - FIXED
    console.log('📊 Getting user growth data...');
    let userGrowth = [];
    try {
      let groupBy, orderBy;
      
      if (timeRange === 'weekly') {
        groupBy = "EXTRACT(YEAR FROM created_at) || '-' || LPAD(EXTRACT(WEEK FROM created_at)::text, 2, '0')";
        orderBy = "EXTRACT(YEAR FROM created_at), EXTRACT(WEEK FROM created_at)";
      } else if (timeRange === 'daily') {
        groupBy = "created_at::date";
        orderBy = "created_at::date";
      } else { // monthly
        groupBy = "TO_CHAR(created_at, 'YYYY-MM')";
        orderBy = "TO_CHAR(created_at, 'YYYY-MM')";
      }
      
      const userGrowthQuery = `
        SELECT 
          ${groupBy} as period,
          COUNT(*) as count
        FROM customer
        ${buildDateCondition('customer', 1)}
        GROUP BY ${groupBy}
        ORDER BY ${orderBy}
        LIMIT 20
      `;
      
      console.log('📊 Database query:', userGrowthQuery);
      const userGrowthResult = await db.query(userGrowthQuery, hasDateCondition ? dateParams : []);
      userGrowth = userGrowthResult.rows;
      console.log(`✅ User growth data fetched: ${userGrowth.length} records`);
    } catch (error) {
      console.log('⚠️ User growth query failed:', error.message);
      userGrowth = [];
    }

    // Get revenue data - FIXED: Using payment table from YOUR SCHEMA
    console.log('📊 Getting revenue data...');
    let revenueData = [];
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
      
      const revenueQuery = `
        SELECT 
          ${groupBy} as period,
          COALESCE(SUM(amount), 0) as revenue
        FROM payment
        ${buildDateCondition('payment', 1)}
        GROUP BY ${groupBy}
        ORDER BY ${orderBy}
        LIMIT 20
      `;
      
      console.log('📊 Database query:', revenueQuery);
      const revenueResult = await db.query(revenueQuery, hasDateCondition ? dateParams : []);
      revenueData = revenueResult.rows;
      console.log(`✅ Revenue data fetched: ${revenueData.length} records`);
    } catch (error) {
      console.log('⚠️ Revenue query failed:', error.message);
      
      // Fallback: Try policy premiums (note: YOUR SCHEMA has 'pemium_amount' typo)
      try {
        let groupBy, orderBy;
        
        if (timeRange === 'weekly') {
          groupBy = "EXTRACT(YEAR FROM created_at) || '-' || LPAD(EXTRACT(WEEK FROM created_at)::text, 2, '0')";
          orderBy = "EXTRACT(YEAR FROM created_at), EXTRACT(WEEK FROM created_at)";
        } else if (timeRange === 'daily') {
          groupBy = "created_at::date";
          orderBy = "created_at::date";
        } else { // monthly
          groupBy = "TO_CHAR(created_at, 'YYYY-MM')";
          orderBy = "TO_CHAR(created_at, 'YYYY-MM')";
        }
        
        const fallbackQuery = `
          SELECT 
            ${groupBy} as period,
            COALESCE(SUM(pemium_amount), 0) as revenue
          FROM policy
          ${buildDateCondition('policy', 1)}
          GROUP BY ${groupBy}
          ORDER BY ${orderBy}
          LIMIT 20
        `;
        
        console.log('📊 Fallback query:', fallbackQuery);
        const fallbackResult = await db.query(fallbackQuery, hasDateCondition ? dateParams : []);
        revenueData = fallbackResult.rows;
        console.log(`✅ Revenue data from policy premiums: ${revenueData.length} records`);
      } catch (fallbackError) {
        console.log('⚠️ All revenue queries failed:', fallbackError.message);
        revenueData = [];
      }
    }

    // Get plan distribution - CORRECTED
    console.log('📊 Getting plan distribution...');
    let distribution = [];
    try {
      const distributionQuery = `
        SELECT 
          COALESCE(pp.plan_name, 'Unknown Plan') as name,
          COUNT(p.policy_id)::integer as value
        FROM policy p
        LEFT JOIN policy_plans pp ON p.policy_type = pp.policy_type
        GROUP BY pp.plan_name
        ORDER BY value DESC
        LIMIT 10
      `;
      
      console.log('Distribution query:', distributionQuery);
      const distributionResult = await db.query(distributionQuery);
      distribution = distributionResult.rows;
      console.log(`✅ Distribution data fetched: ${distribution.length} plans`);
    } catch (error) {
      console.log('⚠️ Distribution query failed:', error.message);
      distribution = [];
    }

    // Get recent activity - COMPLETELY FIXED based on YOUR SCHEMA
    console.log('📊 Getting recent activity...');
    let activity = [];
    try {
      // FIXED: Using correct column names from YOUR audit_log, customer, agent, admin tables
      const activityQuery = `
        SELECT 
          a.action as description,
          a.timestamp as created_at,
          a.entity as entity_type,
          CASE 
            WHEN a.user_type = 'customer' THEN CONCAT(c.first_name, ' ', c.last_name)
            WHEN a.user_type = 'agent' THEN CONCAT(ag.first_name, ' ', ag.last_name)
            WHEN a.user_type = 'admin' THEN ad.full_name
            ELSE 'System User'
          END as user_name,
          a.user_type
        FROM audit_log a
        LEFT JOIN customer c ON a.user_id::text = c.customer_id::text AND a.user_type = 'customer'
        LEFT JOIN agent ag ON a.user_id::text = ag.agent_id::text AND a.user_type = 'agent'
        LEFT JOIN admin ad ON a.user_id::text = ad.admin_id::text AND a.user_type = 'admin'
        ORDER BY a.timestamp DESC
        LIMIT 10
      `;
      
      console.log('📊 Activity query:', activityQuery.substring(0, 150) + '...');
      const activityResult = await db.query(activityQuery);
      
      activity = activityResult.rows.map(row => ({
        description: row.description || 'Unknown action',
        user_name: row.user_name || 'Unknown User',
        entity_type: row.entity_type || 'system',
        created_at: row.created_at || new Date().toISOString()
      }));
      
      console.log(`✅ Activity data fetched: ${activity.length} records`);
    } catch (error) {
      console.log('⚠️ Activity query failed:', error.message);
      
      // Simple fallback
      try {
        const simpleQuery = `
          SELECT 
            action as description,
            timestamp as created_at,
            entity as entity_type,
            user_type
          FROM audit_log
          ORDER BY timestamp DESC
          LIMIT 5
        `;
        const simpleResult = await db.query(simpleQuery);
        activity = simpleResult.rows.map(row => ({
          description: row.description,
          user_name: row.user_type,
          entity_type: row.entity_type,
          created_at: row.created_at
        }));
        console.log('✅ Simple activity data fetched');
      } catch (simpleError) {
        console.log('⚠️ Simple activity query failed:', simpleError.message);
        activity = [];
      }
    }

    const responseData = {
      success: true,
      data: {
        metrics,
        trends: {
          userGrowth,
          revenueData
        },
        distribution,
        activity
      }
    };

    console.log('✅ Analytics data prepared successfully');
    res.json(responseData);

  } catch (error) {
    console.error('❌ Analytics API error:', error.message);
    
    // Return empty data on error
    res.status(500).json({
      success: false,
      error: error.message,
      data: {
        metrics: {
          total_customers: 0,
          total_agents: 0,
          total_admins: 0,
          total_revenue: 0,
          active_claims: 0,
          avg_claim_time: 0,
          total_policies: 0,
          total_commission: 0
        },
        trends: {
          userGrowth: [],
          revenueData: []
        },
        distribution: [],
        activity: []
      }
    });
  }
});

// Test connection route - FIXED
router.get('/test-connection', async (req, res) => {
  try {
    // Test basic queries
    const customerCount = await db.query('SELECT COUNT(*) as count FROM customer');
    const policyCount = await db.query('SELECT COUNT(*) as count FROM policy');
    const agentCount = await db.query('SELECT COUNT(*) as count FROM agent');
    const paymentCount = await db.query('SELECT COUNT(*) as count FROM payment');
    const auditLogCount = await db.query('SELECT COUNT(*) as count FROM audit_log');
    
    res.json({
      success: true,
      connections: {
        customer: parseInt(customerCount.rows[0].count),
        policy: parseInt(policyCount.rows[0].count),
        agent: parseInt(agentCount.rows[0].count),
        payment: parseInt(paymentCount.rows[0].count),
        audit_log: parseInt(auditLogCount.rows[0].count),
        database: 'Connected successfully'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Schema check route - NEW
router.get('/schema-check', async (req, res) => {
  try {
    // Check if critical columns exist
    const checks = await Promise.all([
      db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='customer' AND column_name='created_at'`),
      db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='policy' AND column_name='created_at'`),
      db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='payment' AND column_name='paid_at'`),
      db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='claim' AND column_name='filing_date'`),
      db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='audit_log' AND column_name='timestamp'`)
    ]);
    
    const results = {
      customer_created_at: checks[0].rows.length > 0,
      policy_created_at: checks[1].rows.length > 0,
      payment_paid_at: checks[2].rows.length > 0,
      claim_filing_date: checks[3].rows.length > 0,
      audit_log_timestamp: checks[4].rows.length > 0
    };
    
    res.json({
      success: true,
      schema: results,
      message: 'Schema check completed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;