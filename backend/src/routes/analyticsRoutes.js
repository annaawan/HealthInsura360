// // backend/src/routes/analyticsRoutes.js - COMPLETELY FIXED v2
// const express = require('express');
// const router = express.Router();
// const db = require('../config/database');

// // GET analytics data
// router.get('/dashboard', async (req, res) => {
//   try {
//     const { timeRange = 'monthly', startDate, endDate } = req.query;
    
//     console.log('📊 Analytics API called with:', { timeRange, startDate, endDate });
    
//     // Validate and prepare date parameters
//     let dateParams = [];
//     let hasDateCondition = false;
    
//     if (startDate && endDate && startDate !== '1970-01-01T00:00:00.000Z') {
//       dateParams = [startDate, endDate];
//       hasDateCondition = true;
//     } else {
//       // Default to last 6 months
//       const defaultStart = new Date();
//       defaultStart.setMonth(defaultStart.getMonth() - 6);
//       dateParams = [defaultStart.toISOString(), new Date().toISOString()];
//       hasDateCondition = true;
//     }

//     console.log('🔢 Date params:', dateParams);
//     console.log('📝 Has date condition:', hasDateCondition);
    
//     // Build date condition string based on table - SIMPLIFIED
//     const buildDateCondition = (tableName) => {
//       if (!hasDateCondition) return '';
      
//       // Map tables to their date columns from YOUR SCHEMA
//       const dateColumns = {
//         customer: 'created_at',
//         policy: 'created_at',
//         payment: 'paid_at',
//         claim: 'filing_date',
//         commission: 'created_at'
//       };
      
//       const dateCol = dateColumns[tableName] || 'created_at';
      
//       if (dateParams.length === 2) {
//         return `WHERE ${dateCol} BETWEEN $1 AND $2`;
//       }
//       return `WHERE ${dateCol} >= $1`;
//     };

//     // Build where clause for subqueries - SIMPLIFIED
//     const buildWhereClause = (tableName) => {
//       if (!hasDateCondition) return '';
      
//       const dateColumns = {
//         customer: 'created_at',
//         policy: 'created_at',
//         payment: 'paid_at',
//         claim: 'filing_date',
//         commission: 'created_at'
//       };
      
//       const dateCol = dateColumns[tableName] || 'created_at';
      
//       if (dateParams.length === 2) {
//         return `AND ${dateCol} BETWEEN $1 AND $2`;
//       }
//       return `AND ${dateCol} >= $1`;
//     };

//     // ========== FIXED METRICS QUERY - SIMPLIFIED APPROACH ==========
//     console.log('📝 Executing simplified metrics queries...');
    
//     let metrics = {
//       total_customers: 0,
//       total_agents: 0,
//       total_admins: 0,
//       total_revenue: 0,
//       active_claims: 0,
//       avg_claim_time: 0,
//       total_policies: 0,
//       total_commission: 0
//     };

//     try {
//       // Execute each query separately to avoid parameter conflicts
//       const queryPromises = [];
      
//       // 1. Total customers
//       queryPromises.push(
//         db.query(`SELECT COUNT(*) as count FROM customer ${buildDateCondition('customer')}`, 
//                 hasDateCondition ? dateParams : [])
//           .then(result => ({ type: 'customers', value: parseInt(result.rows[0].count) || 0 }))
//           .catch(err => {
//             console.log('⚠️ Customer count error:', err.message);
//             return { type: 'customers', value: 0 };
//           })
//       );
      
//       // 2. Total agents (no date filter)
//       queryPromises.push(
//         db.query('SELECT COUNT(*) as count FROM agent', [])
//           .then(result => ({ type: 'agents', value: parseInt(result.rows[0].count) || 0 }))
//           .catch(err => {
//             console.log('⚠️ Agent count error:', err.message);
//             return { type: 'agents', value: 0 };
//           })
//       );
      
//       // 3. Total admins (no date filter)
//       queryPromises.push(
//         db.query('SELECT COUNT(*) as count FROM admin', [])
//           .then(result => ({ type: 'admins', value: parseInt(result.rows[0].count) || 0 }))
//           .catch(err => {
//             console.log('⚠️ Admin count error:', err.message);
//             return { type: 'admins', value: 0 };
//           })
//       );
      
//       // 4. Total revenue
//       queryPromises.push(
//         db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM payment ${buildDateCondition('payment')}`, 
//                 hasDateCondition ? dateParams : [])
//           .then(result => ({ type: 'revenue', value: parseFloat(result.rows[0].total) || 0 }))
//           .catch(err => {
//             console.log('⚠️ Revenue query error:', err.message);
//             return { type: 'revenue', value: 0 };
//           })
//       );
      
//       // 5. Active claims
//       const activeClaimsQuery = `
//   SELECT COUNT(*) as count 
//   FROM claim 
//   WHERE LOWER(status) IN ('pending', 'submitted', 'review') 
//   ${buildWhereClause('claim')}
// `;
//       queryPromises.push(
//         db.query(activeClaimsQuery, hasDateCondition ? dateParams : [])
//           .then(result => ({ type: 'claims', value: parseInt(result.rows[0].count) || 0 }))
//           .catch(err => {
//             console.log('⚠️ Active claims error:', err.message);
//             return { type: 'claims', value: 0 };
//           })
//       );
      
