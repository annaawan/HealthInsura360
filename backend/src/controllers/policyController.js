const db = require('../config/database');

// ✅ Add formatCurrency function for backend use
const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'Rs. 0';
    if (amount === 0) return 'FREE';
    return `Rs. ${Math.floor(amount).toLocaleString('en-PK')}`;
};
// Get customer's policies
exports.getMyPolicies = async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        
        const result = await db.query(
            `SELECT 
                p.policy_id as id,
                p.plan_id,
                'POL-' || p.policy_id::TEXT as policy_number,
                COALESCE(pp.plan_name, p.policy_type) as plan_name,
                p.policy_type,
                p.premium_amount as premium,
                COALESCE(pp.coverage_amount, p.sum_insured) as coverage_amount,
                p.start_date,
                p.end_date,
                p.status,
                p.remaining_coverage,
                p.used_coverage,
                p.created_at,
                p.no_claim_bonus,  -- ✅ ADD THIS
                p.renewal_count    -- ✅ ADD THIS
             FROM policy p
             LEFT JOIN policy_plans pp ON pp.plan_id = p.plan_id
             WHERE p.customer_id = $1
             ORDER BY p.created_at DESC`,
            [userId]
        );
        
        console.log('📋 Policies with plan_id:', result.rows.map(r => ({ id: r.id, plan_id: r.plan_id, ncb: r.no_claim_bonus, name: r.plan_name })));
        
        res.json({
            success: true,
            policies: result.rows,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Error fetching policies:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get available insurance plans (for buying)
exports.getInsurancePlans = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT 
                plan_id,
                plan_name,
                policy_type,
                description,
                premium_amount,
                coverage_amount,
                deductible,
                status,
                waiting_period_days,
                max_claim_limit
             FROM policy_plans
             WHERE status = 'active'
             ORDER BY premium_amount ASC`
        );
        
        res.json({
            success: true,
            plans: result.rows,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Purchase a new policy (after payment)
exports.purchasePolicy = async (req, res) => {
    const client = await db.pool.connect();
    const companyAccountService = require('../services/companyAccountService');
    
    try {
        const userId = req.user?.userId;
        const { planId, startDate, endDate, paymentIntentId, amount } = req.body;
        
        if (!userId || !planId) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        
        await client.query('BEGIN');
        
        // ✅ Get customer details including agent_id
        const customerResult = await client.query(
            `SELECT customer_id, agent_id FROM customer WHERE customer_id = $1 AND status = 'active'`,
            [userId]
        );
        
        if (customerResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }
        
        const customer = customerResult.rows[0];
        const assignedAgentId = customer.agent_id; // ✅ Inherit agent from customer
        
        // Get plan details
        const planResult = await client.query(
            `SELECT plan_id, plan_name, policy_type, coverage_amount, premium_amount, deductible
             FROM policy_plans WHERE plan_id = $1 AND status = 'active'`,
            [planId]
        );
        
        if (planResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Plan not found' });
        }
        
        const plan = planResult.rows[0];
        const premiumAmount = parseFloat(plan.premium_amount);
        
        // Check if customer already has active policy
        const existingResult = await client.query(
            `SELECT policy_id, status, end_date 
             FROM policy 
             WHERE customer_id = $1 AND policy_type = $2 AND status = 'active'`,
            [userId, plan.policy_type]
        );
        
        if (existingResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                error: `You already have an active ${plan.policy_type} policy.` 
            });
        }
        
        // Calculate dates
        const startDateObj = startDate ? new Date(startDate) : new Date();
        const endDateObj = endDate ? new Date(endDate) : new Date();
        if (!endDate) {
            endDateObj.setFullYear(endDateObj.getFullYear() + 1);
        }
        
        // In purchasePolicy function, update the INSERT query:
const policyResult = await client.query(
    `INSERT INTO policy (
        customer_id, agent_id, policy_type, plan_id, sum_insured, premium_amount,
        start_date, end_date, status, remaining_coverage, used_coverage,
        deductible_amount, co_pay_percentage, no_claim_bonus, renewal_count,
        created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, 0, $10, 0, 0, 0, NOW(), NOW())
    RETURNING policy_id`,
    [userId, assignedAgentId, plan.policy_type, plan.plan_id, plan.coverage_amount, premiumAmount,
     startDateObj, endDateObj, plan.coverage_amount, plan.deductible || 0]
);
        
        const policyId = policyResult.rows[0].policy_id;
        
        // Credit company account if payment info provided
        if (paymentIntentId && amount) {
            const creditResult = await companyAccountService.creditCompanyAccount(
                parseFloat(amount),
                userId,
                policyId,
                `Premium payment from customer ${userId} for policy #${policyId} - ${plan.plan_name}`
            );
            
            if (creditResult.success) {
                const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
                const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
                
                await client.query(
                    `INSERT INTO payment (
                        payment_id, policy_id, customer_id, amount, method, status, 
                        transaction_ref, paid_at
                    ) VALUES ($1, $2, $3, $4, 'stripe', 'Completed', $5, NOW())`,
                    [paymentId, policyId, userId, amount, transactionId]
                );
                
                await client.query(
                    `INSERT INTO transaction (
                        transaction_id, related_payment_id, amount, type, status, 
                        created_at, payment_method, notes
                    ) VALUES ($1, $2, $3, 'premium_payment', 'completed', NOW(), 'stripe', $4)`,
                    [transactionId, paymentId, amount, `Premium payment for policy #${policyId} - ${plan.plan_name}`]
                );
            }
        }
        
        // ✅ Update agent's total_sales count
        if (assignedAgentId) {
            await client.query(
                `UPDATE agent 
                 SET total_sales = COALESCE(total_sales, 0) + 1,
                     updated_at = NOW()
                 WHERE agent_id = $1`,
                [assignedAgentId]
            );
            console.log(`✅ Agent ${assignedAgentId} total_sales incremented for policy ${policyId}`);
        }
        
        await client.query('COMMIT');
        
        // Create notification
        try {
            await db.query(
                `INSERT INTO notifications (user_id, user_type, type, title, message, related_id, created_at)
                 VALUES ($1, 'customer', 'policy_purchased', 'New Policy Activated', 
                         'Your ${plan.plan_name} policy has been activated successfully.', $2, NOW())`,
                [userId, policyId]
            );
        } catch (notifError) {
            console.log('Notification not created:', notifError.message);
        }
        
        res.json({
            success: true,
            message: 'Policy purchased successfully',
            policy: {
                policy_id: policyId,
                plan_name: plan.plan_name,
                policy_type: plan.policy_type,
                coverage_amount: plan.coverage_amount,
                premium_amount: premiumAmount,
                start_date: startDateObj,
                end_date: endDateObj,
                agent_id: assignedAgentId  // ✅ Include agent_id in response
            }
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error purchasing policy:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
};

// Renew a policy with NCB calculation
exports.renewPolicy = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { policyId, startDate, endDate } = req.body;
        
        if (!policyId || !startDate || !endDate) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        
        // Get current policy details
        const policyResult = await db.query(
            `SELECT p.*, pp.plan_name, pp.coverage_amount as plan_coverage, 
                    pp.premium_amount as base_premium
             FROM policy p
             LEFT JOIN policy_plans pp ON pp.plan_id = p.plan_id
             WHERE p.policy_id = $1 AND p.customer_id = $2`,
            [policyId, userId]
        );
        
        if (policyResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Policy not found' });
        }
        
        const currentPolicy = policyResult.rows[0];
        const currentEndDate = new Date(currentPolicy.end_date);
        const today = new Date();
        const requestedStartDate = new Date(startDate);
        const requestedEndDate = new Date(endDate);
        
        // Check renewal eligibility
        const daysUntilExpiry = Math.ceil((currentEndDate - today) / (1000 * 60 * 60 * 24));
        const isExpired = currentEndDate < today;
        const isWithinRenewalWindow = daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
        
        if (!isExpired && !isWithinRenewalWindow) {
            return res.status(400).json({ 
                success: false, 
                error: `Policy cannot be renewed yet. It expires on ${currentEndDate.toLocaleDateString()}.` 
            });
        }
        
        // ============================================
        // ✅ NCB CALCULATION - THE CORE LOGIC
        // ============================================
        
        // Calculate usage percentage
        const usagePercentage = (currentPolicy.used_coverage / currentPolicy.sum_insured) * 100;
        let noClaimBonus = currentPolicy.no_claim_bonus || 0;
        let discountedPremium = currentPolicy.premium_amount;
        let bonusCoverage = 0;
        let ncbIncreaseMessage = '';
        
        console.log(`📊 NCB Calculation for Policy ${policyId}:`);
        console.log(`   - Used Coverage: ${currentPolicy.used_coverage}`);
        console.log(`   - Sum Insured: ${currentPolicy.sum_insured}`);
        console.log(`   - Usage %: ${usagePercentage}%`);
        console.log(`   - Current NCB: ${noClaimBonus}%`);
        
        if (usagePercentage === 0) {
            // 🎉 NO CLAIMS AT ALL - Best case
            const oldBonus = noClaimBonus;
            noClaimBonus = Math.min(noClaimBonus + 20, 50);
            discountedPremium = currentPolicy.premium_amount * (1 - noClaimBonus / 100);
            bonusCoverage = currentPolicy.sum_insured * (noClaimBonus / 100);
            ncbIncreaseMessage = `You earned ${noClaimBonus - oldBonus}% additional No Claim Bonus! Total NCB: ${noClaimBonus}%`;
            
            console.log(`   ✅ No claims! NCB increased from ${oldBonus}% to ${noClaimBonus}%`);
            
        } else if (usagePercentage < 30) {
            // 🎉 LESS THAN 30% CLAIMS - Good case
            const oldBonus = noClaimBonus;
            noClaimBonus = Math.min(noClaimBonus + 10, 50);
            discountedPremium = currentPolicy.premium_amount * (1 - noClaimBonus / 100);
            bonusCoverage = currentPolicy.sum_insured * (noClaimBonus / 100);
            ncbIncreaseMessage = `You earned ${noClaimBonus - oldBonus}% additional No Claim Bonus! Total NCB: ${noClaimBonus}%`;
            
            console.log(`   ✅ Low claims (${usagePercentage}%). NCB increased from ${oldBonus}% to ${noClaimBonus}%`);
            
        } else if (usagePercentage < 70) {
            // ⚠️ MEDIUM CLAIMS - No change
            discountedPremium = currentPolicy.premium_amount;
            ncbIncreaseMessage = `No Claim Bonus unchanged at ${noClaimBonus}%`;
            
            console.log(`   ⚠️ Medium claims (${usagePercentage}%). NCB unchanged at ${noClaimBonus}%`);
            
        } else {
            // ❌ HIGH CLAIMS - Reset bonus
            const oldBonus = noClaimBonus;
            noClaimBonus = 0;
            discountedPremium = currentPolicy.premium_amount;
            ncbIncreaseMessage = `No Claim Bonus reset from ${oldBonus}% to 0% due to high claim usage`;
            
            console.log(`   ❌ High claims (${usagePercentage}%). NCB reset from ${oldBonus}% to 0%`);
        }
        
        // Calculate new coverage amount with bonus
        const baseCoverage = currentPolicy.sum_insured;
        const newCoverageAmount = baseCoverage + bonusCoverage;
        const newPremiumAmount = Math.round(discountedPremium); // Round to nearest integer
        
        console.log(`   - New Premium: ${newPremiumAmount} (was ${currentPolicy.premium_amount})`);
        console.log(`   - New Coverage: ${newCoverageAmount} (was ${baseCoverage})`);
        console.log(`   - Bonus Coverage Added: ${bonusCoverage}`);
        
        // ============================================
        // ✅ UPDATE POLICY WITH NEW NCB VALUES
        // ============================================
        
        await db.query(
            `UPDATE policy 
             SET start_date = $1, 
                 end_date = $2, 
                 remaining_coverage = $3, 
                 used_coverage = 0,
                 premium_amount = $4,
                 sum_insured = $5,
                 no_claim_bonus = $6,
                 renewal_count = renewal_count + 1,
                 last_renewal_date = NOW(),
                 status = 'active', 
                 updated_at = NOW()
             WHERE policy_id = $7`,
            [startDate, endDate, newCoverageAmount, newPremiumAmount, newCoverageAmount, noClaimBonus, policyId]
        );
        
        // ============================================
        // ✅ RECORD RENEWAL HISTORY WITH NCB
        // ============================================
        
        await db.query(
            `INSERT INTO policy_renewal_history (
                policy_id, renewal_date, previous_sum_insured, new_sum_insured,
                previous_remaining_coverage, new_remaining_coverage, 
                renewal_period_months, no_claim_bonus_applied, discounted_premium,
                usage_percentage, ncb_before, ncb_after
            ) VALUES ($1, NOW(), $2, $3, $4, $5, 12, $6, $7, $8, $9, $10)`,
            [policyId, currentPolicy.sum_insured, newCoverageAmount,
             currentPolicy.remaining_coverage, newCoverageAmount, 
             noClaimBonus, newPremiumAmount, usagePercentage, 
             currentPolicy.no_claim_bonus, noClaimBonus]
        );
        
        const planName = currentPolicy.plan_name || currentPolicy.policy_type;
        
        // ============================================
        // ✅ CREATE NOTIFICATION WITH NCB DETAILS
        // ============================================
        
        let notificationMessage = `Your ${planName} policy has been renewed until ${new Date(endDate).toLocaleDateString()}.`;
        
        if (noClaimBonus > currentPolicy.no_claim_bonus) {
            notificationMessage += ` 🎉 Congratulations! ${ncbIncreaseMessage}. Your premium is now ${formatCurrency(newPremiumAmount)} (saved ${formatCurrency(currentPolicy.premium_amount - newPremiumAmount)}) and coverage increased to ${formatCurrency(newCoverageAmount)}.`;
        } else if (noClaimBonus === currentPolicy.no_claim_bonus && noClaimBonus > 0) {
            notificationMessage += ` Your ${noClaimBonus}% No Claim Bonus has been maintained. Premium: ${formatCurrency(newPremiumAmount)}, Coverage: ${formatCurrency(newCoverageAmount)}.`;
        } else if (noClaimBonus === 0 && currentPolicy.no_claim_bonus > 0) {
            notificationMessage += ` ⚠️ Your No Claim Bonus has been reset to 0% due to high claim usage.`;
        } else {
            notificationMessage += ` No Claim Bonus not applicable yet. Make no claims next year to earn up to 50% bonus!`;
        }
        
        try {
            await db.query(
                `INSERT INTO notifications (user_id, user_type, type, title, message, related_id, created_at)
                 VALUES ($1, 'customer', 'policy_renewed', 'Policy Renewed with NCB!', $2, $3, NOW())`,
                [userId, notificationMessage, policyId]
            );
        } catch (notifError) {
            console.log('Notification not created:', notifError.message);
        }
        
        // ============================================
        // ✅ RETURN RENEWAL DETAILS WITH NCB
        // ============================================
        
        res.json({
            success: true,
            message: 'Policy renewed successfully',
            policy: {
                policy_id: policyId,
                start_date: startDate,
                end_date: endDate,
                remaining_coverage: newCoverageAmount,
                premium_amount: newPremiumAmount,
                previous_premium: currentPolicy.premium_amount,
                no_claim_bonus: noClaimBonus,
                previous_ncb: currentPolicy.no_claim_bonus,
                renewal_count: currentPolicy.renewal_count + 1,
                savings: currentPolicy.premium_amount - newPremiumAmount,
                bonus_coverage_added: bonusCoverage
            }
        });
        
    } catch (error) {
        console.error('Error renewing policy:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};