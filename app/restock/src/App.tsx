import * as React from "react";
import { Container, AppBar, Toolbar, Typography, CircularProgress, Box } from "@mui/material";
import { ProductManager } from "./products/components/ProductManager";
import { useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";
import { InvitationBanner } from "./auth/InvitationBanner";
import { UserMenu } from "./auth/UserMenu";

export default function App() {
  const { firebaseUser, loading } = useAuth();

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
          <Box
            component="img"
            src="/stokify-logo.svg"
            alt="Stokify"
            sx={{ width: 28, height: 28, mr: 1.25, borderRadius: 1 }}
          />
          <Typography
            component="div"
            noWrap
            sx={{
              flexGrow: 1,
              fontFamily: "'Comfortaa', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: "1.35rem",
              letterSpacing: "0.02em",
            }}
          >
            Stokify
          </Typography>
          <UserMenu />
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 2 }}>
        <InvitationBanner />
        <ProductManager />
      </Container>
    </>
  );
}
