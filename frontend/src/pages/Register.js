import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Paper,
  Divider,
  Alert,
  MenuItem,
} from "@mui/material";
import { Email, Lock, Person, Phone, CalendarMonth } from "@mui/icons-material";

const Register = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    dob: "",
    password: "",
    confirmPassword: "",
    accountType: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // VALIDATION
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.phone ||
      !formData.email ||
      !formData.dob ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.accountType
    ) {
      setError("All fields are required.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!/^\d{10}$/.test(formData.phone)) {
      setError("Phone number must be 10 digits.");
      return;
    }

    setError("");
    setLoading(true);

    setTimeout(() => {
      navigate("/login");
      setLoading(false);
    }, 1200);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc" }}>
      <Container maxWidth="sm">
        <Box sx={{ py: 8 }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 5 },
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "white",
            }}
          >
            {/* LOGO AREA */}
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <img
                src="/favicon.png"
                alt="HealthInsura360"
                style={{ width: 80, marginBottom: 16 }}
              />

              <Typography variant="h4" fontWeight={700} color="#0a2540">
                Create Your Account
              </Typography>
              <Typography variant="body1" color="#64748b">
                Join HealthInsura360 today
              </Typography>
            </Box>

            {/* ERROR ALERT */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* FORM */}
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                margin="normal"
                InputProps={{
                  startAdornment: <Person sx={{ mr: 1, color: "#94a3b8" }} />,
                }}
              />

              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                margin="normal"
                InputProps={{
                  startAdornment: <Person sx={{ mr: 1, color: "#94a3b8" }} />,
                }}
              />

              <TextField
                fullWidth
                label="Phone Number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                margin="normal"
                InputProps={{
                  startAdornment: <Phone sx={{ mr: 1, color: "#94a3b8" }} />,
                }}
              />

              <TextField
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                margin="normal"
                InputProps={{
                  startAdornment: <Email sx={{ mr: 1, color: "#94a3b8" }} />,
                }}
              />

              <TextField
                fullWidth
                label="Date of Birth"
                name="dob"
                type="date"
                value={formData.dob}
                onChange={handleChange}
                required
                margin="normal"
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <CalendarMonth sx={{ mr: 1, color: "#94a3b8" }} />
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Create Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                margin="normal"
                InputProps={{
                  startAdornment: <Lock sx={{ mr: 1, color: "#94a3b8" }} />,
                }}
              />

              <TextField
                fullWidth
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                margin="normal"
                InputProps={{
                  startAdornment: <Lock sx={{ mr: 1, color: "#94a3b8" }} />,
                }}
              />

              <TextField
                select
                fullWidth
                label="Select Account Type"
                name="accountType"
                value={formData.accountType}
                onChange={handleChange}
                required
                margin="normal"
              >
                <MenuItem value="customer">Customer / Policyholder</MenuItem>
                <MenuItem value="hospital">Hospital Representative</MenuItem>
                <MenuItem value="agent">Agent</MenuItem>
              </TextField>

              {/* SUBMIT BUTTON */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  mt: 3,
                  py: 1.5,
                  borderRadius: 2,
                  bgcolor: "#0cc0df",
                  fontWeight: 600,
                  "&:hover": { bgcolor: "#0aa9c4" },
                }}
                startIcon={
                  loading ? <CircularProgress size={20} color="inherit" /> : null
                }
              >
                {loading ? "Creating..." : "Create Account"}
              </Button>
            </form>

            <Divider sx={{ my: 4 }}>
              <Typography variant="body2" color="#94a3b8">
                OR
              </Typography>
            </Divider>

            <Box textAlign="center">
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
                  "&:hover": {
                    borderColor: "#0aa9c4",
                    bgcolor: "#f0faff",
                  },
                }}
              >
                Sign In
              </Button>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default Register;