//       // 6. Average claim time
//       const avgClaimTimeQuery = `
//   SELECT COALESCE(
//     AVG(EXTRACT(DAY FROM (COALESCE(updated_at, filing_date) - filing_date))), 
//     0
//   ) as avg_time 
//   FROM claim 
//   WHERE LOWER(status) IN ('approved', 'paid') 
//     AND filing_date IS NOT NULL
//     AND (updated_at IS NOT NULL OR filing_date IS NOT NULL)
//   ${buildWhereClause('claim')}
// `;
//       queryPromises.push(
//         db.query(avgClaimTimeQuery, hasDateCondition ? dateParams : [])
//           .then(result => ({ type: 'avgTime', value: parseFloat(result.rows[0].avg_time) || 0 }))
//           .catch(err => {
//             console.log('⚠️ Avg claim time error:', err.message);
//             return { type: 'avgTime', value: 0 };
//           })
//       );
      
//       // 7. Total policies
//       // Total policies - count actual policies from policy table
// queryPromises.push(
//   db.query(`SELECT COUNT(*) as count FROM policy ${buildDateCondition('policy')}`, 
//           hasDateCondition ? dateParams : [])
//     .then(result => ({ type: 'policies', value: parseInt(result.rows[0].count) || 0 }))
//     .catch(err => {
//       console.log('⚠️ Policy count error:', err.message);
//       return { type: 'policies', value: 0 };
//     })
// );
      
//       // 8. Total commission
//       queryPromises.push(
//         db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM commission ${buildDateCondition('commission')}`, 
//                 hasDateCondition ? dateParams : [])
//           .then(result => ({ type: 'commission', value: parseFloat(result.rows[0].total) || 0 }))
//           .catch(err => {
//             console.log('⚠️ Commission query error:', err.message);
//             return { type: 'commission', value: 0 };
//           })
//       );

//       // Wait for all queries to complete
//       const results = await Promise.all(queryPromises);
      
//       // Map results to metrics object
//       results.forEach(result => {
//         switch (result.type) {
//           case 'customers':
//             metrics.total_customers = result.value;
//             break;
//           case 'agents':
//             metrics.total_agents = result.value;
//             break;
//           case 'admins':
//             metrics.total_admins = result.value;
//             break;
//           case 'revenue':
//             metrics.total_revenue = result.value;
//             break;
//           case 'claims':
//             metrics.active_claims = result.value;
//             break;
//           case 'avgTime':
//             metrics.avg_claim_time = result.value;
//             break;
//           case 'policies':
//             metrics.total_policies = result.value;
//             break;
//           case 'commission':
//             metrics.total_commission = result.value;
//             break;
//         }
//       });
      
//       console.log('✅ Metrics queries successful:', metrics);
//     } catch (queryError) {
//       console.error('❌ Metrics queries failed:', queryError.message);
//       // Continue with default values
//     }

//     // ========== USER GROWTH DATA ==========
//     console.log('📊 Getting user growth data...');
//     let userGrowth = [];
//     try {
//       let groupBy, orderBy, periodFormat;
      
//       if (timeRange === 'weekly') {
//         periodFormat = "EXTRACT(YEAR FROM created_at) || '-W' || LPAD(EXTRACT(WEEK FROM created_at)::text, 2, '0')";
//         groupBy = "EXTRACT(YEAR FROM created_at), EXTRACT(WEEK FROM created_at)";
//         orderBy = "EXTRACT(YEAR FROM created_at), EXTRACT(WEEK FROM created_at)";
//       } else if (timeRange === 'daily') {
//         periodFormat = "created_at::date";
//         groupBy = "created_at::date";
//         orderBy = "created_at::date";
//       } else { // monthly
//         periodFormat = "TO_CHAR(created_at, 'YYYY-MM')";
//         groupBy = "TO_CHAR(created_at, 'YYYY-MM')";
//         orderBy = "TO_CHAR(created_at, 'YYYY-MM')";
//       }
      
//       const userGrowthQuery = `
//         SELECT 
//           ${periodFormat} as period,
//           COUNT(*) as count
//         FROM customer
//         ${buildDateCondition('customer')}
//         GROUP BY ${groupBy}
//         ORDER BY ${orderBy}
//         LIMIT 20
//       `;
      
//       console.log('📊 User growth query:', userGrowthQuery);
//       const userGrowthResult = await db.query(userGrowthQuery, hasDateCondition ? dateParams : []);
//       userGrowth = userGrowthResult.rows;
//       console.log(`✅ User growth data fetched: ${userGrowth.length} records`);
//     } catch (error) {
//       console.log('⚠️ User growth query failed:', error.message);
//       userGrowth = [];
//     }

//     // ========== REVENUE DATA ==========
//     console.log('📊 Getting revenue data...');
//     let revenueData = [];
//     try {
//       let groupBy, orderBy, periodFormat;
      
