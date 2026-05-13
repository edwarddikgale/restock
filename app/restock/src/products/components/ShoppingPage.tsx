import * as React from "react";
import {
  Box,
  Stack,
  Typography,
  Checkbox,
  Paper,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  Collapse,
  FormControlLabel,
  Switch,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import HistoryIcon from "@mui/icons-material/History";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useShoppingList } from "../state/shopping";
import { useProducts } from "../state/products";
import {
  updateShoppingItem,
  removeShoppingItem,
  finishShopping,
  type ShoppingItem,
} from "../services/shoppingApi";
import { fetchMySpaces, type Space } from "../services/spacesApi";
import humanDate from "../../common/utils/date/humanDate";

const UNCATEGORISED_KEY = "__loose__";

export const ShoppingPage: React.FC = () => {
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();
  const { list, loading, error, reload } = useShoppingList();
  const { loadAll: reloadProducts } = useProducts();
  const [spaces, setSpaces] = React.useState<Space[]>([]);
  const [pending, setPending] = React.useState<Record<string, boolean>>({});
  const [confirmFinish, setConfirmFinish] = React.useState(false);
  const [markAllFilled, setMarkAllFilled] = React.useState(true);
  const [finishing, setFinishing] = React.useState(false);
  const [showDone, setShowDone] = React.useState(false);

  React.useEffect(() => {
    if (!firebaseUser) return;
    fetchMySpaces(() => firebaseUser.getIdToken())
      .then(setSpaces)
      .catch(() => setSpaces([]));
  }, [firebaseUser]);

  const sectionNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    spaces.forEach((s) => m.set(s._id, s.name));
    return m;
  }, [spaces]);

  // Group items by section so users can shop aisle-by-aisle
  const grouped = React.useMemo(() => {
    if (!list) return new Map<string, ShoppingItem[]>();
    const map = new Map<string, ShoppingItem[]>();
    for (const item of list.items) {
      const key = item.product?.spaceId || UNCATEGORISED_KEY;
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    // Stable order: existing sections first by sortOrder, then loose items last
    return map;
  }, [list]);

  const total = list?.items.length ?? 0;
  const doneCount = list?.items.filter((i) => i.checked).length ?? 0;

  const toggleChecked = async (item: ShoppingItem) => {
    if (!firebaseUser) return;
    setPending((p) => ({ ...p, [item._id]: true }));
    const wasUnchecked = !item.checked; // about to become checked
    try {
      await updateShoppingItem(
        item._id,
        { checked: !item.checked },
        () => firebaseUser.getIdToken()
      );
      // Reload shopping; also reload products when checking off a linked product
      // (backend just set that product's percentageLeft to 100%).
      const reloads: Promise<any>[] = [reload()];
      if (wasUnchecked && item.productId) reloads.push(reloadProducts(true));
      await Promise.all(reloads);
    } finally {
      setPending((p) => {
        const { [item._id]: _omit, ...rest } = p;
        return rest;
      });
    }
  };

  const removeItem = async (item: ShoppingItem) => {
    if (!firebaseUser) return;
    setPending((p) => ({ ...p, [item._id]: true }));
    try {
      await removeShoppingItem(item._id, () => firebaseUser.getIdToken());
      await reload();
    } finally {
      setPending((p) => {
        const { [item._id]: _omit, ...rest } = p;
        return rest;
      });
    }
  };

  const handleFinish = async () => {
    if (!firebaseUser) return;
    setFinishing(true);
    try {
      await finishShopping({ markAllAsFilled: markAllFilled }, () => firebaseUser.getIdToken());
      // Refetch both shopping (now empty + archived) and products (backend just
      // bumped their percentageLeft to 100% when markAllFilled was on).
      await Promise.all([reload(), reloadProducts(true)]);
      setConfirmFinish(false);
    } finally {
      setFinishing(false);
    }
  };

  if (loading && !list) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 1 }}>
        {error}
      </Alert>
    );
  }

  if (!list) return null;

  const todoItems = list.items.filter((i) => !i.checked);
  const doneItems = list.items.filter((i) => i.checked);

  return (
    <Box sx={{ pb: 9 }}>
      {/* Header */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          mb: 2,
          background:
            "linear-gradient(135deg, rgba(26,115,232,0.04) 0%, rgba(26,115,232,0.10) 100%)",
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4 }}>
              Shopping list
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {total === 0 ? "Empty list" : `${doneCount} of ${total} done`}
            </Typography>
            {total > 0 && (
              <Typography variant="caption" color="text.secondary">
                Started {humanDate(list.createdAt)}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconButton
              size="small"
              onClick={() => navigate("/intake")}
              aria-label="Smart intake (type, voice, receipt)"
              title="Smart intake"
            >
              <AutoAwesomeIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => navigate("/shopping/history")}
              aria-label="View shopping history"
            >
              <HistoryIcon fontSize="small" />
            </IconButton>
            {total > 0 && (
              <Button
                variant="contained"
                size="small"
                startIcon={<ShoppingCartCheckoutIcon />}
                onClick={() => setConfirmFinish(true)}
                disabled={finishing}
              >
                Finish
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Empty state — point user to the product list */}
      {total === 0 && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Nothing on the list yet. Add items from your products.
          </Typography>
          <Button variant="outlined" onClick={() => navigate("/?tab=list")}>
            Open product list
          </Button>
        </Paper>
      )}

      {/* TO-DO items, grouped by section */}
      {todoItems.length > 0 && (
        <Stack spacing={1.5}>
          {[...new Set(todoItems.map((i) => i.product?.spaceId || UNCATEGORISED_KEY))].map((key) => {
            const itemsInGroup = todoItems.filter(
              (i) => (i.product?.spaceId || UNCATEGORISED_KEY) === key
            );
            const groupName =
              key === UNCATEGORISED_KEY ? "Other" : sectionNameById.get(key) || "Section";
            return (
              <Box key={key}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ display: "block", mb: 0.5, fontWeight: 600, letterSpacing: 0.5 }}
                >
                  {groupName}
                </Typography>
                <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                  {itemsInGroup.map((item, idx) => (
                    <Box
                      key={item._id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        px: 0.5,
                        py: 0.25,
                        borderTop: idx === 0 ? "none" : "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Checkbox
                        checked={item.checked}
                        onChange={() => toggleChecked(item)}
                        disabled={!!pending[item._id]}
                        size="medium"
                      />
                      <Box
                        sx={{ flex: 1, minWidth: 0, py: 0.5, cursor: "pointer" }}
                        onClick={() => toggleChecked(item)}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                          {item.product?.name || item.freeText || "Item"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.qty ? `${item.qty} · ` : ""}
                          added by {item.addedByName} · {humanDate(item.addedAt)}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => removeItem(item)}
                        disabled={!!pending[item._id]}
                        aria-label="Remove"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Paper>
              </Box>
            );
          })}
        </Stack>
      )}

      {/* Done items — collapsible footer */}
      {doneItems.length > 0 && (
        <Box sx={{ mt: 2.5 }}>
          <Divider sx={{ mb: 1 }} />
          <Box
            onClick={() => setShowDone((v) => !v)}
            sx={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {showDone ? "Hide" : "Show"} done ({doneItems.length})
            </Typography>
          </Box>
          <Collapse in={showDone}>
            <Paper variant="outlined" sx={{ borderRadius: 2 }}>
              {doneItems.map((item, idx) => (
                <Box
                  key={item._id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    px: 0.5,
                    py: 0.25,
                    borderTop: idx === 0 ? "none" : "1px solid",
                    borderColor: "divider",
                    opacity: 0.6,
                  }}
                >
                  <Checkbox
                    checked
                    onChange={() => toggleChecked(item)}
                    disabled={!!pending[item._id]}
                    size="medium"
                  />
                  <Box
                    sx={{ flex: 1, minWidth: 0, py: 0.5, cursor: "pointer" }}
                    onClick={() => toggleChecked(item)}
                  >
                    <Typography
                      variant="body2"
                      sx={{ textDecoration: "line-through" }}
                      noWrap
                    >
                      {item.product?.name || item.freeText || "Item"}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Paper>
          </Collapse>
        </Box>
      )}

      {/* Confirm finish dialog */}
      <Dialog open={confirmFinish} onClose={() => !finishing && setConfirmFinish(false)} fullWidth maxWidth="xs">
        <DialogTitle>Finish shopping?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1.5 }}>
            This list will be archived and a fresh empty list will start.
          </DialogContentText>

          <FormControlLabel
            control={
              <Switch
                checked={markAllFilled}
                onChange={(e) => setMarkAllFilled(e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Mark items as filled
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Sets every linked product to 100% stocked. Already-checked items
                  were filled when you ticked them.
                </Typography>
              </Box>
            }
          />

          {doneCount < total && !markAllFilled && (
            <Alert severity="info" sx={{ mt: 1.5 }}>
              {total - doneCount} {total - doneCount === 1 ? "item is" : "items are"} still
              unchecked. Their stock levels won't change — turn the toggle on if you want them
              all marked as filled too.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmFinish(false)} disabled={finishing}>
            Cancel
          </Button>
          <Button onClick={handleFinish} variant="contained" disabled={finishing}>
            {finishing ? "Finishing…" : "Finish"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
