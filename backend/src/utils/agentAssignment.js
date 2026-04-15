// backend/utils/agentAssignment.js
const db = require('../config/database');

// Get next agent using round-robin algorithm
async function getNextAgentRoundRobin() {
  try {
    // Get all active agents ordered by current load
    const agents = await db.query(
      `SELECT 
         agent_id, 
         first_name, 
         last_name,
         COALESCE(total_sales, 0) as total_sales
       FROM agent 
       WHERE status = 'Active'
       ORDER BY total_sales ASC, agent_id ASC`
    );

    if (agents.rows.length === 0) {
      console.log('⚠️ No active agents available for assignment');
      return null;
    }

    // Get the agent with the least customers (first in sorted list)
    const selectedAgent = agents.rows[0];
    
    console.log(`🔄 Round-robin selected agent: ${selectedAgent.first_name} ${selectedAgent.last_name} (ID: ${selectedAgent.agent_id}) - Current customers: ${selectedAgent.total_sales}`);
    
    return selectedAgent.agent_id;
  } catch (error) {
    console.error('Error in round-robin assignment:', error);
    return null;
  }
}

// Alternative: Track last assigned agent using a counter table
async function getNextAgentWithCounter() {
  try {
    // Create a counter table if not exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS agent_assignment_counter (
        id SERIAL PRIMARY KEY,
        last_agent_id INTEGER,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Get all active agents
    const agents = await db.query(
      `SELECT agent_id FROM agent WHERE status = 'Active' ORDER BY agent_id`
    );

    if (agents.rows.length === 0) {
      return null;
    }

    // Get last assigned agent
    const lastAssignment = await db.query(
      `SELECT last_agent_id FROM agent_assignment_counter LIMIT 1`
    );

    let nextAgentIndex = 0;
    
    if (lastAssignment.rows.length > 0 && lastAssignment.rows[0].last_agent_id) {
      // Find index of last assigned agent
      const lastAgentId = lastAssignment.rows[0].last_agent_id;
      const lastIndex = agents.rows.findIndex(a => a.agent_id === lastAgentId);
      nextAgentIndex = (lastIndex + 1) % agents.rows.length;
      
      // Update counter with new last agent
      await db.query(
        `UPDATE agent_assignment_counter SET last_agent_id = $1, updated_at = NOW()`,
        [agents.rows[nextAgentIndex].agent_id]
      );
    } else {
      // First assignment - insert counter
      await db.query(
        `INSERT INTO agent_assignment_counter (last_agent_id) VALUES ($1)`,
        [agents.rows[0].agent_id]
      );
    }

    const selectedAgent = agents.rows[nextAgentIndex];
    console.log(`🔄 Round-robin (counter) selected agent ID: ${selectedAgent.agent_id}`);
    
    return selectedAgent.agent_id;
  } catch (error) {
    console.error('Error in counter-based round-robin:', error);
    return null;
  }
}

module.exports = { 
  getNextAgentRoundRobin,
  getNextAgentWithCounter
};