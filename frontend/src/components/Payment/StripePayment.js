import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const StripePayment = ({ policyId, amount, policyName, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Add this debug code
console.log('🔍 DEBUG - Stripe Keys:');
console.log('  Publishable Key from env:', process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
console.log('  Stripe object exists:', !!stripe);
  const handleSubmit = async (event) => {
    event.preventDefault();
    setProcessing(true);
    setError(null);

    if (!stripe || !elements) {
      setError('Stripe not initialized. Please refresh the page.');
      setProcessing(false);
      return;
    }

    try {
      // Get auth token
      const token = localStorage.getItem('healthinsura360_token');
      if (!token) {
        setError('Please login again');
        setProcessing(false);
        return;
      }

      // Validate policyId
      if (!policyId) {
        setError('Policy ID is missing. Please try again.');
        setProcessing(false);
        return;
      }

      console.log('📤 Creating payment intent for:', { policyId, amount });

      // Create payment intent on backend
      const response = await axios.post(
        `${API_BASE_URL}/payments/create-payment-intent`,
        {
          policyId: policyId,
          amount: amount,
          currency: 'usd'
        },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('📦 Payment intent response:', response.data);

      const { clientSecret, paymentIntentId } = response.data;

      if (!clientSecret) {
        throw new Error('No client secret received from server');
      }

      console.log('💰 Confirming payment with client secret...');

      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: {
              name: localStorage.getItem('customerName') || 'Customer',
            },
          },
        }
      );

      if (stripeError) {
        console.error('❌ Stripe error:', stripeError);
        setError(stripeError.message);
        setProcessing(false);
        return;
      }

      console.log('✅ Payment confirmed:', paymentIntent.status);

      if (paymentIntent.status === 'succeeded') {
        // Notify backend that payment succeeded
        try {
          await axios.post(
            `${API_BASE_URL}/payments/confirm-payment-intent`,
            { 
              paymentIntentId: paymentIntent.id 
            },
            {
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          console.log('✅ Backend notified of successful payment');
        } catch (confirmError) {
          console.error('Error notifying backend:', confirmError);
          // Don't fail the payment if backend notification fails
        }

        onSuccess(paymentIntent);
      } else {
        setError(`Payment ${paymentIntent.status}. Please try again.`);
        setProcessing(false);
      }
    } catch (err) {
      console.error('❌ Payment error:', err);
      console.error('Error response:', err.response?.data);
      
      let errorMessage = 'Payment failed. Please try again.';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setProcessing(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Summary */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-700 mb-2">Payment Summary</h4>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">{policyName || 'Policy Premium'}</span>
          <span className="text-lg font-bold text-burgundy-600">{formatCurrency(amount)}</span>
        </div>
      </div>

      {/* Card Details */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Card Details
        </label>
        <div className="p-4 border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-burgundy-500 focus-within:border-transparent">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Test Card: 4242 4242 4242 4242 | Any future expiry | Any 3-digit CVC
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={!stripe || processing}
          className={`flex-1 px-4 py-3 bg-burgundy-600 text-white font-medium rounded-lg hover:bg-burgundy-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-burgundy-500 ${
            processing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {processing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            'Pay Now'
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default StripePayment;