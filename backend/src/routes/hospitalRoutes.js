const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// ----------------------------------------
// GET: Fetch all hospitals
// ----------------------------------------
router.get("/hospitals", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM hospital ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching hospitals:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ----------------------------------------
// PUT: Update hospital status (verify / reject)
// ----------------------------------------
router.put("/hospitals/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  try {
    await pool.query(
      `UPDATE hospital 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [status, id]
    );

    res.json({ success: true, message: "Hospital status updated" });
  } catch (err) {
    console.error("Error updating hospital status:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
