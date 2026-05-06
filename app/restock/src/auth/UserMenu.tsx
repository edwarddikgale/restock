import * as React from "react";
import {
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Typography,
  Divider,
  ListItemIcon,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "./AuthContext";

function initialsFor(name?: string | null, email?: string | null): string {
  const source = (name && name.trim()) || (email && email.split("@")[0]) || "?";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const UserMenu: React.FC = () => {
  const { firebaseUser, userProfile, tenant, logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  if (!firebaseUser) return null;

  const open = Boolean(anchorEl);
  const displayName = userProfile?.fullName || firebaseUser.displayName || firebaseUser.email || "Account";
  const email = userProfile?.email || firebaseUser.email || "";
  const photoURL = firebaseUser.photoURL || undefined;

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label="Account menu"
        aria-haspopup="true"
        aria-expanded={open}
        sx={{ p: 0.25 }}
      >
        <Avatar
          src={photoURL}
          alt={displayName}
          sx={{
            width: 30,
            height: 30,
            fontSize: "0.85rem",
            bgcolor: "primary.dark",
          }}
        >
          {initialsFor(displayName, email)}
        </Avatar>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        slotProps={{ paper: { sx: { minWidth: 240, mt: 0.5 } } }}
      >
        {/* Identity block (not clickable) */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
            {displayName}
          </Typography>
          {email && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
              {email}
            </Typography>
          )}
          {tenant && (
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ display: "block", mt: 0.25 }}
            >
              {tenant.name}
            </Typography>
          )}
        </Box>

        <Divider />

        <MenuItem
          onClick={async () => {
            setAnchorEl(null);
            await logout();
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>
    </>
  );
};
