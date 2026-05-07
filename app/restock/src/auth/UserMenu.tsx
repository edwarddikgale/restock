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
import CheckIcon from "@mui/icons-material/Check";
import HomeWorkOutlinedIcon from "@mui/icons-material/HomeWorkOutlined";
import { useAuth } from "./AuthContext";

function initialsFor(name?: string | null, email?: string | null): string {
  const source = (name && name.trim()) || (email && email.split("@")[0]) || "?";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const UserMenu: React.FC = () => {
  const {
    firebaseUser,
    userProfile,
    tenant,
    tenants,
    activeTenantId,
    switchTenant,
    logout,
  } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  if (!firebaseUser) return null;

  const open = Boolean(anchorEl);
  // Prefer the user's chosen displayName, then fullName, then Firebase, then email.
  const displayName =
    userProfile?.displayName ||
    userProfile?.fullName ||
    firebaseUser.displayName ||
    firebaseUser.email ||
    "Account";
  const email = userProfile?.email || firebaseUser.email || "";
  const photoURL = firebaseUser.photoURL || undefined;

  const close = () => setAnchorEl(null);

  const handleSwitch = async (tenantId: string) => {
    close();
    if (tenantId === activeTenantId) return;
    await switchTenant(tenantId);
  };

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
        onClose={close}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        slotProps={{ paper: { sx: { minWidth: 260, mt: 0.5 } } }}
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
        </Box>

        <Divider />

        {/* Tenants — always visible if we have at least one */}
        {tenants.length > 0 && [
          <Typography
            key="tenants-label"
            variant="overline"
            color="text.secondary"
            sx={{ display: "block", px: 2, pt: 1, pb: 0.25, lineHeight: 1.4 }}
          >
            Workspaces
          </Typography>,
          ...tenants.map((t) => {
            const isActive = t._id === activeTenantId;
            return (
              <MenuItem key={t._id} onClick={() => handleSwitch(t._id)} selected={isActive}>
                <ListItemIcon>
                  {isActive ? <CheckIcon fontSize="small" /> : <HomeWorkOutlinedIcon fontSize="small" />}
                </ListItemIcon>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: isActive ? 600 : 400 }}>
                    {t.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t.role}
                  </Typography>
                </Box>
              </MenuItem>
            );
          }),
          <Divider key="tenants-divider" sx={{ mt: 0.5 }} />,
        ]}

        {/* Fallback hint when only the legacy single-tenant case was loaded */}
        {tenants.length === 0 && tenant && (
          <Box sx={{ px: 2, pb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {tenant.name}
            </Typography>
          </Box>
        )}

        <MenuItem
          onClick={async () => {
            close();
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
