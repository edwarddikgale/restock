import * as React from "react";
import {
  Box,
  Button,
  Divider,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useAuth } from "./AuthContext";

export const LoginPage: React.FC = () => {
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const [mode, setMode] = React.useState<"login" | "signup">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err: any) {
      setError(err?.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        px: 2,
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 380 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 3 }}>
          <Box
            component="img"
            src="/stokify-logo.svg"
            alt="Stokify"
            sx={{ width: 36, height: 36 }}
          />
          <Typography
            component="div"
            sx={{
              fontFamily: "'Comfortaa', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: "1.85rem",
              letterSpacing: "0.02em",
            }}
          >
            Stokify
          </Typography>
        </Box>

        <Typography variant="h6" sx={{ mb: 2 }}>
          {mode === "login" ? "Sign in" : "Create account"}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            size="small"
            sx={{ mb: 1.5 }}
          />
          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            size="small"
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((v) => !v)}
                    edge="end"
                    size="small"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={busy}
            sx={{ mb: 1.5 }}
          >
            {busy ? <CircularProgress size={20} color="inherit" /> : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <Divider sx={{ my: 1.5 }}>or</Divider>

        <Button
          variant="outlined"
          fullWidth
          startIcon={<GoogleIcon />}
          onClick={handleGoogle}
          disabled={busy}
          sx={{ mb: 2 }}
        >
          Continue with Google
        </Button>

        <Typography variant="body2" align="center" color="text.secondary">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <Button
            variant="text"
            size="small"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            sx={{ p: 0, minWidth: 0, textTransform: "none" }}
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </Button>
        </Typography>
      </Box>
    </Box>
  );
};
