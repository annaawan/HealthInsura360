// backend/utils/registrationGenerator.js
// Use the shared db query helper instead of attempting to call pool.connect()
const db = require('../config/database');

async function generateRegistrationNumber() {
  try {
    // Get current year
    const year = new Date().getFullYear();

    // Find the highest sequence number for this year using the exported query API
    const result = await db.query(`
      SELECT registration_number
      FROM public.hospital
      WHERE registration_number LIKE $1
      ORDER BY registration_number DESC
      LIMIT 1
    `, [`H360-${year}-%`]);

    let nextSequence = 1;

    if (result.rows && result.rows.length > 0) {
      const lastReg = result.rows[0].registration_number;
      const parts = lastReg ? lastReg.split('-') : [];
      const lastSequence = parts[2] ? parseInt(parts[2], 10) : 0;
      if (!isNaN(lastSequence)) nextSequence = lastSequence + 1;
    }

    // Format: H360-YYYY-XXXX (4 digits padding)
    const registrationNumber = `H360-${year}-${String(nextSequence).padStart(4, '0')}`;

    return registrationNumber;
  } catch (error) {
    console.error('Error generating registration number:', error);
    throw error;
  }
}

module.exports = { generateRegistrationNumber };