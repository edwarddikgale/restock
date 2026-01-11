import * as React from "react";
import { Container, AppBar, Toolbar, Typography, IconButton } from "@mui/material";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { ProductManager } from "./products/components/ProductManager";

export default function App() {
  return (
    <>
      <AppBar position="sticky" color="primary" enableColorOnDark>
        <Toolbar variant="dense">
          <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 1 }}>
            <Inventory2OutlinedIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Home Stock Tracker
          </Typography>
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 2 }}>
        <ProductManager />
      </Container>
    </>
  );
}
