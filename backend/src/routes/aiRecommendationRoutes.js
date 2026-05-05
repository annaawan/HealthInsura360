// backend/routes/aiRecommendationRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const aiRecommendationController = require('../controllers/aiRecommendationController');

// Get AI-powered recommendations
router.get('/recommendations', authenticate, aiRecommendationController.getAIRecommendations);

module.exports = router;