// No Claim Bonus Calculation Service
class NCBService {
    // Calculate NCB percentage based on claim-free years
    static calculateNCB(claimFreeYears) {
        const ncbSlab = {
            0: 0,      // 0 years - 0%
            1: 20,     // 1 year - 20%
            2: 25,     // 2 years - 25%
            3: 30,     // 3 years - 30%
            4: 35,     // 4 years - 35%
            5: 40,     // 5 years - 40%
            6: 45,     // 6 years - 45%
            7: 50      // 7+ years - 50%
        };
        return ncbSlab[Math.min(claimFreeYears, 7)] || 0;
    }

    // Calculate renewal premium after NCB
    static calculateRenewalPremium(basePremium, ncbPercentage) {
        return basePremium * (1 - ncbPercentage / 100);
    }

    // Calculate bonus coverage
    static calculateBonusCoverage(baseCoverage, ncbPercentage) {
        return baseCoverage * (ncbPercentage / 100);
    }

    // Get NCB description
    static getNCBDescription(claimFreeYears, ncbPercentage) {
        if (ncbPercentage === 0) {
            return "No claim bonus not applicable yet. Make claims carefully!";
        }
        return `${ncbPercentage}% discount on renewal premium + ${ncbPercentage}% extra coverage. ${claimFreeYears} claim-free years!`;
    }
}

module.exports = NCBService;