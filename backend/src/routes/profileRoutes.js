const express = require('express');
const router = express.Router();

console.log('📁 Loading profileRoutes...');
console.log('📁 Current directory:', __dirname);

// Load controller and middleware
const profileController = require('../controllers/profileController');
const { authenticate } = require('../middleware/auth');
const { uploadProfilePicture } = require('../middleware/upload');

console.log('✅ profileController loaded successfully');
console.log('📦 Exported functions:', Object.keys(profileController));
console.log('✅ auth middleware loaded');
console.log('✅ upload middleware loaded');

// VERIFY all functions exist before registering routes
const requiredFunctions = ['updateProfile', 'getProfilePicture', 'deleteProfilePicture'];
const missingFunctions = requiredFunctions.filter(fn => typeof profileController[fn] !== 'function');

if (missingFunctions.length > 0) {
  console.error('❌ Missing required functions:', missingFunctions);
  console.error('❌ profileController:', profileController);
  process.exit(1);
}

console.log('✅ All controller functions verified');

// Register routes
console.log('📝 Registering routes...');

// Update profile with picture upload - FIXED: Added proper error handling
try {
  router.put('/update', 
    authenticate, 
    uploadProfilePicture,
    profileController.updateProfile
  );
  console.log('✅ /update route registered');
} catch (error) {
  console.error('❌ Failed to register /update route:', error.message);
}

try {
  router.get('/picture/:userId', profileController.getProfilePicture);
  console.log('✅ /picture/:userId route registered');
} catch (error) {
  console.error('❌ Failed to register /picture/:userId route:', error.message);
}

try {
  router.delete('/picture', 
    authenticate,
    profileController.deleteProfilePicture
  );
  console.log('✅ /picture DELETE route registered');
} catch (error) {
  console.error('❌ Failed to register /picture DELETE route:', error.message);
}

// Add a test route
try {
  router.get('/test', (req, res) => {
    res.json({ 
      success: true,
      message: 'Profile routes are working',
      timestamp: new Date().toISOString()
    });
  });
  console.log('✅ /test route registered');
} catch (error) {
  console.error('❌ Failed to register /test route:', error.message);
}

console.log('📝 All routes registered successfully');
console.log('✅ profileRoutes.js loaded successfully');

module.exports = router;