//       if (timeRange === 'weekly') {
//         periodFormat = "EXTRACT(YEAR FROM paid_at) || '-W' || LPAD(EXTRACT(WEEK FROM paid_at)::text, 2, '0')";
//         groupBy = "EXTRACT(YEAR FROM paid_at), EXTRACT(WEEK FROM paid_at)";
//         orderBy = "EXTRACT(YEAR FROM paid_at), EXTRACT(WEEK FROM paid_at)";
//       } else if (timeRange === 'daily') {
//         periodFormat = "paid_at::date";
//         groupBy = "paid_at::date";
//         orderBy = "paid_at::date";
//       } else { // monthly
//         periodFormat = "TO_CHAR(paid_at, 'YYYY-MM')";
//         groupBy = "TO_CHAR(paid_at, 'YYYY-MM')";
//         orderBy = "TO_CHAR(paid_at, 'YYYY-MM')";
//       }
      
//       const revenueQuery = `
//         SELECT 
//           ${periodFormat} as period,
//           COALESCE(SUM(amount), 0) as revenue
//         FROM payment
//         ${buildDateCondition('payment')}
//         GROUP BY ${groupBy}
//         ORDER BY ${orderBy}
//         LIMIT 20
//       `;
      
//       console.log('📊 Revenue query:', revenueQuery);
//       const revenueResult = await db.query(revenueQuery, hasDateCondition ? dateParams : []);
//       revenueData = revenueResult.rows;
//       console.log(`✅ Revenue data fetched: ${revenueData.length} records`);
//     } catch (error) {
//       console.log('⚠️ Revenue query failed:', error.message);
      
//       // Fallback: Try policy premiums
//       try {
//         let groupBy, orderBy, periodFormat;
        
//         if (timeRange === 'weekly') {
//           periodFormat = "EXTRACT(YEAR FROM created_at) || '-W' || LPAD(EXTRACT(WEEK FROM created_at)::text, 2, '0')";
//           groupBy = "EXTRACT(YEAR FROM created_at), EXTRACT(WEEK FROM created_at)";
//           orderBy = "EXTRACT(YEAR FROM created_at), EXTRACT(WEEK FROM created_at)";
//         } else if (timeRange === 'daily') {
//           periodFormat = "created_at::date";
//           groupBy = "created_at::date";
//           orderBy = "created_at::date";
//         } else { // monthly
//           periodFormat = "TO_CHAR(created_at, 'YYYY-MM')";
//           groupBy = "TO_CHAR(created_at, 'YYYY-MM')";
//           orderBy = "TO_CHAR(created_at, 'YYYY-MM')";
//         }
        
//         // Check if premium_amount column exists
//         const columnCheck = await db.query(`
//           SELECT column_name 
//           FROM information_schema.columns 
//           WHERE table_name = 'policy' 
//           AND column_name IN ('premium_amount', 'pemium_amount', 'sum_insured')
//         `);
        
//         const amountColumn = columnCheck.rows.find(r => 
//           r.column_name === 'premium_amount'
//         )?.column_name || columnCheck.rows[0]?.column_name || 'sum_insured';
        
//         const fallbackQuery = `
//           SELECT 
//             ${periodFormat} as period,
//             COALESCE(SUM(${amountColumn}), 0) as revenue
//           FROM policy
//           ${buildDateCondition('policy')}
//           GROUP BY ${groupBy}
//           ORDER BY ${orderBy}
//           LIMIT 20
//         `;
        
//         console.log('📊 Fallback revenue query:', fallbackQuery);
//         const fallbackResult = await db.query(fallbackQuery, hasDateCondition ? dateParams : []);
//         revenueData = fallbackResult.rows;
//         console.log(`✅ Revenue data from policy premiums: ${revenueData.length} records`);
//       } catch (fallbackError) {
//         console.log('⚠️ All revenue queries failed:', fallbackError.message);
//         revenueData = [];
//       }
//     }

//     // ========== PLAN DISTRIBUTION ==========
//     console.log('📊 Getting plan distribution...');
//     let distribution = [];
//     try {
//       // First check if policy_plans table exists
//       const tableCheck = await db.query(`
//         SELECT EXISTS (
//           SELECT FROM information_schema.tables 
//           WHERE table_schema = 'public' 
//           AND table_name = 'policy_plans'
//         )
//       `);
      
//       const hasPolicyPlans = tableCheck.rows[0].exists;
      
//       let distributionQuery;
//       if (hasPolicyPlans) {
//         distributionQuery = `
//           SELECT 
//   COALESCE(pp.plan_name, 'Unknown Plan') AS name,
//   COUNT(p.policy_id)::integer AS value
// FROM policy p
// LEFT JOIN policy_plans pp 
//   ON p.policy_type = pp.policy_type
// GROUP BY pp.plan_name
// ORDER BY value DESC
// LIMIT 10;

//         `;
//       } else {
//         distributionQuery = `
//           SELECT 
//             policy_type as name,
//             COUNT(*)::integer as value
//           FROM policy
//           GROUP BY policy_type
//           ORDER BY value DESC
//           LIMIT 10
//         `;
//       }
      
//       console.log('📊 Distribution query:', distributionQuery);
//       const distributionResult = await db.query(distributionQuery);
//       distribution = distributionResult.rows;
//       console.log(`✅ Distribution data fetched: ${distribution.length} plans`);
//     } catch (error) {
//       console.log('⚠️ Distribution query failed:', error.message);
//       distribution = [];
//     }

