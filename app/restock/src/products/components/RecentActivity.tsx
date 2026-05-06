import * as React from "react";
import { Box, Typography, Stack, Chip } from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { fetchRecentHistory, type ProductHistoryEntry } from "../services/historyApi";
import humanDate from "../../common/utils/date/humanDate";

function summarizeChanges(entry: ProductHistoryEntry): string {
  if (!entry.changes || entry.changes.length === 0) return "updated";
  const pct = entry.changes.find((c) => c.field === "percentageLeft");
  if (pct) {
    const from = Math.round(Number(pct.from ?? 0));
    const to = Math.round(Number(pct.to ?? 0));
    return `% left ${from}→${to}`;
  }
  return entry.changes.map((c) => c.field).join(", ");
}

interface Props {
  limit?: number;
}

export const RecentActivity: React.FC<Props> = ({ limit = 5 }) => {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = React.useState<ProductHistoryEntry[]>([]);

  React.useEffect(() => {
    if (!firebaseUser) return;
    fetchRecentHistory(limit, () => firebaseUser.getIdToken())
      .then(setEntries)
      .catch(() => setEntries([]));
  }, [firebaseUser, limit]);

  if (entries.length === 0) return null;

  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
        <HistoryIcon fontSize="small" color="action" />
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          Recent activity
        </Typography>
      </Stack>
      <Stack spacing={0.25}>
        {entries.map((e) => (
          <Box
            key={e._id}
            onClick={() => navigate(`/product/${e.productId}`)}
            sx={{
              cursor: "pointer",
              fontSize: "0.78rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
              "&:hover": { textDecoration: "underline" },
            }}
          >
            <Box sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <strong>{e.productName}</strong>{" "}
              <Box component="span" sx={{ color: "text.secondary" }}>
                — {summarizeChanges(e)}
              </Box>
            </Box>
            <Chip
              label={humanDate(e.createdAt)}
              size="small"
              variant="outlined"
              sx={{ fontSize: "0.65rem", height: 20 }}
            />
          </Box>
        ))}
      </Stack>
    </Box>
  );
};
