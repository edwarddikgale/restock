import * as React from "react";
import {
  Box,
  Stack,
  Typography,
  Paper,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Collapse,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { fetchArchivedShoppingLists, type ShoppingList } from "../services/shoppingApi";
import humanDate from "../../common/utils/date/humanDate";

const PAGE_SIZE = 10;

export const ShoppingHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();
  const [lists, setLists] = React.useState<ShoppingList[]>([]);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const load = React.useCallback(
    async (p: number) => {
      if (!firebaseUser) return;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchArchivedShoppingLists(p, PAGE_SIZE, () =>
          firebaseUser.getIdToken()
        );
        setLists(data.lists);
        setTotalPages(Math.max(1, data.pagination.totalPages));
        setPage(data.pagination.page);
      } catch (e: any) {
        setError(e?.message || "Failed to load history");
      } finally {
        setLoading(false);
      }
    },
    [firebaseUser]
  );

  React.useEffect(() => {
    load(1);
  }, [load]);

  return (
    <Box sx={{ pb: "calc(72px + env(safe-area-inset-bottom, 0px))" }}>
      {/* Back to active shopping */}
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
        <IconButton size="small" onClick={() => navigate(-1)} aria-label="Back" sx={{ ml: -1 }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="caption" color="text.secondary">
          Back to shopping
        </Typography>
      </Stack>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
        Past shopping lists
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}

      {loading && lists.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : lists.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 4, textAlign: "center" }}>
          No past lists yet — finish your first shop and it'll appear here.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {lists.map((l) => {
            const items = l.items || [];
            const checked = items.filter((i) => i.checked).length;
            const isOpen = expandedId === l._id;
            return (
              <Paper key={l._id} variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                <Box
                  onClick={() => setExpandedId(isOpen ? null : l._id)}
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    cursor: "pointer",
                    "&:active": { bgcolor: "action.hover" },
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                      {l.archivedAt ? humanDate(l.archivedAt) : "—"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {checked} of {items.length} {items.length === 1 ? "item" : "items"} bought
                    </Typography>
                  </Box>
                  <ExpandMoreIcon
                    sx={{
                      color: "text.secondary",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.18s",
                    }}
                  />
                </Box>

                <Collapse in={isOpen} unmountOnExit>
                  <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                    {items.length === 0 ? (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", px: 1.5, py: 1.25 }}
                      >
                        No items
                      </Typography>
                    ) : (
                      items.map((item, idx) => (
                        <Box
                          key={item._id}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            px: 1.5,
                            py: 0.75,
                            borderTop: idx === 0 ? "none" : "1px solid",
                            borderColor: "divider",
                            opacity: item.checked ? 1 : 0.6,
                          }}
                        >
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              textDecoration: item.checked ? "none" : "line-through",
                            }}
                          >
                            {item.product?.name || item.freeText || "Item"}
                          </Typography>
                          <Chip
                            label={item.checked ? "bought" : "not bought"}
                            size="small"
                            color={item.checked ? "success" : "default"}
                            variant={item.checked ? "filled" : "outlined"}
                            sx={{ fontSize: "0.65rem", height: 20, ml: 1 }}
                          />
                        </Box>
                      ))
                    )}
                  </Box>
                </Collapse>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <Stack
          direction="row"
          justifyContent="center"
          alignItems="center"
          spacing={2}
          sx={{ mt: 2.5 }}
        >
          <Button
            size="small"
            disabled={page <= 1 || loading}
            onClick={() => load(page - 1)}
          >
            Previous
          </Button>
          <Typography variant="caption" color="text.secondary">
            Page {page} of {totalPages}
          </Typography>
          <Button
            size="small"
            disabled={page >= totalPages || loading}
            onClick={() => load(page + 1)}
          >
            Next
          </Button>
        </Stack>
      )}
    </Box>
  );
};