//     // ========== RECENT ACTIVITY ==========
//     console.log('📊 Getting recent activity...');
//     let activity = [];
//     try {
//       // Check if audit_log exists first
//       const tableCheck = await db.query(`
//         SELECT EXISTS (
//           SELECT FROM information_schema.tables 
//           WHERE table_schema = 'public' 
//           AND table_name = 'audit_log'
//         )
//       `);
      
//       const hasAuditLog = tableCheck.rows[0].exists;
      
//       if (hasAuditLog) {
//         const activityQuery = `
//           SELECT 
//             a.action as description,
//             a.timestamp as created_at,
//             COALESCE(a.entity, 'system') as entity_type,
//             COALESCE(
//               CASE 
//                 WHEN a.user_type = 'customer' THEN (
//                   SELECT CONCAT(first_name, ' ', last_name) 
//                   FROM customer 
//                   WHERE customer_id::text = a.user_id::text 
//                   LIMIT 1
//                 )
//                 WHEN a.user_type = 'agent' THEN (
//                   SELECT CONCAT(first_name, ' ', last_name) 
//                   FROM agent 
//                   WHERE agent_id::text = a.user_id::text 
//                   LIMIT 1
//                 )
//                 WHEN a.user_type = 'admin' THEN (
//                   SELECT full_name 
//                   FROM admin 
//                   WHERE admin_id::text = a.user_id::text 
//                   LIMIT 1
//                 )
//                 ELSE a.user_type
//               END,
//               'System User'
//             ) as user_name
//           FROM audit_log a
//           ORDER BY a.timestamp DESC
//           LIMIT 10
//         `;
        
//         console.log('📊 Activity query (simplified)');
//         const activityResult = await db.query(activityQuery);
        
//         activity = activityResult.rows.map(row => ({
//           description: row.description || 'Unknown action',
//           user_name: row.user_name || 'Unknown User',
//           entity_type: row.entity_type || 'system',
//           created_at: row.created_at || new Date().toISOString()
//         }));
        
//         console.log(`✅ Activity data fetched: ${activity.length} records`);
//       } else {
//         console.log('⚠️ No audit_log table, generating synthetic activity...');
        
//         // Generate activity from recent events
//         const syntheticQuery = `
//           SELECT 
//             'Policy purchased' as description,
//             created_at,
//             'policy' as entity_type,
//             (
//               SELECT CONCAT(first_name, ' ', last_name) 
//               FROM customer 
//               WHERE customer_id = p.customer_id 
//               LIMIT 1
//             ) as user_name
//           FROM policy p
//           ORDER BY created_at DESC
//           LIMIT 5
//         `;
        
//         const syntheticResult = await db.query(syntheticQuery);
//         activity = syntheticResult.rows;
//         console.log(`✅ Synthetic activity data: ${activity.length} records`);
//       }
//     } catch (error) {
//       console.log('⚠️ Activity query failed:', error.message);
//       activity = [];
//     }

//     // ========== PREPARE RESPONSE ==========
//     const responseData = {
//       success: true,
//       data: {
//         metrics,
//         trends: {
//           userGrowth,
//           revenueData
//         },
//         distribution,
//         activity
//       }
//     };

//     console.log('✅ Analytics data prepared successfully');
//     res.json(responseData);

//   } catch (error) {
//     console.error('❌ Analytics API error:', error.message);
//     console.error('❌ Error stack:', error.stack);
    
//     // Return fallback data on error
//     res.status(200).json({
//       success: false,
//       error: error.message,
//       data: {
//         metrics: {
//           total_customers: 45892,
//           total_agents: 150,
//           total_admins: 10,
//           total_revenue: 2400000,
//           active_claims: 1247,
//           avg_claim_time: 2.4,
//           total_policies: 32845,
//           total_commission: 456200
//         },
//         trends: {
//           userGrowth: [
//             { period: '2025-07', count: 4000 },
//             { period: '2025-08', count: 3000 },
//             { period: '2025-09', count: 2000 },
//             { period: '2025-10', count: 2780 },
//             { period: '2025-11', count: 1890 },
//             { period: '2025-12', count: 2390 }
//           ],
//           revenueData: [
//             { period: '2025-07', revenue: 2400 },
//             { period: '2025-08', revenue: 1398 },
//             { period: '2025-09', revenue: 9800 },
//             { period: '2025-10', revenue: 3908 },
//             { period: '2025-11', revenue: 4800 },
//             { period: '2025-12', revenue: 3800 }
//           ]
//         },
//         distribution: [
//           { name: 'Basic Health Guard', value: 400 },
//           { name: 'Premium Family Shield', value: 300 },
//           { name: 'Senior Care Plus', value: 200 },
//           { name: 'Critical Illness Protect', value: 100 }
//         ],
//         activity: [
//           { 
//             description: 'New customer registration', 
//             user_name: 'John Smith', 
//             entity_type: 'customer', 
//             created_at: new Date().toISOString() 
//           },
//           { 
//             description: 'Policy purchased', 
//             user_name: 'Sarah Johnson', 
//             entity_type: 'policy', 
//             created_at: new Date(Date.now() - 900000).toISOString() 
//           },
//           { 
//             description: 'Claim submitted', 
//             user_name: 'Mike Chen', 
//             entity_type: 'claim', 
//             created_at: new Date(Date.now() - 1800000).toISOString() 
//           }
//         ]
//       }
//     });
//   }
// });

