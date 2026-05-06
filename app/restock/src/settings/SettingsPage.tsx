import * as React from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Stack,
  Divider,
  Alert,
  Chip,
  CircularProgress,
  Paper,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import HomeIcon from "@mui/icons-material/Home";
import { useAuth } from "../auth/AuthContext";
import { fetchTenantMembers, type TenantWithMembers } from "../auth/tenantApi";
import {
  fetchMyStores,
  createStore,
  updateStore,
  deleteStore,
  type Store,
} from "../products/services/storesApi";

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="overline" color="text.secondary" sx={{ display: "block", mt: 2, mb: 1 }}>
    {children}
  </Typography>
);

export const SettingsPage: React.FC = () => {
  const { firebaseUser } = useAuth();

  const getToken = React.useCallback(
    () => (firebaseUser ? firebaseUser.getIdToken() : Promise.resolve(null)),
    [firebaseUser]
  );

  // Tenant + members
  const [tm, setTm] = React.useState<TenantWithMembers | null>(null);
  const [tenantError, setTenantError] = React.useState<string | null>(null);

  // Stores
  const [stores, setStores] = React.useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = React.useState(true);
  const [storesError, setStoresError] = React.useState<string | null>(null);
  const [newName, setNewName] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");

  React.useEffect(() => {
    if (!firebaseUser) return;
    fetchTenantMembers(getToken)
      .then(setTm)
      .catch((e) => setTenantError(e?.message || "Failed to load tenant"));
  }, [firebaseUser, getToken]);

  const reloadStores = React.useCallback(async () => {
    setStoresLoading(true);
    setStoresError(null);
    try {
      setStores(await fetchMyStores(getToken));
    } catch (e: any) {
      setStoresError(e?.message || "Failed to load stores");
    } finally {
      setStoresLoading(false);
    }
  }, [getToken]);

  React.useEffect(() => {
    if (firebaseUser) reloadStores();
  }, [firebaseUser, reloadStores]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setStoresError(null);
    try {
      const created = await createStore(name, getToken);
      setStores((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
    } catch (e: any) {
      setStoresError(e?.message || "Failed to add store");
    }
  };

  const startEdit = (s: Store) => {
    setEditingId(s._id);
    setEditingName(s.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveEdit = async (id: string) => {
    const name = editingName.trim();
    if (!name) return;
    setStoresError(null);
    try {
      const updated = await updateStore(id, name, getToken);
      setStores((prev) =>
        prev.map((s) => (s._id === id ? updated : s)).sort((a, b) => a.name.localeCompare(b.name))
      );
      cancelEdit();
    } catch (e: any) {
      setStoresError(e?.message || "Failed to update store");
    }
  };

  const handleDelete = async (id: string) => {
    setStoresError(null);
    try {
      await deleteStore(id, getToken);
      setStores((prev) => prev.filter((s) => s._id !== id));
    } catch (e: any) {
      setStoresError(e?.message || "Failed to delete store");
    }
  };

  return (
    <Box sx={{ pb: 10 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Settings
      </Typography>

      {/* Tenant header */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: "primary.main" }}>
            <HomeIcon />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap>
              {tm?.tenant.name || (tenantError ? "—" : "Loading…")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tenant ID: {tm?.tenant._id || "…"}
            </Typography>
          </Box>
        </Stack>
        {tenantError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {tenantError}
          </Alert>
        )}
      </Paper>

      {/* Members */}
      <SectionHeading>Members</SectionHeading>
      {!tm ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
          <CircularProgress size={20} />
        </Box>
      ) : (
        <List dense disablePadding>
          {tm.members.map((m) => (
            <ListItem key={m.userId} disableGutters>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: m.role === "owner" ? "primary.light" : "grey.400" }}>
                  <PersonIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Typography variant="body2" fontWeight={500}>
                      {m.fullName || m.email || m.userId}
                    </Typography>
                    {m.isYou && <Chip size="small" label="You" />}
                    <Chip
                      size="small"
                      label={m.role}
                      color={m.role === "owner" ? "primary" : "default"}
                      variant="outlined"
                    />
                  </Stack>
                }
                secondary={m.email && m.email !== m.fullName ? m.email : null}
              />
            </ListItem>
          ))}
        </List>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Stores */}
      <SectionHeading>Preferred stores</SectionHeading>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        Stores are shared across everyone in this tenant.
      </Typography>

      {storesError && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {storesError}
        </Alert>
      )}

      <Box component="form" onSubmit={handleAdd} sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            placeholder="Add a store..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            fullWidth
          />
          <Button type="submit" variant="contained" disabled={!newName.trim()}>
            Add
          </Button>
        </Stack>
      </Box>

      {storesLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <CircularProgress size={20} />
        </Box>
      ) : stores.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
          No stores yet.
        </Typography>
      ) : (
        <List dense>
          {stores.map((s) => (
            <ListItem
              key={s._id}
              disableGutters
              secondaryAction={
                editingId === s._id ? (
                  <>
                    <IconButton edge="end" size="small" onClick={() => saveEdit(s._id)}>
                      <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton edge="end" size="small" onClick={cancelEdit}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <IconButton edge="end" size="small" onClick={() => startEdit(s)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton edge="end" size="small" onClick={() => handleDelete(s._id)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </>
                )
              }
            >
              {editingId === s._id ? (
                <TextField
                  size="small"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  autoFocus
                  fullWidth
                />
              ) : (
                <ListItemText primary={s.name} />
              )}
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};
