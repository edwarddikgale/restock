import * as React from "react";
import {
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  Paper,
  Checkbox,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import KeyboardOutlinedIcon from "@mui/icons-material/KeyboardOutlined";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import {
  parseIntake,
  applyIntakeFill,
  applyIntakeShopping,
  type MatchedItem,
} from "../services/intakeApi";
import { useProducts } from "../state/products";
import { useShoppingList } from "../state/shopping";

type SourceTab = "text" | "voice" | "receipt";
type Destination = "fill" | "shopping";

interface SelectedItem extends MatchedItem {
  selected: boolean;
  // The productId the user wants to apply this match to; null means treat as freeText/skip on fill.
  chosenProductId: string | null;
}

const PLACEHOLDERS: Record<SourceTab, string> = {
  text:
    "Type or paste a list of items, e.g.:\n  bananas\n  whole milk\n  sourdough bread",
  voice: "Tap the mic and speak the items you bought or need…",
  receipt:
    "Paste the full receipt text here. Item names in other languages are fine — we'll translate.",
};

// ---------- voice helpers ----------

type SpeechRecognitionClass = any; // not in standard lib types

function getSpeechRecognition(): SpeechRecognitionClass | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export const IntakePage: React.FC = () => {
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();
  const { loadAll: reloadProducts } = useProducts();
  const { reload: reloadShopping } = useShoppingList();

  const [tab, setTab] = React.useState<SourceTab>("text");
  const [rawText, setRawText] = React.useState("");
  const [recording, setRecording] = React.useState(false);
  const recognitionRef = React.useRef<any>(null);

  const [parsing, setParsing] = React.useState(false);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<SelectedItem[] | null>(null);

  const [destination, setDestination] = React.useState<Destination>("fill");
  const [applying, setApplying] = React.useState(false);
  const [applyResult, setApplyResult] = React.useState<string | null>(null);

  // -------- voice recognition lifecycle --------
  const startRecording = () => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setParseError("Voice input isn't supported on this browser — try typing.");
      return;
    }
    const rec = new SR();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    let finalText = rawText ? rawText + "\n" : "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + "\n";
        else interim += t;
      }
      setRawText(finalText + interim);
    };
    rec.onerror = (e: any) => {
      setParseError(`Mic error: ${e.error || "unknown"}`);
      setRecording(false);
    };
    rec.onend = () => setRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  };
  const stopRecording = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };
  React.useEffect(() => () => recognitionRef.current?.stop(), []);

  // -------- parse --------
  const handleParse = async () => {
    if (!firebaseUser) return;
    const text = rawText.trim();
    if (!text) return;
    setParsing(true);
    setParseError(null);
    setApplyResult(null);
    try {
      const parsed = await parseIntake(text, () => firebaseUser.getIdToken());
      setItems(
        parsed.map<SelectedItem>((p) => ({
          ...p,
          selected: true,
          chosenProductId: p.bestMatchId,
        }))
      );
      if (parsed.length === 0) {
        setParseError("No items detected. Try adding more detail or a different format.");
      }
    } catch (e: any) {
      setParseError(e?.message || "Failed to parse");
    } finally {
      setParsing(false);
    }
  };

  // -------- apply --------
  const handleApply = async () => {
    if (!firebaseUser || !items) return;
    const picked = items.filter((i) => i.selected);
    if (picked.length === 0) return;
    setApplying(true);
    setApplyResult(null);
    try {
      if (destination === "fill") {
        const productIds = picked
          .map((i) => i.chosenProductId)
          .filter((id): id is string => !!id);
        const res = await applyIntakeFill(productIds, () => firebaseUser.getIdToken());
        setApplyResult(`Marked ${res.filledCount} ${res.filledCount === 1 ? "product" : "products"} as filled.`);
        await reloadProducts(true);
      } else {
        const payload = picked.map((i) =>
          i.chosenProductId
            ? { productId: i.chosenProductId, qty: i.quantity ?? undefined }
            : { freeText: i.name, qty: i.quantity ?? undefined }
        );
        const res = await applyIntakeShopping(payload, () => firebaseUser.getIdToken());
        setApplyResult(`Added ${res.addedCount} ${res.addedCount === 1 ? "item" : "items"} to your shopping list.`);
        await reloadShopping();
      }
      setItems(null);
      setRawText("");
    } catch (e: any) {
      setApplyResult(e?.message || "Failed to apply");
    } finally {
      setApplying(false);
    }
  };

  const toggleItem = (idx: number) =>
    setItems((prev) =>
      prev
        ? prev.map((it, i) => (i === idx ? { ...it, selected: !it.selected } : it))
        : prev
    );

  const matchedCount = items?.filter((i) => i.selected && i.chosenProductId).length ?? 0;
  const unmatchedCount = items?.filter((i) => i.selected && !i.chosenProductId).length ?? 0;

  // The "fill" action can only act on matched items; warn if user has unmatched selected.
  const fillUnavailable = destination === "fill" && matchedCount === 0;

  return (
    <Box sx={{ pb: 9 }}>
      {/* Back */}
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
        <IconButton size="small" onClick={() => navigate(-1)} aria-label="Back" sx={{ ml: -1 }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="caption" color="text.secondary">
          Back
        </Typography>
      </Stack>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25 }}>
        Smart intake
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Type, speak, or paste a receipt. We'll match items to your products so you can refill stock or build a shopping list in one tap.
      </Typography>

      {/* Source tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{ minHeight: 36, mb: 1, "& .MuiTab-root": { minHeight: 36, fontSize: "0.78rem" } }}
      >
        <Tab value="text" label="Type" icon={<KeyboardOutlinedIcon fontSize="small" />} iconPosition="start" />
        <Tab value="voice" label="Voice" icon={<GraphicEqIcon fontSize="small" />} iconPosition="start" />
        <Tab value="receipt" label="Receipt" icon={<ReceiptLongOutlinedIcon fontSize="small" />} iconPosition="start" />
      </Tabs>

      {/* Input area */}
      <Stack spacing={1}>
        <TextField
          multiline
          minRows={tab === "receipt" ? 6 : 4}
          maxRows={14}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={PLACEHOLDERS[tab]}
          fullWidth
        />

        {tab === "voice" && (
          <Stack direction="row" spacing={1} alignItems="center">
            {!recording ? (
              <Button startIcon={<MicIcon />} onClick={startRecording} variant="contained" color="primary">
                Start recording
              </Button>
            ) : (
              <Button startIcon={<StopIcon />} onClick={stopRecording} variant="contained" color="error">
                Stop
              </Button>
            )}
            {recording && (
              <Typography variant="caption" color="text.secondary">
                Listening…
              </Typography>
            )}
          </Stack>
        )}

        <Stack direction="row" spacing={1}>
          <Button
            onClick={handleParse}
            variant="contained"
            disabled={parsing || !rawText.trim()}
          >
            {parsing ? <CircularProgress size={18} color="inherit" /> : "Find items"}
          </Button>
          {items && (
            <Button onClick={() => { setItems(null); setApplyResult(null); }} variant="text">
              Clear
            </Button>
          )}
        </Stack>

        {parseError && (
          <Alert severity="warning">{parseError}</Alert>
        )}
        {applyResult && (
          <Alert severity="success">{applyResult}</Alert>
        )}
      </Stack>

      {/* Preview */}
      {items && items.length > 0 && (
        <Box sx={{ mt: 2.5 }}>
          <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 0.5, fontWeight: 600 }}>
            Detected items
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            {matchedCount} matched · {unmatchedCount} unmatched
          </Typography>

          <Paper variant="outlined" sx={{ borderRadius: 2 }}>
            {items.map((it, idx) => {
              const matchName = it.candidates[0]?.name;
              return (
                <Box
                  key={`${it.name}-${idx}`}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    px: 0.5,
                    py: 0.5,
                    borderTop: idx === 0 ? "none" : "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Checkbox
                    checked={it.selected}
                    onChange={() => toggleItem(idx)}
                    size="small"
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                        {matchName || it.name}
                      </Typography>
                      {it.chosenProductId ? (
                        <CheckCircleOutlineIcon fontSize="small" color="success" />
                      ) : (
                        <HelpOutlineIcon fontSize="small" color="warning" />
                      )}
                      {it.quantity && (
                        <Chip
                          label={`${it.quantity}${it.measure ? " " + it.measure : ""}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: "0.65rem", height: 18 }}
                        />
                      )}
                    </Stack>
                    {(it.originalName || (matchName && matchName !== it.name)) && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", fontStyle: "italic", lineHeight: 1.2 }}
                        noWrap
                      >
                        {it.originalName || it.name}
                        {it.originalLanguage ? ` · ${it.originalLanguage}` : ""}
                      </Typography>
                    )}
                    {!it.chosenProductId && (
                      <Typography variant="caption" color="warning.main" sx={{ display: "block", lineHeight: 1.2 }}>
                        No matching product
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Paper>

          {/* Destination */}
          <Stack spacing={1.25} sx={{ mt: 2 }}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={destination}
              onChange={(_, v) => v && setDestination(v)}
              fullWidth
            >
              <ToggleButton value="fill">I bought these · refill stock</ToggleButton>
              <ToggleButton value="shopping">I need these · add to shopping</ToggleButton>
            </ToggleButtonGroup>

            {destination === "fill" && unmatchedCount > 0 && (
              <Alert severity="info">
                {unmatchedCount} unmatched {unmatchedCount === 1 ? "item is" : "items are"} selected
                but can't refill stock (no linked product). They'll be skipped.
                Switch to "Add to shopping" if you'd rather add them as loose items.
              </Alert>
            )}

            <Button
              variant="contained"
              size="large"
              onClick={handleApply}
              disabled={applying || fillUnavailable || items.filter((i) => i.selected).length === 0}
            >
              {applying ? <CircularProgress size={20} color="inherit" /> : "Apply"}
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
};
