const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET all insurance plans (customers + admin can view)
router.get('/', authenticate, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT * FROM insurance_plans 
            WHERE is_active = true 
            ORDER BY premium_amount
        `);
        
        res.json({
            success: true,
            plans: result.rows
        });
    } catch (error) {
        console.error('Error fetching insurance plans:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch insurance plans'
        });
    }
});

// CREATE new insurance plan (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const {
            plan_name,
            plan_type,
            description,
            premium_amount,
            coverage_amount,
            deductible,
            is_active
        } = req.body;

        const result = await db.query(`
            INSERT INTO insurance_plans (
                plan_name, plan_type, description, 
                premium_amount, coverage_amount, deductible, is_active,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            RETURNING *
        `, [plan_name, plan_type, description, premium_amount, coverage_amount, deductible || 0, is_active !== false]);

        res.status(201).json({
            success: true,
            message: 'Insurance plan created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating insurance plan:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create insurance plan',
            error: error.message
        });
    }
});

// UPDATE insurance plan (admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            plan_name,
            plan_type,
            description,
            premium_amount,
            coverage_amount,
            deductible,
            is_active
        } = req.body;

        const result = await db.query(`
            UPDATE insurance_plans SET
                plan_name = $1,
                plan_type = $2,
                description = $3,
                premium_amount = $4,
                coverage_amount = $5,
                deductible = $6,
                is_active = $7,
                updated_at = NOW()
            WHERE plan_id = $8
            RETURNING *
        `, [plan_name, plan_type, description, premium_amount, coverage_amount, deductible || 0, is_active !== false, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Insurance plan not found'
            });
        }

        res.json({
            success: true,
            message: 'Insurance plan updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating insurance plan:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update insurance plan',
            error: error.message
        });
    }
});

// DELETE insurance plan (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(
            'DELETE FROM insurance_plans WHERE plan_id = $1 RETURNING plan_id, plan_name',
            [id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Insurance plan not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Insurance plan deleted successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error deleting insurance plan:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete insurance plan',
            error: error.message
        });
    }
});

module.exports = router;