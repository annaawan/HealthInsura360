// backend/routes/adminRoutes.js - Add this endpoint

// Get round-robin assignment statistics
router.get('/agent-assignment-stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
         a.agent_id,
         a.first_name,
         a.last_name,
         a.email,
         a.license_number,
         COALESCE(a.total_sales, 0) as total_customers,
         COUNT(c.customer_id) as actual_customers,
         a.status
       FROM agent a
       LEFT JOIN customer c ON a.agent_id = c.agent_id
       WHERE a.status = 'Active'
       GROUP BY a.agent_id, a.first_name, a.last_name, a.email, a.license_number, a.total_sales, a.status
       ORDER BY actual_customers ASC`
    );

    const totalCustomers = result.rows.reduce((sum, agent) => sum + parseInt(agent.actual_customers), 0);
    const avgCustomers = result.rows.length ? totalCustomers / result.rows.length : 0;

    res.json({
      success: true,
      stats: {
        totalAgents: result.rows.length,
        totalCustomers: totalCustomers,
        averageCustomersPerAgent: avgCustomers.toFixed(2),
        distribution: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching assignment stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});