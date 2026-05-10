// frontend/src/components/CustomerDashboard/AIRecommendations.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, Shield, Star, Heart, ChevronRight, Loader, TrendingUp, RefreshCw, CheckCircle } from 'lucide-react';
import mlRecommender from '../services/mlRecommender';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_BASE_URL;;

const getAxiosConfig = () => {
    const token = localStorage.getItem('healthinsura360_token');
    return {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
};

const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '$0';
    if (amount === 0) return 'FREE';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.floor(amount));
};

const getScoreColor = (score) => {
    if (score >= 85) return 'from-emerald-500 to-emerald-600';
    if (score >= 70) return 'from-blue-500 to-blue-600';
    if (score >= 50) return 'from-sky-500 to-sky-600';
    return 'from-gray-400 to-gray-500';
};

function AIRecommendations({ onSelectPlan, onViewPolicies, refreshTrigger }) {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [greeting, setGreeting] = useState('');
    const [mlStatus, setMlStatus] = useState('Initializing AI...');
    const [error, setError] = useState(null);
    const [aiMetadata, setAiMetadata] = useState(null);

    useEffect(() => {
        fetchRecommendations();
    }, [refreshTrigger]);

    const fetchRecommendations = async () => {
        setLoading(true);
        setError(null);
        setMlStatus('Initializing AI Engine...');
        
        try {
            const config = getAxiosConfig();
            
            setMlStatus('Analyzing your profile with Groq...');
            
            // ✅ NEW: Try OpenAI API first
            const aiResponse = await axios.get(`${API_BASE_URL}/ai/recommendations`, config);
            
            if (aiResponse.data.success) {
                setRecommendations(aiResponse.data.recommendations);
                setGreeting(aiResponse.data.greeting);
                setAiMetadata(aiResponse.data.ai_metadata);
                
                console.log('🤖 AI Metadata:', aiResponse.data.ai_metadata);
                console.log('📊 Customer Profile:', aiResponse.data.customer_profile);
                
                setMlStatus(aiResponse.data.ai_metadata.source === 'openai' ? 'AI Active' : 'Standard Mode');
                setLoading(false);
                return;
            }
        } catch (openAIError) {
            console.log('⚠️ OpenAI API failed, falling back to ML recommender:', openAIError.message);
            setMlStatus('Falling back to standard recommendations...');
        }
        
        // ============================================
        // FALLBACK: Use existing ML recommender
        // ============================================
        try {
            const config = getAxiosConfig();
            
            setMlStatus('Analyzing your profile...');
            const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`, config);
            const customerProfile = profileResponse.data.profile || profileResponse.data.user;
            
            setMlStatus('Checking your existing policies...');
            const policiesResponse = await axios.get(`${API_BASE_URL}/policies/my-policies`, config);
            const purchasedPolicies = policiesResponse.data.policies || [];
            
            const purchasedPlanIds = new Set(
                purchasedPolicies
                    .map(p => p.plan_id)
                    .filter(id => id !== null && id !== undefined)
            );
            
            console.log('📋 Purchased plan IDs:', [...purchasedPlanIds]);
            
            let age = 30;
            if (customerProfile.dob) {
                const birthDate = new Date(customerProfile.dob);
                const today = new Date();
                age = today.getFullYear() - birthDate.getFullYear();
            }
            
            const claimsResponse = await axios.get(`${API_BASE_URL}/claims/my-claims`, config);
            const previousClaims = claimsResponse.data.claims?.length || 0;
            
            const customerData = {
                age: age,
                family_size: customerProfile.family_size || 1,
                budget: customerProfile.monthly_budget || 10000,
                health_score: customerProfile.health_score || 0.7,
                income: customerProfile.annual_income || 50000,
                previous_claims: previousClaims,
                purchased_plan_ids: purchasedPlanIds
            };
            
            console.log('📊 Customer Data for Recommendations:', customerData);
            
            setMlStatus('Running recommendation engine...');
            const plansResponse = await axios.get(`${API_BASE_URL}/insurance-plans`, config);
            const allPlans = plansResponse.data.plans || [];
            
            const availablePlans = allPlans;
            
            console.log('📋 Total plans available:', availablePlans.length);
            console.log('📋 All plan IDs:', availablePlans.map(p => ({ id: p.plan_id, name: p.plan_name })));
            
            setMlStatus('Generating personalized recommendations...');
            const mlRecommendations = await mlRecommender.getRecommendations(customerData, availablePlans);
            
            console.log('📋 Final recommendations:', mlRecommendations.length);
            
            setRecommendations(mlRecommendations);
            setAiMetadata({
                source: 'rule_based_fallback',
                model: 'ml_recommender_v1',
                timestamp: new Date().toISOString()
            });
            
            const firstName = customerProfile.first_name || 'Valued Customer';
            if (age >= 60) {
                setGreeting(`Dear ${firstName}, here are recommended senior-friendly plans for your health needs.`);
            } else if (age < 35) {
                setGreeting(`Dear ${firstName}, start your health journey with these affordable plans.`);
            } else {
                setGreeting(`Dear ${firstName}, here are personalized recommendations based on your profile.`);
            }
            
            setMlStatus('Ready');
            
        } catch (err) {
            console.error('Error fetching recommendations:', err);
            setError('Unable to load recommendations. Please try again.');
            setRecommendations([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl p-8 border border-blue-100">
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="relative">
                        <Loader className="h-12 w-12 text-blue-600 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-blue-400 animate-pulse" />
                        </div>
                    </div>
                    <p className="mt-4 text-gray-600 font-medium">{mlStatus}</p>
                    <p className="text-xs text-gray-400 mt-1">Using AI recommendation engine</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                <p className="text-amber-800">{error}</p>
                <button 
                    onClick={fetchRecommendations}
                    className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* AI Header */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <Sparkles className="h-7 w-7" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">AI-Powered Recommendations</h2>
                            <p className="text-blue-100 text-sm mt-0.5">
                                Personalized based on your profile • {mlStatus === 'Ready' || mlStatus === 'AI Active' ? 'Active' : mlStatus}
                                {aiMetadata?.source === 'openai' && (
                                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                                        <Sparkles className="h-2 w-2" />
                                        OpenAI
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchRecommendations}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 text-sm font-medium backdrop-blur-sm"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <div className="flex items-center gap-1.5 text-xs bg-white/15 px-3 py-1.5 rounded-full backdrop-blur-sm">
                            <TrendingUp className="h-3 w-3" />
                            <span>{aiMetadata?.source === 'openai' ? 'AI Powered' : 'Recommendations'}</span>
                        </div>
                    </div>
                </div>
                <p className="text-blue-100 text-sm mt-4 pl-1 border-l-2 border-white/30 pl-3">{greeting}</p>
                {aiMetadata?.source === 'openai' && aiMetadata?.insights?.confidence_score && (
                    <div className="mt-3 text-xs text-blue-200 flex items-center gap-2">
                        <span>🤖 AI Confidence: {aiMetadata.insights.confidence_score}%</span>
                        <span>•</span>
                        <span>🧠 Model: GPT-3.5 Turbo</span>
                    </div>
                )}
            </div>

            {/* Recommendations Grid - WITH NO RECOMMENDATIONS MESSAGE */}
            {recommendations.length === 0 ? (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-8 border border-green-200 text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="h-10 w-10 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-green-800 mb-2">All Protected! 🎉</h3>
                    <p className="text-green-700 text-lg mb-2">
                        You've purchased all available insurance plans.
                    </p>
                    <p className="text-green-600 mb-4">
                        Your family is fully protected! 🛡️
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-green-600 mb-4">
                        <CheckCircle className="h-4 w-4" />
                        <span>You own all available plans</span>
                    </div>
                    <button 
                        onClick={() => onViewPolicies && onViewPolicies()}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                        View My Policies
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {recommendations.map((rec, index) => (
                        <div
                            key={rec.plan_id}
                            className="group bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                        >
                            {/* Score Badge */}
                            <div className="relative">
                                <div className={`absolute top-3 right-3 bg-gradient-to-r ${getScoreColor(rec.match_percentage)} text-white text-xs font-bold px-2.5 py-1 rounded-full z-10 shadow-sm`}>
                                    {rec.match_percentage}% Match
                                </div>
                                <div className="p-5 pb-3">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br from-blue-100 to-sky-50">
                                        {rec.premium_amount === 0 ? (
                                            <Shield className="h-6 w-6 text-emerald-600" />
                                        ) : index === 0 ? (
                                            <Star className="h-6 w-6 text-amber-500" />
                                        ) : (
                                            <Heart className="h-6 w-6 text-blue-600" />
                                        )}
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{rec.plan_name}</h3>
                                    <p className="text-xs text-gray-500 mt-0.5 capitalize">{rec.policy_type || 'Health'}</p>
                                    {rec.ai_generated && (
                                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-blue-500">
                                            <Sparkles className="h-2 w-2" />
                                            AI Recommended
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Price */}
                            <div className="px-5 py-3 bg-gray-50 border-y border-gray-100">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-gray-900">{formatCurrency(rec.premium_amount)}</span>
                                    {rec.premium_amount > 0 && <span className="text-xs text-gray-500">/month</span>}
                                </div>
                                <div className="text-xs text-emerald-600 mt-0.5 font-medium">
                                    Coverage: {formatCurrency(rec.coverage_amount)}
                                </div>
                            </div>
                            
                            {/* Match Reasons */}
                            <div className="px-5 py-3 min-h-[70px] bg-white">
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    {rec.match_reasons}
                                </p>
                            </div>
                            
                            {/* Action Button */}
                            <div className="px-5 pb-5 pt-0">
                                <button
                                    onClick={() => onSelectPlan(rec)}
                                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2 group-hover:gap-3"
                                >
                                    Select Plan <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* AI Info Footer */}
            <div className="text-center">
                <p className="text-xs text-gray-400">
                    {aiMetadata?.source === 'openai' 
                        ? '🧠 AI recommendations powered by OpenAI GPT-3.5 Turbo • Real-time intelligent analysis'
                        : '📊 Recommendations based on your profile and preferences'
                    }
                </p>
            </div>
        </div>
    );
}

export default AIRecommendations;