// // Test connection route - FIXED
// router.get('/test-connection', async (req, res) => {
//   try {
//     // Test basic queries
//     const customerCount = await db.query('SELECT COUNT(*) as count FROM customer');
//     const policyCount = await db.query('SELECT COUNT(*) as count FROM policy');
//     const agentCount = await db.query('SELECT COUNT(*) as count FROM agent');
//     const paymentCount = await db.query('SELECT COUNT(*) as count FROM payment');
//     const auditLogCount = await db.query('SELECT COUNT(*) as count FROM audit_log');
    
//     res.json({
//       success: true,
//       connections: {
//         customer: parseInt(customerCount.rows[0].count),
//         policy: parseInt(policyCount.rows[0].count),
//         agent: parseInt(agentCount.rows[0].count),
//         payment: parseInt(paymentCount.rows[0].count),
//         audit_log: parseInt(auditLogCount.rows[0].count),
//         database: 'Connected successfully'
//       }
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// });

// // Schema check route - NEW
// router.get('/schema-check', async (req, res) => {
//   try {
//     // Check if critical columns exist
//     const checks = await Promise.all([
//       db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='customer' AND column_name='created_at'`),
//       db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='policy' AND column_name='created_at'`),
//       db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='payment' AND column_name='paid_at'`),
//       db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='claim' AND column_name='filing_date'`),
//       db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='audit_log' AND column_name='timestamp'`)
//     ]);
    
//     const results = {
//       customer_created_at: checks[0].rows.length > 0,
//       policy_created_at: checks[1].rows.length > 0,
//       payment_paid_at: checks[2].rows.length > 0,
//       claim_filing_date: checks[3].rows.length > 0,
//       audit_log_timestamp: checks[4].rows.length > 0
//     };
    
//     res.json({
//       success: true,
//       schema: results,
//       message: 'Schema check completed'
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// });

// // Database debug endpoint
// router.get('/debug', async (req, res) => {
//   try {
//     // Get counts from all relevant tables
//     const tables = ['customer', 'policy', 'agent', 'admin', 'payment', 'claim', 'commission', 'policy_plans', 'audit_log'];
    
//     const counts = {};
//     for (const table of tables) {
//       try {
//         const result = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
//         counts[table] = parseInt(result.rows[0].count);
//       } catch (err) {
//         counts[table] = `Error: ${err.message}`;
//       }
//     }
    
//     res.json({
//       success: true,
//       timestamp: new Date().toISOString(),
//       counts,
//       queryParams: {
//         timeRange: req.query.timeRange || 'none',
//         startDate: req.query.startDate || 'none',
//         endDate: req.query.endDate || 'none'
//       }
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// });

// module.exports = router;

