import * as React from "react";
import { Container, AppBar, Toolbar, Typography, IconButton, CircularProgress, Box } from "@mui/material";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LogoutIcon from "@mui/icons-material/Logout";
import { ProductManager } from "./products/components/ProductManager";
import { useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";
import { InvitationBanner } from "./auth/InvitationBanner";

export default function App() {
  const { firebaseUser, loading, logout } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!firebaseUser) {
    return <LoginPage />;
  }

  return (
    <>
      <AppBar position="sticky" color="primary" enableColorOnDark>
        <Toolbar variant="dense">
          <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 1 }}>
            <Inventory2OutlinedIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Stokify
          </Typography>
          <IconButton color="inherit" onClick={logout} aria-label="sign out" size="small">
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 2 }}>
        <InvitationBanner />
        <ProductManager />
      </Container>
    </>
  );
}
