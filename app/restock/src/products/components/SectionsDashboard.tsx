import * as React from "react";
import {
  Box,
  Card,
  Stack,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Button,
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { fetchMySectionsSummary, type SectionSummary } from "../services/spacesApi";
import humanDate from "../../common/utils/date/humanDate";

// ---------- helpers ----------

function pluralize(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

const StockBar: React.FC<{ low: number; mid: number; full: number; height?: number }> = ({
  low,
  mid,
  full,
  height = 8,
}) => {
  const total = low + mid + full;
  const lowPct = total === 0 ? 0 : (low / total) * 100;
  const midPct = total === 0 ? 0 : (mid / total) * 100;
  const fullPct = total === 0 ? 0 : (full / total) * 100;
  return (
    <Box
      sx={{
        display: "flex",
        height,
        borderRadius: height / 2,
        overflow: "hidden",
        bgcolor: "rgba(0,0,0,0.06)",
        gap: 0.25,
      }}
    >
      {lowPct > 0 && <Box sx={{ width: `${lowPct}%`, bgcolor: "error.main" }} />}
      {midPct > 0 && <Box sx={{ width: `${midPct}%`, bgcolor: "warning.main" }} />}
      {fullPct > 0 && <Box sx={{ width: `${fullPct}%`, bgcolor: "success.main" }} />}
    </Box>
  );
};

const Dot: React.FC<{ color: "error.main" | "warning.main" | "success.main" }> = ({ color }) => (
  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
);

const StatLegend: React.FC<{
  low: number;
  mid: number;
  full: number;
  size?: "sm" | "md";
}> = ({ low, mid, full, size = "sm" }) => {
  const fontSize = size === "md" ? "0.85rem" : "0.72rem";
  const Item: React.FC<{ color: any; count: number; label: string }> = ({
    color,
    count,
    label,
  }) => (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
      <Dot color={color} />
      <Typography variant="caption" sx={{ fontSize, fontWeight: 600 }}>
        {count}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize }}>
        {label}
      </Typography>
    </Stack>
  );
  return (
    <Stack direction="row" spacing={1.25} sx={{ flexWrap: "wrap", rowGap: 0.5 }}>
      <Item color="error.main" count={low} label="low" />
      <Item color="warning.main" count={mid} label="on hand" />
      <Item color="success.main" count={full} label="full" />
    </Stack>
  );
};

// ---------- main ----------

export const SectionsDashboard: React.FC = () => {
  const { firebaseUser, tenant } = useAuth();
  const navigate = useNavigate();
  const [sections, setSections] = React.useState<SectionSummary[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!firebaseUser) return;
    fetchMySectionsSummary(() => firebaseUser.getIdToken())
      .then(setSections)
      .catch((e) => setError(e?.message || "Failed to load sections"));
  }, [firebaseUser]);

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 1 }}>
        {error}
      </Alert>
    );
  }

  if (sections === null) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  // Aggregate totals across all sections for the hero card
  const totals = sections.reduce(
    (acc, s) => ({
      items: acc.items + s.stats.items,
      runningLow: acc.runningLow + s.stats.runningLow,
      onHand: acc.onHand + s.stats.onHand,
      fullyStocked: acc.fullyStocked + s.stats.fullyStocked,
    }),
    { items: 0, runningLow: 0, onHand: 0, fullyStocked: 0 }
  );

  const openSection = (s: SectionSummary) => {
    navigate(`/?tab=list&sectionId=${encodeURIComponent(s._id)}`);
  };

  return (
    <Box sx={{ pb: "calc(72px + env(safe-area-inset-bottom, 0px))" }}>
      {/* ---------- Hero overview ---------- */}
      <Paper
        variant="outlined"
        sx={{
          p: 2.25,
          borderRadius: 2,
          mb: 2.5,
          background:
            "linear-gradient(135deg, rgba(26,115,232,0.04) 0%, rgba(26,115,232,0.10) 100%)",
        }}
      >
        <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4 }}>
          Workspace
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, mb: 0.25 }}>
          {tenant?.name || "—"}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.75 }}>
          {pluralize(totals.items, "item")} · {pluralize(sections.length, "section")}
        </Typography>

        {totals.items > 0 ? (
          <>
            <StockBar
              low={totals.runningLow}
              mid={totals.onHand}
              full={totals.fullyStocked}
              height={10}
            />
            <Box sx={{ mt: 1.25 }}>
              <StatLegend
                low={totals.runningLow}
                mid={totals.onHand}
                full={totals.fullyStocked}
                size="md"
              />
            </Box>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Nothing tracked yet — add your first product to get started.
          </Typography>
        )}
      </Paper>

      {/* ---------- Sections list ---------- */}
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: "block", mb: 1, fontWeight: 600, letterSpacing: 0.5 }}
      >
        Sections
      </Typography>

      {sections.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
          No sections yet. Create one in Settings.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {sections.map((s) => {
            const isEmpty = s.stats.items === 0;

            return (
              <Card
                key={s._id}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "transform 0.12s ease, box-shadow 0.12s ease",
                  "&:active": { transform: "scale(0.997)", bgcolor: "action.hover" },
                }}
                onClick={() => openSection(s)}
              >
                <Box sx={{ px: 1.75, pt: 1.5, pb: 1.5 }}>
                  {/* Header row: name + items count + chevron, all baseline-aligned */}
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: isEmpty ? 0 : 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="subtitle1"
                        noWrap
                        sx={{ fontWeight: 700, lineHeight: 1.2, letterSpacing: 0.1 }}
                      >
                        {s.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pluralize(s.stats.items, "item")}
                      </Typography>
                    </Box>
                    <ChevronRightIcon sx={{ color: "text.secondary", flexShrink: 0 }} />
                  </Stack>

                  {isEmpty ? (
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                        No items yet
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AddIcon fontSize="small" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/add?sectionId=${encodeURIComponent(s._id)}`);
                        }}
                        sx={{ flexShrink: 0 }}
                      >
                        Add product
                      </Button>
                    </Stack>
                  ) : (
                    <>
                      <StockBar
                        low={s.stats.runningLow}
                        mid={s.stats.onHand}
                        full={s.stats.fullyStocked}
                      />
                      <Box sx={{ mt: 1 }}>
                        <StatLegend
                          low={s.stats.runningLow}
                          mid={s.stats.onHand}
                          full={s.stats.fullyStocked}
                        />
                      </Box>

                      {s.lastActivity && (
                        <>
                          <Divider sx={{ my: 1.25 }} />
                          <Stack
                            direction="row"
                            spacing={0.75}
                            alignItems="center"
                            sx={{ minWidth: 0 }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ flexShrink: 0 }}
                            >
                              Last activity
                            </Typography>
                            <Typography
                              variant="caption"
                              noWrap
                              sx={{ flex: 1, minWidth: 0, fontWeight: 500 }}
                            >
                              {s.lastActivity.productName}
                            </Typography>
                            <Chip
                              label={humanDate(s.lastActivity.lastUpdatedOn)}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: "0.65rem", height: 20, flexShrink: 0 }}
                            />
                          </Stack>
                        </>
                      )}
                    </>
                  )}
                </Box>
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};
