const db = require('../config/database');
const fs = require('fs');
const path = require('path');

// Helper function to get table name based on user type
const getTableName = (userType) => {
  switch(userType) {
    case 'customer':
      return { table: 'customer', idColumn: 'customer_id' };
    case 'agent':
      return { table: 'agent', idColumn: 'agent_id' };
    case 'admin':
      return { table: 'admin', idColumn: 'admin_id' };
    case 'hospital':
      return { table: 'hospital', idColumn: 'hospital_id' };
    default:
      return null;
  }
};

// Helper function to format date for database
const formatDateForDB = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
};

// Update profile with picture
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const userType = req.user?.userType || req.user?.role;
    
    console.log('📝 Updating profile for:', { userId, userType });
    
    if (!userId || !userType) {
      return res.status(401).json({ 
        success: false,
        error: 'User not authenticated' 
      });
    }

    const tableInfo = getTableName(userType);
    if (!tableInfo) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid user type' 
      });
    }

    const {
      first_name,
      last_name,
      phone,
      gender,
      dob,
      street,
      city,
      state,
      zipcode
    } = req.body;

    // Handle profile picture if uploaded
    let profilePictureUrl = null;
    if (req.file) {
      profilePictureUrl = `/uploads/profiles/${req.file.filename}`;
      
      // Get old profile picture to delete
      const oldProfile = await db.query(
        `SELECT profile_picture FROM ${tableInfo.table} WHERE ${tableInfo.idColumn} = $1`,
        [userId]
      );
      
      // Delete old picture if exists
      if (oldProfile.rows[0]?.profile_picture) {
        const oldPath = path.join(__dirname, '../../', oldProfile.rows[0].profile_picture);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
          console.log(`✅ Deleted old profile picture: ${oldProfile.rows[0].profile_picture}`);
        }
      }
    }

    // Format date properly
    const formattedDob = formatDateForDB(dob);

    // Build dynamic update query based on table columns
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (first_name !== undefined) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(first_name || null);
    }
    if (last_name !== undefined) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(last_name || null);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone || null);
    }
    if (gender !== undefined) {
      updates.push(`gender = $${paramCount++}`);
      values.push(gender || null);
    }
    if (formattedDob !== undefined) {
      updates.push(`dob = $${paramCount++}`);
      values.push(formattedDob);
    }
    if (street !== undefined) {
      updates.push(`street = $${paramCount++}`);
      values.push(street || null);
    }
    if (city !== undefined) {
      updates.push(`city = $${paramCount++}`);
      values.push(city || null);
    }
    if (state !== undefined) {
      updates.push(`state = $${paramCount++}`);
      values.push(state || null);
    }
    if (zipcode !== undefined) {
      updates.push(`zipcode = $${paramCount++}`);
      values.push(zipcode || null);
    }
    if (profilePictureUrl !== undefined && profilePictureUrl !== null) {
      updates.push(`profile_picture = $${paramCount++}`);
      values.push(profilePictureUrl);
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      return res.status(400).json({ 
        success: false,
        error: 'No fields to update' 
      });
    }

    values.push(userId);

    const query = `
      UPDATE ${tableInfo.table} 
      SET ${updates.join(', ')}
      WHERE ${tableInfo.idColumn} = $${paramCount}
      RETURNING *
    `;

    console.log('📝 Executing query:', query);
    console.log('📝 Values:', values);

    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Remove password_hash from response
    delete result.rows[0].password_hash;

    console.log(`✅ Profile updated for ${userType} with ID ${userId}`);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error updating profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update profile: ' + error.message 
    });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const userType = req.user?.userType || req.user?.role;
    
    console.log('📋 Getting profile for:', { userId, userType });
    
    if (!userId || !userType) {
      return res.status(401).json({ 
        success: false,
        error: 'User not authenticated' 
      });
    }

    const tableInfo = getTableName(userType);
    if (!tableInfo) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid user type' 
      });
    }

    const result = await db.query(
      `SELECT * FROM ${tableInfo.table} WHERE ${tableInfo.idColumn} = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Remove password_hash from response
    delete result.rows[0].password_hash;

    // Add user type to response
    result.rows[0].userType = userType;

    res.json({
      success: true,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error getting profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get profile: ' + error.message 
    });
  }
};

// Get profile picture
exports.getProfilePicture = async (req, res) => {
  try {
    const userId = req.params.userId;
    const userType = req.query.userType || 'customer';
    
    const tableInfo = getTableName(userType);
    if (!tableInfo) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid user type' 
      });
    }

    const result = await db.query(
      `SELECT profile_picture FROM ${tableInfo.table} WHERE ${tableInfo.idColumn} = $1`,
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].profile_picture) {
      return res.status(404).json({ 
        success: false,
        error: 'Profile picture not found' 
      });
    }

    const filePath = path.join(__dirname, '../../', result.rows[0].profile_picture);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false,
        error: 'File not found' 
      });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('❌ Error getting profile picture:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get profile picture' 
    });
  }
};

// Delete profile picture
exports.deleteProfilePicture = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const userType = req.user?.userType || req.user?.role;
    
    if (!userId || !userType) {
      return res.status(401).json({ 
        success: false,
        error: 'User not authenticated' 
      });
    }

    const tableInfo = getTableName(userType);
    if (!tableInfo) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid user type' 
      });
    }

    // Get current profile picture
    const result = await db.query(
      `SELECT profile_picture FROM ${tableInfo.table} WHERE ${tableInfo.idColumn} = $1`,
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].profile_picture) {
      return res.status(404).json({ 
        success: false,
        error: 'No profile picture to delete' 
      });
    }

    // Delete file
    const filePath = path.join(__dirname, '../../', result.rows[0].profile_picture);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Update database
    await db.query(
      `UPDATE ${tableInfo.table} SET profile_picture = NULL, updated_at = NOW() WHERE ${tableInfo.idColumn} = $1`,
      [userId]
    );

    res.json({
      success: true,
      message: 'Profile picture deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting profile picture:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete profile picture' 
    });
  }
};