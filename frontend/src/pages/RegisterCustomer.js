import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Paper,
  Alert,
  Grid,
  InputAdornment,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  Card,
  IconButton,
  Stack,
} from "@mui/material";
import {
  Email,
  Lock,
  Person,
  Phone,
  CalendarMonth,
  Home,
  LocationCity,
  LocationOn,
  Map,
  CheckCircle,
  ArrowBack,
  MedicalServices,
  Visibility,
  VisibilityOff,
  AttachMoney,
  People,
  MonetizationOn,
  Favorite,
} from "@mui/icons-material";

const steps = ['Account Details', 'Personal Information', 'Confirmation'];

const Register = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordMatch, setPasswordMatch] = useState(false);
  const [ageError, setAgeError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [formData, setFormData] = useState({
    // Step 1
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    
    // Step 2
    gender: "",
    dob: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    
    // NEW: Financial & Health Information for AI Recommendations
    monthlyBudget: "",
    familySize: "",
    annualIncome: "",
    healthScore: "",
  });

  // Password validation function
  const validatePassword = (password) => {
    if (!password) return '';
    
    const errors = [];
    if (password.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
    if (!/\d/.test(password)) errors.push('One number');
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) errors.push('One special character');
    
    return errors.length === 0 ? '' : errors.join(', ');
  };

  // Check password match
  useEffect(() => {
    if (formData.password && formData.confirmPassword) {
      setPasswordMatch(formData.password === formData.confirmPassword);
    } else {
      setPasswordMatch(false);
    }
  }, [formData.password, formData.confirmPassword]);

  // Validate password on change
  useEffect(() => {
    setPasswordError(validatePassword(formData.password));
  }, [formData.password]);

  // Age validation (must be 18+)
  const validateAge = (dob) => {
    if (!dob) return '';
    
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 18) {
      return 'You must be at least 18 years old';
    }
    return '';
  };

  // Validate age on change
  useEffect(() => {
    setAgeError(validateAge(formData.dob));
  }, [formData.dob]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Toggle password visibility
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleNext = () => {
    // Validate current step before moving forward
    if (activeStep === 0) {
      // Step 1 validations
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword) {
        setError("Please fill all required fields in Step 1");
        return;
      }
      if (passwordError) {
        setError(`Password requirements not met: ${passwordError}`);
        return;
      }
      if (!passwordMatch) {
        setError("Passwords do not match");
        return;
      }
      setError("");
    } else if (activeStep === 1) {
      // Step 2 validations - existing required fields
      if (!formData.gender || !formData.dob || !formData.phone || !formData.street || !formData.city || !formData.state || !formData.zipCode) {
        setError("Please fill all required fields in Step 2");
        return;
      }
      if (ageError) {
        setError(ageError);
        return;
      }
      if (!/^\d{10}$/.test(formData.phone)) {
        setError("Phone number must be 10 digits");
        return;
      }
      if (!/^\d{5,6}$/.test(formData.zipCode)) {
        setError("Zip code must be 5-6 digits");
        return;
      }
      
      // Optional: Validate new fields (not required, but validate if provided)
      if (formData.monthlyBudget && parseFloat(formData.monthlyBudget) < 0) {
        setError("Monthly budget cannot be negative");
        return;
      }
      if (formData.familySize && parseInt(formData.familySize) < 1) {
        setError("Family size must be at least 1");
        return;
      }
      if (formData.annualIncome && parseFloat(formData.annualIncome) < 0) {
        setError("Annual income cannot be negative");
        return;
      }
      if (formData.healthScore && (parseFloat(formData.healthScore) < 0 || parseFloat(formData.healthScore) > 10)) {
        setError("Health score must be between 0 and 10");
        return;
      }
      
      setError("");
    }
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Prepare data for backend - MATCHING YOUR BACKEND EXPECTATIONS
      const customerData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        gender: formData.gender,
        email: formData.email,
        phone: formData.phone,
        dob: formData.dob,
        password: formData.password,
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zipcode: formData.zipCode,
        // NEW: Financial & Health Information for AI Recommendations
        monthly_budget: formData.monthlyBudget ? parseFloat(formData.monthlyBudget) : 10000,
        family_size: formData.familySize ? parseInt(formData.familySize) : 1,
        annual_income: formData.annualIncome ? parseFloat(formData.annualIncome) : 0,
        health_score: formData.healthScore ? parseFloat(formData.healthScore) : 0.7
      };

      console.log('Sending to backend:', customerData);

      const response = await fetch('http://localhost:5000/api/auth/register/customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setLoading(false);
      setSuccess('Account created successfully! Redirecting to login...');
      
      localStorage.setItem('tempUserEmail', formData.email);
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };


  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Stack spacing={3} sx={{ width: '100%', maxWidth: 500, mx: 'auto' }}>
            {/* Name fields side by side */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              variant="outlined"
              size="medium"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: "#94a3b8", mr: 1 }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Password fields side by side */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                error={!!passwordError && formData.password.length > 0}
                helperText={formData.password.length > 0 ? passwordError : "Min 8 chars: A-Z, a-z, 0-9, special"}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        edge="end"
                        size="large"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                FormHelperTextProps={{
                  sx: { 
                    color: passwordError ? '#f44336' : '#666',
                    fontWeight: 500,
                    fontSize: '0.8rem'
                  }
                }}
              />

              <TextField
                fullWidth
                label="Confirm Password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                error={formData.confirmPassword.length > 0 && !passwordMatch}
                helperText={
                  formData.confirmPassword.length > 0 
                    ? (passwordMatch ? "✓ Passwords match" : "✗ Passwords do not match")
                    : "Re-enter your password"
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle confirm password visibility"
                        onClick={handleClickShowConfirmPassword}
                        edge="end"
                        size="large"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                FormHelperTextProps={{
                  sx: { 
                    color: passwordMatch && formData.confirmPassword ? '#4caf50' : '#f44336',
                    fontWeight: 500
                  }
                }}
              />
            </Box>

            {/* Password Requirements Box */}
            {formData.password.length > 0 && (
              <Box sx={{ 
                bgcolor: '#f8fafc', 
                p: 3, 
                borderRadius: 2,
                border: '1px solid #e2e8f0',
                mt: 1
              }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#0a2540' }}>
                  Password Requirements:
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ 
                        width: 20, 
                        height: 20, 
                        borderRadius: '50%', 
                        bgcolor: formData.password.length >= 8 ? '#4caf50' : '#e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 1.5
                      }}>
                        {formData.password.length >= 8 ? '✓' : ''}
                      </Box>
                      <Typography variant="body2" sx={{ 
                        color: formData.password.length >= 8 ? '#4caf50' : '#666',
                        fontWeight: formData.password.length >= 8 ? 600 : 400
                      }}>
                        At least 8 characters
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ 
                        width: 20, 
                        height: 20, 
                        borderRadius: '50%', 
                        bgcolor: /[A-Z]/.test(formData.password) ? '#4caf50' : '#e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 1.5
                      }}>
                        {/[A-Z]/.test(formData.password) ? '✓' : ''}
                      </Box>
                      <Typography variant="body2" sx={{ 
                        color: /[A-Z]/.test(formData.password) ? '#4caf50' : '#666',
                        fontWeight: /[A-Z]/.test(formData.password) ? 600 : 400
                      }}>
                        One uppercase letter
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ 
                        width: 20, 
                        height: 20, 
                        borderRadius: '50%', 
                        bgcolor: /[a-z]/.test(formData.password) ? '#4caf50' : '#e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 1.5
                      }}>
                        {/[a-z]/.test(formData.password) ? '✓' : ''}
                      </Box>
                      <Typography variant="body2" sx={{ 
                        color: /[a-z]/.test(formData.password) ? '#4caf50' : '#666',
                        fontWeight: /[a-z]/.test(formData.password) ? 600 : 400
                      }}>
                        One lowercase letter
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ 
                        width: 20, 
                        height: 20, 
                        borderRadius: '50%', 
                        bgcolor: /\d/.test(formData.password) ? '#4caf50' : '#e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 1.5
                      }}>
                        {/\d/.test(formData.password) ? '✓' : ''}
                      </Box>
                      <Typography variant="body2" sx={{ 
                        color: /\d/.test(formData.password) ? '#4caf50' : '#666',
                        fontWeight: /\d/.test(formData.password) ? 600 : 400
                      }}>
                        One number
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ 
                        width: 20, 
                        height: 20, 
                        borderRadius: '50%', 
                        bgcolor: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password) ? '#4caf50' : '#e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 1.5
                      }}>
                        {/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password) ? '✓' : ''}
                      </Box>
                      <Typography variant="body2" sx={{ 
                        color: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password) ? '#4caf50' : '#666',
                        fontWeight: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password) ? 600 : 400
                      }}>
                        One special character
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Stack>
        );

      case 1:
        return (
          <Stack spacing={3} sx={{ width: '100%', maxWidth: 500, mx: 'auto' }}>
            {/* Gender and DOB side by side */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                select
                fullWidth
                label="Gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      sx: {
                        maxHeight: 300,
                      },
                    },
                  },
                }}
              >
                <MenuItem value="male" sx={{ py: 1.5 }}>Male</MenuItem>
                <MenuItem value="female" sx={{ py: 1.5 }}>Female</MenuItem>
                <MenuItem value="other" sx={{ py: 1.5 }}>Other</MenuItem>
                <MenuItem value="prefer-not-to-say" sx={{ py: 1.5 }}>Prefer not to say</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Date of Birth"
                name="dob"
                type="date"
                value={formData.dob}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                InputLabelProps={{ shrink: true }}
                error={!!ageError && formData.dob.length > 0}
                helperText={formData.dob.length > 0 ? (ageError || "Must be 18+ years") : ""}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarMonth sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <TextField
              fullWidth
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              variant="outlined"
              size="medium"
              helperText="10 digits required"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Phone sx={{ color: "#94a3b8", mr: 1 }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Street Address"
              name="street"
              value={formData.street}
              onChange={handleChange}
              required
              variant="outlined"
              size="medium"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Home sx={{ color: "#94a3b8", mr: 1 }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* City and State side by side */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="City"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationCity sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="State"
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOn sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <TextField
              fullWidth
              label="Zip Code"
              name="zipCode"
              value={formData.zipCode}
              onChange={handleChange}
              required
              variant="outlined"
              size="medium"
              helperText="5-6 digits"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Map sx={{ color: "#94a3b8", mr: 1 }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* NEW SECTION: Financial & Health Information */}
            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 600, color: '#0a2540' }}>
              Financial & Health Information (Optional - Improves AI Recommendations)
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Monthly Budget ($.)"
                name="monthlyBudget"
                type="number"
                value={formData.monthlyBudget}
                onChange={handleChange}
                variant="outlined"
                size="medium"
                helperText="Recommended monthly premium budget"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MonetizationOn sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Family Size"
                name="familySize"
                type="number"
                value={formData.familySize}
                onChange={handleChange}
                variant="outlined"
                size="medium"
                helperText="Number of family members"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <People sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Annual Income ($.)"
                name="annualIncome"
                type="number"
                value={formData.annualIncome}
                onChange={handleChange}
                variant="outlined"
                size="medium"
                helperText="Your yearly income"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoney sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                select
                fullWidth
                label="Health Score"
                name="healthScore"
                value={formData.healthScore}
                onChange={handleChange}
                variant="outlined"
                size="medium"
                helperText="Rate your overall health (1-10)"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Favorite sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="10">Excellent (10) - Very healthy, no issues</MenuItem>
                <MenuItem value="9">Very Good (9) - Minor issues only</MenuItem>
                <MenuItem value="8">Good (8) - Generally healthy</MenuItem>
                <MenuItem value="7">Above Average (7) - Some minor concerns</MenuItem>
                <MenuItem value="6">Fair (6) - Occasional health issues</MenuItem>
                <MenuItem value="5">Average (5) - Some health concerns</MenuItem>
                <MenuItem value="4">Below Average (4) - Regular health issues</MenuItem>
                <MenuItem value="3">Poor (3) - Existing conditions</MenuItem>
                <MenuItem value="2">Very Poor (2) - Multiple conditions</MenuItem>
                <MenuItem value="1">Critical (1) - Chronic conditions</MenuItem>
              </TextField>
            </Box>

            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, textAlign: 'center' }}>
              💡 Providing this information helps our AI recommend the most suitable policies for you.
            </Typography>
          </Stack>
        );

      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircle sx={{ fontSize: 60, color: '#4caf50', mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight={600}>
              Review Your Information
            </Typography>
            <Typography variant="body1" color="#64748b" paragraph>
              Please review your information before creating your account.
            </Typography>

            <Card sx={{ 
              p: 3, 
              textAlign: 'left', 
              bgcolor: '#f8fafc', 
              border: '1px solid #e2e8f0',
              maxWidth: 500,
              mx: 'auto'
            }}>
              <Typography variant="subtitle1" gutterBottom>
                <strong style={{ color: '#0a2540' }}>Name:</strong> {formData.firstName} {formData.lastName}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong style={{ color: '#0a2540' }}>Email:</strong> {formData.email}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong style={{ color: '#0a2540' }}>Gender:</strong> {formData.gender}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong style={{ color: '#0a2540' }}>Date of Birth:</strong> {formData.dob}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong style={{ color: '#0a2540' }}>Phone:</strong> {formData.phone}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong style={{ color: '#0a2540' }}>Address:</strong> {formData.street}, {formData.city}, {formData.state} {formData.zipCode}
              </Typography>
              
              {/* NEW: Show Financial & Health Information if provided */}
              {(formData.monthlyBudget || formData.familySize || formData.annualIncome || formData.healthScore) && (
                <>
                  <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 600, color: '#0a2540' }}>
                    Financial & Health Profile:
                  </Typography>
                  {formData.monthlyBudget && (
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>Monthly Budget:</strong> ${parseInt(formData.monthlyBudget).toLocaleString()}
                    </Typography>
                  )}
                  {formData.familySize && (
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>Family Size:</strong> {formData.familySize}
                    </Typography>
                  )}
                  {formData.annualIncome && (
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>Annual Income:</strong> ${parseInt(formData.annualIncome).toLocaleString()}
                    </Typography>
                  )}
                  {formData.healthScore && (
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>Health Score:</strong> {formData.healthScore}/10
                    </Typography>
                  )}
                </>
              )}
            </Card>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      bgcolor: "#f8fafc", 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      py: 4 
    }}>
      <Container maxWidth="md">
        <Paper
          className="register-form"
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            bgcolor: "white",
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* LOGO AREA */}
          <Box sx={{ textAlign: "center", mb: 4, width: '100%' }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              mb: 3 
            }}>
              <img
                src="/HealthInsura360.png"
                alt="HealthInsura360 Logo"
                style={{ 
                  width: 200, 
                  height: 'auto',
                  objectFit: 'contain',
                  marginBottom: 0
                }}
                onError={(e) => {
                  console.log('Logo image not found');
                  e.target.style.display = 'none';
                  document.getElementById('fallback-logo').style.display = 'flex';
                }}
              />
              
              <Box 
                id="fallback-logo"
                sx={{ 
                  display: 'none',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <MedicalServices sx={{ 
                  fontSize: 64, 
                  color: "#0cc0df",
                  mb: 1
                }} />
                <Typography variant="h3" fontWeight={800} color="#0a2540">
                  HealthInsura360
                </Typography>
              </Box>
            </Box>
            
            <Typography variant="h4" fontWeight={700} color="#0a2540" gutterBottom>
              Create Your Customer Account
            </Typography>
            <Typography variant="body1" color="#64748b">
              Register as a policyholder in 3 simple steps
            </Typography>
          </Box>

          {/* STEPPER - Centered */}
          <Box sx={{ width: '100%', mb: 5, display: 'flex', justifyContent: 'center' }}>
            <Stepper activeStep={activeStep} sx={{ maxWidth: 600, width: '100%' }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* ERROR/SUCCESS ALERTS - Centered */}
          <Box sx={{ width: '100%', maxWidth: 500, mb: 3 }}>
            {error && (
              <Alert severity="error" sx={{ borderRadius: 2, textAlign: 'left' }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ borderRadius: 2, textAlign: 'left' }}>
                {success}
              </Alert>
            )}
          </Box>

          {/* FORM CONTENT */}
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ width: '100%', maxWidth: 500 }}>
              <form onSubmit={activeStep === steps.length - 1 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
                {renderStepContent(activeStep)}

                {/* NAVIGATION BUTTONS */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 6 }}>
                  <Button
                    disabled={activeStep === 0 || loading}
                    onClick={handleBack}
                    variant="outlined"
                    startIcon={<ArrowBack />}
                    sx={{
                      borderColor: '#e2e8f0',
                      color: '#425466',
                      borderRadius: 2,
                      px: 4,
                      py: 1.5
                    }}
                  >
                    Back
                  </Button>

                  {activeStep === steps.length - 1 ? (
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading || !!passwordError || !!ageError || !passwordMatch}
                      startIcon={loading ? <CircularProgress size={20} /> : null}
                      sx={{
                        px: 5,
                        py: 1.5,
                        borderRadius: 2,
                        bgcolor: "#0cc0df",
                        fontWeight: 600,
                        fontSize: "1rem",
                        "&:hover": { bgcolor: "#0aa9c4" },
                        "&.Mui-disabled": {
                          bgcolor: "#e2e8f0",
                          color: "#94a3b8"
                        }
                      }}
                    >
                      {loading ? "Creating Account..." : "Create Account"}
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      variant="contained"
                      sx={{
                        px: 5,
                        py: 1.5,
                        borderRadius: 2,
                        bgcolor: "#0cc0df",
                        fontWeight: 600,
                        fontSize: "1rem",
                        "&:hover": { bgcolor: "#0aa9c4" }
                      }}
                    >
                      Next
                    </Button>
                  )}
                </Box>
              </form>
            </Box>
          </Box>

          {/* ALTERNATIVE REGISTRATION OPTIONS */}
          <Box sx={{ width: '100%', maxWidth: 500, mt: 5, pt: 3, borderTop: "1px solid #e2e8f0", textAlign: 'center' }}>
            <Typography variant="h6" fontWeight={600} color="#0a2540" gutterBottom>
              Looking for a different account?
            </Typography>
            <Typography variant="body2" color="#64748b" sx={{ mb: 3 }}>
              If you are an Insurance Agent or Hospital Representative:
            </Typography>
            
            <Stack spacing={2} sx={{ width: '100%' }}>
              <Button
                component={Link}
                to="/register-agent"
                variant="outlined"
                fullWidth
                sx={{
                  borderColor: "#4caf50",
                  color: "#4caf50",
                  borderRadius: 2,
                  fontWeight: 600,
                  py: 1.5,
                  "&:hover": {
                    borderColor: "#388e3c",
                    bgcolor: "#e8f5e9",
                  },
                }}
              >
                Register as Agent
              </Button>
              <Button
                component={Link}
                to="/register-hospital"
                variant="outlined"
                fullWidth
                sx={{
                  borderColor: "#ff9800",
                  color: "#ff9800",
                  borderRadius: 2,
                  fontWeight: 600,
                  py: 1.5,
                  "&:hover": {
                    borderColor: "#f57c00",
                    bgcolor: "#fff3e0",
                  },
                }}
              >
                Register as Hospital
              </Button>
            </Stack>
          </Box>

          {/* ALREADY HAVE ACCOUNT */}
          <Box sx={{ width: '100%', maxWidth: 500, mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="#64748b" sx={{ mb: 2 }}>
              Already have an account?
            </Typography>

            <Button
              component={Link}
              to="/login"
              variant="outlined"
              fullWidth
              sx={{
                borderColor: "#0cc0df",
                color: "#0cc0df",
                borderRadius: 2,
                fontWeight: 600,
                py: 1.5,
                "&:hover": {
                  borderColor: "#0aa9c4",
                  bgcolor: "#f0faff",
                },
              }}
            >
              Sign In to Existing Account
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Register;