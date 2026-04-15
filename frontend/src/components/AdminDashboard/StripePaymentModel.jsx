// frontend/src/components/AdminDashboard/StripePaymentModal.jsx

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements,
    CardElement
} from '@stripe/react-stripe-js';
import axios from 'axios';
import { API_BASE_URL, getAxiosConfig } from '../../config';
import { X, CreditCard, Lock } from 'lucide-react';

// Load Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// Payment form component
const PaymentForm = ({ commission, onSuccess, onClose }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [clientSecret, setClientSecret] = useState(null);
    
    useEffect(() => {
        // Create payment intent when component mounts
        createPaymentIntent();
    }, []);
    
    const createPaymentIntent = async () => {
    try {
        console.log('Commission object:', commission);
        console.log('Commission ID being sent:', commission.commission_id);
        
        const config = getAxiosConfig();
        const response = await axios.post(
            `${API_BASE_URL}/payments/commissions/${commission.commission_id}/pay`,
            {
                amount: commission.amount,
                agentId: commission.agent_id
            },
            config
        );
            
            setClientSecret(response.data.clientSecret);
        } catch (error) {
            console.error('Error creating payment intent:', error);
            setError('Failed to initialize payment. Please try again.');
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!stripe || !elements) {
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: elements.getElement(CardElement),
                    billing_details: {
                        name: `Commission Payment - ${commission.agent_name}`,
                    },
                },
            });
            
            if (paymentError) {
                setError(paymentError.message);
                setLoading(false);
            } else if (paymentIntent.status === 'succeeded') {
                // Confirm payment with backend
                await axios.post(
                    `${API_BASE_URL}/payments/confirm-payment`,
                    { paymentIntentId: paymentIntent.id },
                    getAxiosConfig()
                );
                
                onSuccess();
            }
        } catch (error) {
            console.error('Payment error:', error);
            setError('Payment failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    
    
    const cardElementOptions = {
        style: {
            base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                    color: '#aab7c4',
                },
            },
            invalid: {
                color: '#9e2146',
            },
        },
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Commission Amount:</span>
                    <span className="text-xl font-bold text-green-600">
    ${parseFloat(commission.amount).toFixed(2)}
</span>
                </div>
                <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Agent:</span>
                    <span className="font-medium">{commission.agent_name}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Policy ID:</span>
                    <span className="font-mono">#{commission.policy_id}</span>
                </div>
            </div>
            
            <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">Card Details</span>
                </div>
                <CardElement options={cardElementOptions} />
            </div>
            
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg">
                    {error}
                </div>
            )}
            
            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={!stripe || loading || !clientSecret}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Processing...
                        </>
                    ) : (
                        <>
                            <Lock className="h-4 w-4" />
                            Pay ${parseFloat(commission.amount).toFixed(2)}
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

// Main modal component
function StripePaymentModal({ commission, isOpen, onClose, onSuccess }) {
    if (!isOpen || !commission) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold">Pay Commission</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="p-6">
                    <Elements stripe={stripePromise}>
                        <PaymentForm
                            commission={commission}
                            onSuccess={() => {
                                onSuccess();
                                onClose();
                            }}
                            onClose={onClose}
                        />
                    </Elements>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-b-xl text-xs text-gray-500 text-center">
                    <Lock className="h-3 w-3 inline mr-1" />
                    Secure payment powered by Stripe
                </div>
            </div>
        </div>
    );
}

export default StripePaymentModal;