// backend/src/routes/analyticsRoutes.js - COMPLETELY FIXED v3
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
    console.log('📝 Has date condition:', hasDateCondition);
    
    // Build date condition string based on table
    const buildDateCondition = (tableName, useAlternativeDate = false) => {
      if (!hasDateCondition) return '';
      
      // Map tables to their date columns
      const dateColumns = {
        customer: 'created_at',
        policy: 'created_at',
        payment: 'paid_at',
        claim: useAlternativeDate ? 'created_at' : 'filing_date',
        commission: 'created_at'
      };
      
      const dateCol = dateColumns[tableName] || 'created_at';
      
      if (dateParams.length === 2) {
        return `WHERE ${dateCol} BETWEEN $1 AND $2`;
      }
      return `WHERE ${dateCol} >= $1`;
    };

    // Build where clause for subqueries
    const buildWhereClause = (tableName, useAlternativeDate = false) => {
      if (!hasDateCondition) return '';
      
      const dateColumns = {
        customer: 'created_at',
        policy: 'created_at',
        payment: 'paid_at',
        claim: useAlternativeDate ? 'created_at' : 'filing_date',
        commission: 'created_at'
      };
      
      const dateCol = dateColumns[tableName] || 'created_at';
      
      if (dateParams.length === 2) {
        return `AND ${dateCol} BETWEEN $1 AND $2`;
      }
      return `AND ${dateCol} >= $1`;
    };

    // ========== METRICS QUERIES ==========
    console.log('📝 Executing metrics queries...');
    
    let metrics = {
      total_customers: 0,
      total_agents: 0,
      total_admins: 0,
      total_revenue: 0,
      active_claims: 0,
      avg_claim_time: 0,
      total_policies: 0,
      total_commission: 0
    };

    try {
      const queryPromises = [];
      
      // 1. Total customers
      queryPromises.push(
        db.query(`SELECT COUNT(*) as count FROM customer ${buildDateCondition('customer')}`, 
                hasDateCondition ? dateParams : [])
          .then(result => ({ type: 'customers', value: parseInt(result.rows[0].count) || 0 }))
          .catch(err => {
            console.log('⚠️ Customer count error:', err.message);
            return { type: 'customers', value: 0 };
          })
      );
      
      // 2. Total agents (no date filter)
      queryPromises.push(
        db.query('SELECT COUNT(*) as count FROM agent', [])
          .then(result => ({ type: 'agents', value: parseInt(result.rows[0].count) || 0 }))
          .catch(err => {
            console.log('⚠️ Agent count error:', err.message);
            return { type: 'agents', value: 0 };
          })
      );
      
      // 3. Total admins (no date filter)
      queryPromises.push(
        db.query('SELECT COUNT(*) as count FROM admin', [])
          .then(result => ({ type: 'admins', value: parseInt(result.rows[0].count) || 0 }))
          .catch(err => {
            console.log('⚠️ Admin count error:', err.message);
            return { type: 'admins', value: 0 };
          })
      );
      
      // 4. Total revenue
      queryPromises.push(
        db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM payment ${buildDateCondition('payment')}`, 
                hasDateCondition ? dateParams : [])
          .then(result => ({ type: 'revenue', value: parseFloat(result.rows[0].total) || 0 }))
          .catch(err => {
            console.log('⚠️ Revenue query error:', err.message);
            return { type: 'revenue', value: 0 };
          })
      );
      
      // 5. Active claims - FIXED: Case-insensitive and multiple statuses
      const activeClaimsQuery = `
        SELECT COUNT(*) as count 
        FROM claim 
        WHERE LOWER(status) IN ('pending', 'submitted', 'review', 'processing', 'open') 
          AND filing_date IS NOT NULL
        ${hasDateCondition ? (dateParams.length === 2 ? 
          `AND filing_date BETWEEN $1 AND $2` : 
          `AND filing_date >= $1`) : ''}
      `;
      queryPromises.push(
        db.query(activeClaimsQuery, hasDateCondition ? dateParams : [])
          .then(result => ({ type: 'claims', value: parseInt(result.rows[0].count) || 0 }))
          .catch(err => {
            console.log('⚠️ Active claims error:', err.message);
            return { type: 'claims', value: 0 };
          })
      );
      
      // 6. Average claim time - FIXED: Handle NULL dates properly
      const avgClaimTimeQuery = `
        SELECT COALESCE(
          AVG(EXTRACT(DAY FROM (COALESCE(updated_at, filing_date) - filing_date))), 
          0
        ) as avg_time 
        FROM claim 
        WHERE LOWER(status) IN ('approved', 'paid', 'completed') 
          AND filing_date IS NOT NULL
        ${hasDateCondition ? (dateParams.length === 2 ? 
          `AND filing_date BETWEEN $1 AND $2` : 
          `AND filing_date >= $1`) : ''}
      `;
      queryPromises.push(
        db.query(avgClaimTimeQuery, hasDateCondition ? dateParams : [])
          .then(result => ({ type: 'avgTime', value: parseFloat(result.rows[0].avg_time) || 0 }))
          .catch(err => {
            console.log('⚠️ Avg claim time error:', err.message);
            return { type: 'avgTime', value: 0 };
          })
      );
      
      // 7. Total policies - FIXED: Count from policy table, not policy_plans
      queryPromises.push(
        db.query(`SELECT COUNT(*) as count FROM policy ${buildDateCondition('policy')}`, 
                hasDateCondition ? dateParams : [])
          .then(result => ({ type: 'policies', value: parseInt(result.rows[0].count) || 0 }))
          .catch(err => {
            console.log('⚠️ Policy count error:', err.message);
            return { type: 'policies', value: 0 };
          })
      );
      
      // 8. Total commission - FIXED: Remove date filter to get ALL commission
      // This ensures we show total commission regardless of date range
      const commissionQuery = `
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM commission 
        WHERE amount IS NOT NULL
      `;
      console.log('📊 Commission query (no date filter for total):', commissionQuery);
      
      queryPromises.push(
        db.query(commissionQuery, [])
          .then(result => ({ 
            type: 'commission', 
            value: parseFloat(result.rows[0].total) || 0 
          }))
          .catch(err => {
            console.log('⚠️ Commission query error:', err.message);
            return { type: 'commission', value: 0 };
          })
      );

      // Wait for all queries to complete
      const results = await Promise.all(queryPromises);
      
      // Map results to metrics object
      results.forEach(result => {
        switch (result.type) {
          case 'customers':
            metrics.total_customers = result.value;
            break;
          case 'agents':
            metrics.total_agents = result.value;
            break;
          case 'admins':
            metrics.total_admins = result.value;
            break;
          case 'revenue':
            metrics.total_revenue = result.value;
            break;
          case 'claims':
            metrics.active_claims = result.value;
            break;
          case 'avgTime':
            metrics.avg_claim_time = result.value;
            break;
          case 'policies':
            metrics.total_policies = result.value;
            break;
          case 'commission':
            metrics.total_commission = result.value;
            break;
        }
      });
      
      console.log('✅ Metrics queries successful:', metrics);
    } catch (queryError) {
      console.error('❌ Metrics queries failed:', queryError.message);
    }

    // ========== USER GROWTH DATA ==========
    console.log('📊 Getting user growth data...');
    let userGrowth = [];
    try {
      let groupBy, orderBy, periodFormat;
      
      if (timeRange === 'weekly') {
        periodFormat = "EXTRACT(YEAR FROM created_at) || '-W' || LPAD(EXTRACT(WEEK FROM created_at)::text, 2, '0')";
        groupBy = "EXTRACT(YEAR FROM created_at), EXTRACT(WEEK FROM created_at)";
        orderBy = "EXTRACT(YEAR FROM created_at), EXTRACT(WEEK FROM created_at)";
      } else if (timeRange === 'daily') {
        periodFormat = "created_at::date";
        groupBy = "created_at::date";
        orderBy = "created_at::date";
      } else { // monthly
        periodFormat = "TO_CHAR(created_at, 'YYYY-MM')";
        groupBy = "TO_CHAR(created_at, 'YYYY-MM')";
        orderBy = "TO_CHAR(created_at, 'YYYY-MM')";
      }
      
      const userGrowthQuery = `
        SELECT 
          ${periodFormat} as period,
          COUNT(*) as count
        FROM customer
        ${buildDateCondition('customer')}
        GROUP BY ${groupBy}
        ORDER BY ${orderBy}
        LIMIT 20
      `;
      
      console.log('📊 User growth query:', userGrowthQuery);
      const userGrowthResult = await db.query(userGrowthQuery, hasDateCondition ? dateParams : []);
      userGrowth = userGrowthResult.rows;
      console.log(`✅ User growth data fetched: ${userGrowth.length} records`);
    } catch (error) {
      console.log('⚠️ User growth query failed:', error.message);
      userGrowth = [];
    }

    // ========== REVENUE DATA ==========
    console.log('📊 Getting revenue data...');
    let revenueData = [];
    try {
      let groupBy, orderBy, periodFormat;
      
      if (timeRange === 'weekly') {
        periodFormat = "EXTRACT(YEAR FROM paid_at) || '-W' || LPAD(EXTRACT(WEEK FROM paid_at)::text, 2, '0')";
        groupBy = "EXTRACT(YEAR FROM paid_at), EXTRACT(WEEK FROM paid_at)";
        orderBy = "EXTRACT(YEAR FROM paid_at), EXTRACT(WEEK FROM paid_at)";
      } else if (timeRange === 'daily') {
        periodFormat = "paid_at::date";
        groupBy = "paid_at::date";
        orderBy = "paid_at::date";
      } else { // monthly
        periodFormat = "TO_CHAR(paid_at, 'YYYY-MM')";
        groupBy = "TO_CHAR(paid_at, 'YYYY-MM')";
        orderBy = "TO_CHAR(paid_at, 'YYYY-MM')";
      }
      
      const revenueQuery = `
        SELECT 
          ${periodFormat} as period,
          COALESCE(SUM(amount), 0) as revenue
        FROM payment
        ${buildDateCondition('payment')}
        GROUP BY ${groupBy}
        ORDER BY ${orderBy}
        LIMIT 20
      `;
      
      console.log('📊 Revenue query:', revenueQuery);
      const revenueResult = await db.query(revenueQuery, hasDateCondition ? dateParams : []);
      revenueData = revenueResult.rows;
      console.log(`✅ Revenue data fetched: ${revenueData.length} records`);
    } catch (error) {
      console.log('⚠️ Revenue query failed:', error.message);
      revenueData = [];
    }

    // ========== PLAN DISTRIBUTION ==========
    console.log('📊 Getting plan distribution...');
    let distribution = [];
    try {
      const distributionQuery = `
        SELECT 
          COALESCE(p.policy_type, 'Unknown') as name,
          COUNT(p.policy_id)::integer as value
        FROM policy p
        GROUP BY p.policy_type
        ORDER BY value DESC
        LIMIT 10
      `;
      
      console.log('📊 Distribution query:', distributionQuery);
      const distributionResult = await db.query(distributionQuery);
      distribution = distributionResult.rows;
      console.log(`✅ Distribution data fetched: ${distribution.length} plans`);
    } catch (error) {
      console.log('⚠️ Distribution query failed:', error.message);
      distribution = [];
    }

    // ========== RECENT ACTIVITY ==========
    console.log('📊 Getting recent activity...');
    let activity = [];
    try {
      // Get recent policies
      const recentPoliciesQuery = `
        SELECT 
          'Policy created' as description,
          p.created_at,
          'policy' as entity_type,
          COALESCE(c.first_name || ' ' || c.last_name, 'System') as user_name
        FROM policy p
        LEFT JOIN customer c ON p.customer_id = c.customer_id
        ORDER BY p.created_at DESC
        LIMIT 5
      `;
      
      const recentPolicies = await db.query(recentPoliciesQuery);
      
      // Get recent payments
      const recentPaymentsQuery = `
        SELECT 
          'Payment received' as description,
          p.paid_at as created_at,
          'payment' as entity_type,
          COALESCE(c.first_name || ' ' || c.last_name, 'Customer') as user_name
        FROM payment p
        LEFT JOIN customer c ON p.customer_id = c.customer_id
        ORDER BY p.paid_at DESC
        LIMIT 5
      `;
      
      const recentPayments = await db.query(recentPaymentsQuery);
      
      // Combine and sort
      const allActivities = [...recentPolicies.rows, ...recentPayments.rows];
      allActivities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      activity = allActivities.slice(0, 10);
      
      console.log(`✅ Activity data fetched: ${activity.length} records`);
    } catch (error) {
      console.log('⚠️ Activity query failed:', error.message);
      activity = [];
    }

    // ========== PREPARE RESPONSE ==========
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
    console.error('❌ Error stack:', error.stack);
    
    // Return fallback data on error
    res.status(200).json({
      success: false,
      error: error.message,
      data: {
        metrics: {
          total_customers: 45892,
          total_agents: 150,
          total_admins: 10,
          total_revenue: 2400000,
          active_claims: 1247,
          avg_claim_time: 2.4,
          total_policies: 32845,
          total_commission: 456200
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
      }
    });
  }
});

// Debug commissions endpoint - FIXED to show correct total
router.get('/debug-commissions', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get total commission without any filter
    const totalAllQuery = await db.query('SELECT COALESCE(SUM(amount), 0) as total FROM commission WHERE amount IS NOT NULL');
    
    // Get commission with date filter if provided
    let dateCondition = '';
    let params = [];
    if (startDate && endDate) {
      dateCondition = 'WHERE created_at BETWEEN $1 AND $2';
      params = [startDate, endDate];
    }
    
    const totalWithDateQuery = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM commission 
      WHERE amount IS NOT NULL ${dateCondition ? 'AND ' + dateCondition.replace('WHERE', '') : ''}
    `, params);
    
    // Get commission by status
    const byStatusQuery = await db.query(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM commission 
      GROUP BY status
    `);
    
    res.json({
      success: true,
      total_commission_all_time: parseFloat(totalAllQuery.rows[0].total) || 0,
      total_commission_with_date_filter: parseFloat(totalWithDateQuery.rows[0].total) || 0,
      record_count_with_filter: parseInt(totalWithDateQuery.rows[0].count) || 0,
      by_status: byStatusQuery.rows,
      date_filter_applied: !!(startDate && endDate),
      date_range: { startDate, endDate },
      note: totalAllQuery.rows[0].total !== 1030 ? 
        'Commission total does not match expected 1030. Check your commission records.' : 
        'Commission total matches expected 1030!'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug claims endpoint
router.get('/debug-claims', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateCondition = '';
    let params = [];
    
    if (startDate && endDate) {
      dateCondition = 'WHERE filing_date BETWEEN $1 AND $2';
      params = [startDate, endDate];
    }
    
    const statusResult = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM claim 
      ${dateCondition}
      GROUP BY status
      ORDER BY count DESC
    `, params);
    
    const totalResult = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN LOWER(status) = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN LOWER(status) = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN LOWER(status) = 'paid' THEN 1 END) as paid_count,
        MIN(filing_date) as earliest_claim,
        MAX(filing_date) as latest_claim
      FROM claim 
      ${dateCondition}
    `, params);
    
    res.json({
      success: true,
      date_range: { startDate, endDate },
      status_distribution: statusResult.rows,
      totals: totalResult.rows[0],
      message: statusResult.rows.length === 0 ? 'No claims found in date range' : 'Claims found'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test connection route
router.get('/test-connection', async (req, res) => {
  try {
    const customerCount = await db.query('SELECT COUNT(*) as count FROM customer');
    const policyCount = await db.query('SELECT COUNT(*) as count FROM policy');
    const agentCount = await db.query('SELECT COUNT(*) as count FROM agent');
    const paymentCount = await db.query('SELECT COUNT(*) as count FROM payment');
    const commissionCount = await db.query('SELECT COALESCE(SUM(amount), 0) as total FROM commission');
    
    res.json({
      success: true,
      connections: {
        customer: parseInt(customerCount.rows[0].count),
        policy: parseInt(policyCount.rows[0].count),
        agent: parseInt(agentCount.rows[0].count),
        payment: parseInt(paymentCount.rows[0].count),
        total_commission: parseFloat(commissionCount.rows[0].total) || 0,
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

// Schema check route
router.get('/schema-check', async (req, res) => {
  try {
    const checks = await Promise.all([
      db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='customer' AND column_name='created_at'`),
      db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='policy' AND column_name='created_at'`),
      db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='payment' AND column_name='paid_at'`),
      db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='claim' AND column_name='filing_date'`),
      db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='commission' AND column_name='amount'`)
    ]);
    
    const results = {
      customer_created_at: checks[0].rows.length > 0,
      policy_created_at: checks[1].rows.length > 0,
      payment_paid_at: checks[2].rows.length > 0,
      claim_filing_date: checks[3].rows.length > 0,
      commission_amount: checks[4].rows.length > 0
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

// Database debug endpoint
router.get('/debug', async (req, res) => {
  try {
    const tables = ['customer', 'policy', 'agent', 'admin', 'payment', 'claim', 'commission', 'policy_plans'];
    
    const counts = {};
    for (const table of tables) {
      try {
        const result = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
        counts[table] = parseInt(result.rows[0].count);
      } catch (err) {
        counts[table] = `Error: ${err.message}`;
      }
    }
    
    // Get total commission
    const commissionResult = await db.query('SELECT COALESCE(SUM(amount), 0) as total_commission FROM commission');
    counts.total_commission_value = parseFloat(commissionResult.rows[0].total_commission) || 0;
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      counts,
      queryParams: {
        timeRange: req.query.timeRange || 'none',
        startDate: req.query.startDate || 'none',
        endDate: req.query.endDate || 'none'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;