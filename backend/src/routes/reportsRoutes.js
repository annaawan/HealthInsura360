const express = require('express');
const router = express.Router();
const db = require('../config/database');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');

// GET report data
router.get('/:reportType', async (req, res) => {
  try {
    const { reportType } = req.params;
    const { range = 'last-30-days' } = req.query;

    console.log(`📊 Generating ${reportType} report for range: ${range}`);

    let reportData;

    switch (reportType) {
      case 'user':
        reportData = await getUserGrowthReport(range);
        break;
      case 'hospital':
        reportData = await getHospitalNetworkReport(range);
        break;
      default:
        // For inactive reports, return error
        return res.status(400).json({
          success: false,
          error: `Report type "${reportType}" is currently inactive`,
          message: 'Only User Growth and Hospital Network reports are active'
        });
    }

    res.json({
      success: true,
      data: reportData,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Report generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export report
router.get('/export/:reportType', async (req, res) => {
  try {
    const { reportType } = req.params;
    const { format = 'pdf', range = 'last-30-days' } = req.query;

    console.log(`📤 Exporting ${reportType} report as ${format}`);

    let reportData;
    let title;

    // Get report data
    switch (reportType) {
      case 'user':
        reportData = await getUserGrowthReport(range);
        title = 'User Growth Report';
        break;
      case 'hospital':
        reportData = await getHospitalNetworkReport(range);
        title = 'Hospital Network Report';
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Report type "${reportType}" is currently inactive`
        });
    }

    // Generate export based on format
    if (format === 'pdf') {
      const pdfDoc = generatePDF(reportData, title, range);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`);
      
      pdfDoc.pipe(res);
      pdfDoc.end();
    } else if (format === 'csv') {
      const csvData = convertToCSV(reportData, title);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv"`);
      
      res.send(csvData);
    } else {
      res.status(400).json({
        success: false,
        error: 'Unsupported export format'
      });
    }

  } catch (error) {
    console.error('❌ Export error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========== USER GROWTH REPORT ==========
async function getUserGrowthReport(range) {
  try {
    console.log('👥 Generating User Growth Report...');
    
    // Determine date range based on selection
    const dateCondition = getDateCondition(range, 'created_at');
    
    // Get user growth data grouped by month
    const growthQuery = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as period,
        COUNT(*) as new_users,
        SUM(COUNT(*)) OVER (ORDER BY TO_CHAR(created_at, 'YYYY-MM')) as cumulative_users
      FROM customer
      ${dateCondition.whereClause}
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY TO_CHAR(created_at, 'YYYY-MM')
      LIMIT 12
    `;

    console.log('📊 User growth query:', growthQuery);
    console.log('📊 Date params:', dateCondition.params);
    
    const result = await db.query(growthQuery, dateCondition.params);
    console.log('📊 User growth raw result:', result.rows);

    // Format data for charts
    const labels = result.rows.map(row => row.period);
    const newUsers = result.rows.map(row => parseInt(row.new_users) || 0);
    const cumulativeUsers = result.rows.map(row => parseInt(row.cumulative_users) || 0);

    // Get detailed user statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_last_30_days,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_customers,
        COUNT(CASE WHEN gender = 'Male' THEN 1 END) as male_customers,
        COUNT(CASE WHEN gender = 'Female' THEN 1 END) as female_customers,
        COUNT(CASE WHEN EXTRACT(YEAR FROM AGE(dob)) >= 60 THEN 1 END) as senior_customers,
        (
          SELECT city 
          FROM customer 
          GROUP BY city 
          ORDER BY COUNT(*) DESC 
          LIMIT 1
        ) as top_city
      FROM customer
      ${dateCondition.whereClause}
    `;

    console.log('📊 User stats query:', statsQuery);
    const statsResult = await db.query(statsQuery, dateCondition.params);
    const stats = statsResult.rows[0];
    console.log('📊 User stats:', stats);

    // Get user growth by city
    const cityGrowthQuery = `
      SELECT 
        city,
        COUNT(*) as user_count
      FROM customer
      ${dateCondition.whereClause}
      GROUP BY city
      ORDER BY user_count DESC
      LIMIT 5
    `;

    const cityResult = await db.query(cityGrowthQuery, dateCondition.params);

    return {
      labels,
      data: newUsers,
      cumulativeData: cumulativeUsers,
      summary: {
        total_customers: parseInt(stats.total_customers) || 0,
        new_last_30_days: parseInt(stats.new_last_30_days) || 0,
        active_customers: parseInt(stats.active_customers) || 0,
        male_customers: parseInt(stats.male_customers) || 0,
        female_customers: parseInt(stats.female_customers) || 0,
        senior_customers: parseInt(stats.senior_customers) || 0,
        top_city: stats.top_city || 'N/A'
      },
      cityDistribution: cityResult.rows,
      growthRate: calculateGrowthRate(newUsers),
      rawData: result.rows
    };

  } catch (error) {
    console.error('❌ User growth report error:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Return sample data for development
    return getSampleUserGrowthData();
  }
}

// // ========== HOSPITAL NETWORK REPORT ==========
// async function getHospitalNetworkReport(range) {
//   try {
//     console.log('🏥 Generating Hospital Network Report...');
    
//     // Determine date range
//     const dateCondition = getDateCondition(range, 'created_at');
    
//     // Get hospital statistics by status
//     const statusQuery = `
//       SELECT 
//         COALESCE(status, 'pending') as status,
//         COUNT(*) as count
//       FROM hospital
//       ${dateCondition.whereClause}
//       GROUP BY COALESCE(status, 'pending')
//       ORDER BY 
//         CASE COALESCE(status, 'pending')
//           WHEN 'verified' THEN 1
//           WHEN 'active' THEN 2
//           WHEN 'pending' THEN 3
//           WHEN 'inactive' THEN 4
//           ELSE 5
//         END
//     `;

//     console.log('🏥 Hospital status query:', statusQuery);
//     const statusResult = await db.query(statusQuery, dateCondition.params);
//     console.log('🏥 Hospital status result:', statusResult.rows);

//     const labels = statusResult.rows.map(row => row.status || 'Unknown');
//     const data = statusResult.rows.map(row => parseInt(row.count) || 0);

//     // Get detailed hospital statistics
//     const statsQuery = `
//       SELECT 
//         COUNT(*) as total_hospitals,
//         COUNT(CASE WHEN verified_status = 'verified' THEN 1 END) as verified_hospitals,
//         COUNT(CASE WHEN status = 'active' THEN 1 END) as active_hospitals,
//         COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_last_30_days,
//         COUNT(DISTINCT city) as cities_covered,
//         COUNT(DISTINCT state) as states_covered,
//         (
//           SELECT city 
//           FROM hospital 
//           GROUP BY city 
//           ORDER BY COUNT(*) DESC 
//           LIMIT 1
//         ) as top_city
//       FROM hospital
//       ${dateCondition.whereClause}
//     `;

//     console.log('🏥 Hospital stats query:', statsQuery);
//     const statsResult = await db.query(statsQuery, dateCondition.params);
//     const stats = statsResult.rows[0];
//     console.log('🏥 Hospital stats:', stats);

//     // Get hospitals by city
//     const cityQuery = `
//       SELECT 
//         city,
//         COUNT(*) as hospital_count
//       FROM hospital
//       ${dateCondition.whereClause}
//       GROUP BY city
//       ORDER BY hospital_count DESC
//       LIMIT 5
//     `;

//     const cityResult = await db.query(cityQuery, dateCondition.params);

//     // Get hospitals by specialization (if specialization column exists)
//     let specializationData = [];
//     try {
//       const specializationQuery = `
//         SELECT 
//           COALESCE(specialization, 'General') as specialization,
//           COUNT(*) as count
//         FROM hospital
//         ${dateCondition.whereClause}
//         GROUP BY COALESCE(specialization, 'General')
//         ORDER BY count DESC
//         LIMIT 5
//       `;
//       const specializationResult = await db.query(specializationQuery, dateCondition.params);
//       specializationData = specializationResult.rows;
//     } catch (specError) {
//       console.log('⚠️ Specialization query failed:', specError.message);
//     }

//     // Get recent hospital registrations
//     const recentHospitalsQuery = `
//       SELECT 
//         name,
//         city,
//         state,
//         verified_status,
//         created_at
//       FROM hospital
//       ${dateCondition.whereClause}
//       ORDER BY created_at DESC
//       LIMIT 5
//     `;

//     const recentHospitalsResult = await db.query(recentHospitalsQuery, dateCondition.params);

//     return {
//       labels,
//       data,
//       summary: {
//         total_hospitals: parseInt(stats.total_hospitals) || 0,
//         verified_hospitals: parseInt(stats.verified_hospitals) || 0,
//         active_hospitals: parseInt(stats.active_hospitals) || 0,
//         new_last_30_days: parseInt(stats.new_last_30_days) || 0,
//         cities_covered: parseInt(stats.cities_covered) || 0,
//         states_covered: parseInt(stats.states_covered) || 0,
//         top_city: stats.top_city || 'N/A'
//       },
//       cityDistribution: cityResult.rows,
//       specializationDistribution: specializationData,
//       recentHospitals: recentHospitalsResult.rows,
//       rawData: statusResult.rows
//     };

//   } catch (error) {
//     console.error('❌ Hospital network report error:', error.message);
//     console.error('❌ Error stack:', error.stack);
    
//     // Return sample data for development
//     return getSampleHospitalData();
//   }
// }
// ========== HOSPITAL NETWORK REPORT ==========
async function getHospitalNetworkReport(range) {
  try {
    console.log('🏥 Generating Hospital Network Report...');
    
    // Determine date range
    const dateCondition = getDateCondition(range, 'created_at');
    
    // First, let's check what status values actually exist in the database
    const statusCheckQuery = `
      SELECT DISTINCT status 
      FROM hospital 
      WHERE status IS NOT NULL
      ORDER BY status
    `;
    
    console.log('🔍 Checking hospital status values...');
    const statusCheckResult = await db.query(statusCheckQuery);
    console.log('🏥 Actual status values in database:', statusCheckResult.rows);
    
    // Get hospital statistics by status
    const statusQuery = `
      SELECT 
        COALESCE(status, 'Unknown') as status,
        COUNT(*) as count
      FROM hospital
      ${dateCondition.whereClause}
      GROUP BY status
      ORDER BY count DESC
    `;

    console.log('🏥 Hospital status query:', statusQuery);
    const statusResult = await db.query(statusQuery, dateCondition.params);
    console.log('🏥 Hospital status result:', statusResult.rows);

    const labels = statusResult.rows.map(row => row.status || 'Unknown');
    const data = statusResult.rows.map(row => parseInt(row.count) || 0);

    // Get detailed hospital statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_hospitals,
        COUNT(CASE WHEN verified_status = 'verified' THEN 1 END) as verified_hospitals,
        COUNT(CASE WHEN verified_status IS NOT NULL AND verified_status != 'unverified' THEN 1 END) as total_verified,
        COUNT(CASE WHEN status = 'active' OR status = 'Active' OR status = 'ACTIVE' THEN 1 END) as active_hospitals,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_last_30_days,
        COUNT(DISTINCT city) as cities_covered,
        COUNT(DISTINCT state) as states_covered,
        (
          SELECT city 
          FROM hospital 
          GROUP BY city 
          ORDER BY COUNT(*) DESC 
          LIMIT 1
        ) as top_city
      FROM hospital
      ${dateCondition.whereClause}
    `;

    console.log('🏥 Hospital stats query:', statsQuery);
    const statsResult = await db.query(statsQuery, dateCondition.params);
    const stats = statsResult.rows[0];
    console.log('🏥 Hospital stats:', stats);

    // Get hospitals by city
    const cityQuery = `
      SELECT 
        COALESCE(city, 'Unknown') as city,
        COUNT(*) as hospital_count
      FROM hospital
      ${dateCondition.whereClause}
      GROUP BY city
      ORDER BY hospital_count DESC
      LIMIT 5
    `;

    const cityResult = await db.query(cityQuery, dateCondition.params);

    // Get hospitals by specialization (if specialization column exists)
    let specializationData = [];
    try {
      const specializationQuery = `
        SELECT 
          COALESCE(specialization, 'General') as specialization,
          COUNT(*) as count
        FROM hospital
        ${dateCondition.whereClause}
        GROUP BY specialization
        ORDER BY count DESC
        LIMIT 5
      `;
      const specializationResult = await db.query(specializationQuery, dateCondition.params);
      specializationData = specializationResult.rows;
    } catch (specError) {
      console.log('⚠️ Specialization query failed:', specError.message);
    }

    // Get recent hospital registrations
    const recentHospitalsQuery = `
      SELECT 
        name,
        city,
        state,
        verified_status,
        created_at
      FROM hospital
      ${dateCondition.whereClause}
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const recentHospitalsResult = await db.query(recentHospitalsQuery, dateCondition.params);

    return {
      labels,
      data,
      summary: {
        total_hospitals: parseInt(stats.total_hospitals) || 0,
        verified_hospitals: parseInt(stats.verified_hospitals) || 0,
        total_verified: parseInt(stats.total_verified) || 0,
        active_hospitals: parseInt(stats.active_hospitals) || 0,
        new_last_30_days: parseInt(stats.new_last_30_days) || 0,
        cities_covered: parseInt(stats.cities_covered) || 0,
        states_covered: parseInt(stats.states_covered) || 0,
        top_city: stats.top_city || 'N/A'
      },
      cityDistribution: cityResult.rows,
      specializationDistribution: specializationData,
      recentHospitals: recentHospitalsResult.rows,
      rawData: statusResult.rows
    };

  } catch (error) {
    console.error('❌ Hospital network report error:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Instead of using sample data, let's try a more robust query
    try {
      console.log('🔄 Trying alternative query for hospital data...');
      return await getHospitalNetworkReportFallback(range);
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError.message);
      return getSampleHospitalData();
    }
  }
}

// Alternative fallback function
async function getHospitalNetworkReportFallback(range) {
  const dateCondition = getDateCondition(range, 'created_at');
  
  // Simple query without CASE statements that might cause enum issues
  const simpleQuery = `
    SELECT 
      COUNT(*) as total_hospitals,
      COUNT(DISTINCT city) as cities_covered,
      COUNT(DISTINCT state) as states_covered
    FROM hospital
    ${dateCondition.whereClause}
  `;
  
  const result = await db.query(simpleQuery, dateCondition.params);
  const stats = result.rows[0];
  
  // Get status distribution using string comparison to avoid enum issues
  const statusQuery = `
    SELECT 
      status,
      COUNT(*) as count
    FROM hospital
    ${dateCondition.whereClause}
    GROUP BY status
  `;
  
  const statusResult = await db.query(statusQuery, dateCondition.params);
  
  return {
    labels: statusResult.rows.map(row => row.status || 'Unknown'),
    data: statusResult.rows.map(row => parseInt(row.count) || 0),
    summary: {
      total_hospitals: parseInt(stats.total_hospitals) || 0,
      cities_covered: parseInt(stats.cities_covered) || 0,
      states_covered: parseInt(stats.states_covered) || 0,
      // Default values for other fields
      verified_hospitals: 0,
      total_verified: 0,
      active_hospitals: 0,
      new_last_30_days: 0,
      top_city: 'N/A'
    },
    cityDistribution: [],
    specializationDistribution: [],
    recentHospitals: [],
    rawData: statusResult.rows
  };
}

// ========== HELPER FUNCTIONS ==========

// Get date condition based on range
function getDateCondition(range, dateColumn) {
  const now = new Date();
  let startDate;
  
  switch (range) {
    case 'last-7-days':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'last-30-days':
      startDate = new Date(now.setDate(now.getDate() - 30));
      break;
    case 'last-quarter':
      startDate = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case 'last-year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    case 'all-time':
    default:
      // All time - no date filter
      return { whereClause: '', params: [] };
  }
  
  return {
    whereClause: `WHERE ${dateColumn} >= $1`,
    params: [startDate.toISOString()]
  };
}

// Calculate growth rate from data array
function calculateGrowthRate(dataArray) {
  if (!dataArray || dataArray.length < 2) return '0%';
  
  const first = dataArray[0] || 0;
  const last = dataArray[dataArray.length - 1] || 0;
  
  if (first === 0) return last > 0 ? '∞' : '0%';
  
  const growth = ((last - first) / first) * 100;
  return `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`;
}

// Generate PDF report
function generatePDF(reportData, title, range) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  
  // Header
  doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica').text(`Date Range: ${range.replace(/-/g, ' ')}`, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, { align: 'center' });
  doc.moveDown(2);
  
  // Add a horizontal line
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(2);
  
  // Summary Section
  doc.fontSize(16).font('Helvetica-Bold').text('SUMMARY', { underline: true });
  doc.moveDown();
  
  if (reportData.summary) {
    let y = doc.y;
    const col1 = 50;
    const col2 = 300;
    let rowHeight = 20;
    
    Object.entries(reportData.summary).forEach(([key, value], index) => {
      const displayName = key.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      doc.font('Helvetica-Bold').fontSize(12).text(displayName + ':', col1, y);
      doc.font('Helvetica').text(String(value), col2, y);
      y += rowHeight;
      
      // Add page break if needed
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    });
    doc.y = y;
  }
  doc.moveDown(2);
  
  // Detailed Data Section
  doc.fontSize(16).font('Helvetica-Bold').text('DETAILED DATA', { underline: true });
  doc.moveDown();
  
  if (reportData.rawData && reportData.rawData.length > 0) {
    doc.fontSize(10).font('Helvetica');
    
    // Create table header
    const headers = Object.keys(reportData.rawData[0]);
    let y = doc.y;
    const colWidth = 120;
    
    headers.forEach((header, i) => {
      doc.font('Helvetica-Bold').text(
        header.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        50 + (i * colWidth), y
      );
    });
    
    y += 20;
    
    // Add data rows
    reportData.rawData.forEach((row, rowIndex) => {
      headers.forEach((header, colIndex) => {
        doc.font('Helvetica').text(String(row[header] || ''), 50 + (colIndex * colWidth), y);
      });
      y += 15;
      
      // Add page break if needed
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    });
    
    doc.y = y;
  }
  
  doc.moveDown(4);
  
  // Footer
  doc.fontSize(10).font('Helvetica-Oblique')
    .text('Insurance Management System - Confidential Report', { align: 'center' });
  
  return doc;
}

// Convert to CSV
function convertToCSV(reportData, title) {
  const sections = [];
  
  // Add header section
  sections.push(`"${title}"`);
  sections.push(`"Generated: ${new Date().toLocaleString()}"`);
  sections.push('');
  
  // Add summary section
  if (reportData.summary) {
    sections.push('"SUMMARY"');
    sections.push('"Metric","Value"');
    Object.entries(reportData.summary).forEach(([key, value]) => {
      const displayName = key.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      sections.push(`"${displayName}","${value}"`);
    });
    sections.push('');
  }
  
  // Add raw data section
  if (reportData.rawData && reportData.rawData.length > 0) {
    sections.push('"DETAILED DATA"');
    
    // Get headers
    const headers = Object.keys(reportData.rawData[0]);
    const headerRow = headers.map(header => 
      `"${header.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}"`
    ).join(',');
    
    sections.push(headerRow);
    
    // Add data rows
    reportData.rawData.forEach(row => {
      const dataRow = headers.map(header => `"${row[header] || ''}"`).join(',');
      sections.push(dataRow);
    });
  }
  
  return sections.join('\n');
}

// ========== SAMPLE DATA FOR DEVELOPMENT ==========

function getSampleUserGrowthData() {
  console.log('⚠️ Using sample user growth data');
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const newUsers = [45, 52, 49, 61, 55, 58, 62, 65, 70, 68, 72, 75];
  let cumulative = 0;
  const cumulativeUsers = newUsers.map(num => {
    cumulative += num;
    return cumulative;
  });

  return {
    labels: months.slice(0, 6),
    data: newUsers.slice(0, 6),
    cumulativeData: cumulativeUsers.slice(0, 6),
    summary: {
      total_customers: 450,
      new_last_30_days: 75,
      active_customers: 420,
      male_customers: 240,
      female_customers: 210,
      senior_customers: 85,
      top_city: 'New York'
    },
    cityDistribution: [
      { city: 'New York', user_count: 120 },
      { city: 'Los Angeles', user_count: 85 },
      { city: 'Chicago', user_count: 65 },
      { city: 'Houston', user_count: 45 },
      { city: 'Phoenix', user_count: 35 }
    ],
    growthRate: '+15.2%',
    rawData: months.slice(0, 6).map((month, i) => ({
      period: `2024-${(i + 1).toString().padStart(2, '0')}`,
      new_users: newUsers[i],
      cumulative_users: cumulativeUsers[i]
    }))
  };
}

function getSampleHospitalData() {
  console.log('⚠️ Using sample hospital data');
  
  return {
    labels: ['Verified', 'Active', 'Pending', 'Inactive'],
    data: [45, 38, 12, 5],
    summary: {
      total_hospitals: 100,
      verified_hospitals: 45,
      active_hospitals: 38,
      new_last_30_days: 8,
      cities_covered: 25,
      states_covered: 12,
      top_city: 'New York'
    },
    cityDistribution: [
      { city: 'New York', hospital_count: 15 },
      { city: 'Los Angeles', hospital_count: 12 },
      { city: 'Chicago', hospital_count: 8 },
      { city: 'Houston', hospital_count: 6 },
      { city: 'Phoenix', hospital_count: 5 }
    ],
    specializationDistribution: [
      { specialization: 'Multi-Specialty', count: 35 },
      { specialization: 'Cardiology', count: 20 },
      { specialization: 'Orthopedics', count: 15 },
      { specialization: 'Neurology', count: 12 },
      { specialization: 'General', count: 18 }
    ],
    recentHospitals: [
      { name: 'City General Hospital', city: 'New York', state: 'NY', verified_status: 'verified', created_at: '2024-01-15' },
      { name: 'Metro Health Center', city: 'Los Angeles', state: 'CA', verified_status: 'pending', created_at: '2024-01-10' }
    ],
    rawData: [
      { status: 'verified', count: 45 },
      { status: 'active', count: 38 },
      { status: 'pending', count: 12 },
      { status: 'inactive', count: 5 }
    ]
  };
}

module.exports = router;