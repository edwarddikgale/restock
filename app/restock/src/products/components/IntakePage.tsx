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
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import {
  parseIntake,
  parseIntakeImage,
  applyIntakeFill,
  applyIntakeShopping,
  type MatchedItem,
} from "../services/intakeApi";
import { useProducts } from "../state/products";
import { useShoppingList } from "../state/shopping";
import { fetchMySpaces, type Space } from "../services/spacesApi";

type SourceTab = "text" | "voice" | "receipt";
type Destination = "fill" | "shopping";

interface SelectedItem extends MatchedItem {
  selected: boolean;
  // The productId the user wants to apply this match to; null means treat as freeText/skip on fill.
  chosenProductId: string | null;
  // User-editable quantity (defaults to AI-extracted quantity, falling back to 1)
  editedQuantity: number;
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

/**
 * Reads a File into an HTMLImage, draws it onto a canvas resized so the longer
 * edge is `maxDim` (no upscaling), and returns a JPEG data URL.
 *
 * We do this client-side so phone-camera photos (often 3-10 MB) become
 * ~300-800 KB, cutting upload time and OpenAI Vision token costs.
 */
async function fileToResizedDataUrl(
  file: File,
  maxDim = 1600,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not get canvas context"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Could not load image"));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
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

  // Receipt image state
  const [imageDataUrl, setImageDataUrl] = React.useState<string | null>(null);
  const [imageBusy, setImageBusy] = React.useState(false);

  // Sections — used as the "where do new (unmatched) items go" picker
  const [spaces, setSpaces] = React.useState<Space[]>([]);
  const [newItemSpaceId, setNewItemSpaceId] = React.useState<string>("");

  React.useEffect(() => {
    if (!firebaseUser) return;
    fetchMySpaces(() => firebaseUser.getIdToken())
      .then((loaded) => {
        setSpaces(loaded);
        if (loaded.length > 0) setNewItemSpaceId(loaded[0]._id);
      })
      .catch(() => setSpaces([]));
  }, [firebaseUser]);

  const [parsing, setParsing] = React.useState(false);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<SelectedItem[] | null>(null);
  const [store, setStore] = React.useState<string | null>(null);

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

  // -------- image upload --------
  const handleImagePick = async (file: File | null) => {
    if (!file) return;
    setImageBusy(true);
    setParseError(null);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setImageDataUrl(dataUrl);
    } catch (e: any) {
      setParseError(e?.message || "Could not read image");
    } finally {
      setImageBusy(false);
    }
  };

  // -------- parse --------
  const handleParse = async () => {
    if (!firebaseUser) return;
    setParsing(true);
    setParseError(null);
    setApplyResult(null);
    try {
      let parsed: { store: string | null; items: MatchedItem[] };
      if (tab === "receipt" && imageDataUrl) {
        // Receipt photo path — OpenAI Vision does OCR + parsing in one call
        parsed = await parseIntakeImage(imageDataUrl, () => firebaseUser.getIdToken());
      } else {
        const text = rawText.trim();
        if (!text) {
          setParsing(false);
          return;
        }
        parsed = await parseIntake(text, () => firebaseUser.getIdToken());
      }
      setStore(parsed.store);
      setItems(
        parsed.items.map<SelectedItem>((p) => ({
          ...p,
          selected: true,
          chosenProductId: p.bestMatchId,
          editedQuantity:
            typeof p.quantity === "number" && p.quantity > 0 ? p.quantity : 1,
        }))
      );
      if (parsed.items.length === 0) {
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
        const fillItems = picked
          .filter((i) => !!i.chosenProductId)
          .map((i) => ({
            productId: i.chosenProductId as string,
            quantity: i.editedQuantity,
            price: typeof i.price === "number" ? i.price : undefined,
            measure: i.measure ?? undefined,
          }));
        // Unmatched picked items become brand-new products at 100% in the
        // chosen section.
        const newItems = picked
          .filter((i) => !i.chosenProductId)
          .map((i) => ({
            name: i.name,
            synonym: i.originalName,
            measureType: i.measure || "Units",
            defaultQuantity: i.editedQuantity > 0 ? i.editedQuantity : 1,
            spaceId: newItemSpaceId,
            quantity: i.editedQuantity,
            price: typeof i.price === "number" ? i.price : undefined,
            measure: i.measure ?? undefined,
          }));
        const res = await applyIntakeFill(
          {
            store: store || undefined,
            source: tab === "voice" ? "voice" : tab === "text" ? "text" : "receipt",
            items: fillItems,
            newItems,
          },
          () => firebaseUser.getIdToken()
        );
        const parts: string[] = [];
        if (res.filledCount) parts.push(`${res.filledCount} refilled`);
        if (res.createdCount) parts.push(`${res.createdCount} created at 100%`);
        if (res.mergedCount) parts.push(`${res.mergedCount} merged into existing`);
        setApplyResult(parts.length ? parts.join(" · ") : "Nothing to do.");
        await reloadProducts(true);
      } else {
        const payload = picked.map((i) =>
          i.chosenProductId
            ? { productId: i.chosenProductId, qty: i.editedQuantity }
            : { freeText: i.name, qty: i.editedQuantity }
        );
        const res = await applyIntakeShopping(payload, () => firebaseUser.getIdToken());
        setApplyResult(`Added ${res.addedCount} ${res.addedCount === 1 ? "item" : "items"} to your shopping list.`);
        await reloadShopping();
      }
      setItems(null);
      setStore(null);
      setRawText("");
      setImageDataUrl(null);
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

  const adjustQuantity = (idx: number, delta: number) =>
    setItems((prev) =>
      prev
        ? prev.map((it, i) =>
            i === idx
              ? { ...it, editedQuantity: Math.max(1, Math.round((it.editedQuantity + delta) * 100) / 100) }
              : it
          )
        : prev
    );

  const matchedCount = items?.filter((i) => i.selected && i.chosenProductId).length ?? 0;
  const unmatchedCount = items?.filter((i) => i.selected && !i.chosenProductId).length ?? 0;

  // Fill action: matched items refill stock, unmatched ones get created at 100%
  // in the chosen section. So it's available whenever ANY items are selected.
  const fillUnavailable =
    destination === "fill" && unmatchedCount > 0 && !newItemSpaceId;

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
        {tab === "receipt" && (
          <>
            {/* Photo picker — uses native camera on mobile via capture=environment */}
            {!imageDataUrl ? (
              <Button
                component="label"
                variant="outlined"
                startIcon={imageBusy ? <CircularProgress size={16} /> : <PhotoCameraOutlinedIcon />}
                disabled={imageBusy}
                fullWidth
                sx={{ py: 1.25 }}
              >
                {imageBusy ? "Processing…" : "Take or upload receipt photo"}
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    handleImagePick(e.target.files?.[0] || null);
                    // Reset so the same file can be re-selected if needed
                    e.target.value = "";
                  }}
                />
              </Button>
            ) : (
              <Paper variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Box
                    component="img"
                    src={imageDataUrl}
                    alt="Receipt preview"
                    sx={{
                      width: 80,
                      height: 100,
                      objectFit: "cover",
                      borderRadius: 1,
                      flexShrink: 0,
                      bgcolor: "action.hover",
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Receipt photo ready
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tap "Find items" to extract.
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => setImageDataUrl(null)}
                    aria-label="Remove image"
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Paper>
            )}

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textAlign: "center", display: "block" }}
            >
              — or paste receipt text below —
            </Typography>
          </>
        )}

        <TextField
          multiline
          minRows={tab === "receipt" ? 4 : 4}
          maxRows={14}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={PLACEHOLDERS[tab]}
          fullWidth
          // Don't make the user type if they've already attached a photo
          disabled={tab === "receipt" && !!imageDataUrl}
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
            disabled={
              parsing ||
              imageBusy ||
              (tab === "receipt" && imageDataUrl
                ? false
                : !rawText.trim())
            }
          >
            {parsing ? <CircularProgress size={18} color="inherit" /> : "Find items"}
          </Button>
          {(items || imageDataUrl) && (
            <Button
              onClick={() => {
                setItems(null);
                setStore(null);
                setApplyResult(null);
                setImageDataUrl(null);
              }}
              variant="text"
            >
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
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1, flexWrap: "wrap" }}>
            <Typography variant="caption" color="text.secondary">
              {matchedCount} matched · {unmatchedCount} unmatched
            </Typography>
            {store && (
              <Chip
                size="small"
                icon={<StorefrontOutlinedIcon sx={{ fontSize: 14 }} />}
                label={store}
                variant="outlined"
                sx={{ fontSize: "0.7rem", height: 22 }}
              />
            )}
          </Stack>

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
                      {typeof it.price === "number" && it.price > 0 && (
                        <Chip
                          label={it.price.toFixed(2)}
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
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0}
                    sx={{ ml: 0.5, mr: 0.25 }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => adjustQuantity(idx, -1)}
                      disabled={it.editedQuantity <= 1}
                      sx={{ p: 0.25 }}
                      aria-label="Decrease quantity"
                    >
                      <RemoveIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <Typography
                      variant="caption"
                      sx={{ minWidth: 32, textAlign: "center", fontVariantNumeric: "tabular-nums" }}
                    >
                      {it.editedQuantity}
                      {it.measure ? (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.25 }}>
                          {it.measure.slice(0, 1).toLowerCase()}
                        </Typography>
                      ) : null}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => adjustQuantity(idx, 1)}
                      sx={{ p: 0.25 }}
                      aria-label="Increase quantity"
                    >
                      <AddIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Stack>
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
              <>
                <Alert severity="info">
                  {unmatchedCount} unmatched {unmatchedCount === 1 ? "item" : "items"} will be{" "}
                  <strong>created as new products at 100%</strong> in the section below.
                </Alert>
                {spaces.length > 0 ? (
                  <TextField
                    select
                    label="Section for new items"
                    size="small"
                    value={newItemSpaceId}
                    onChange={(e) => setNewItemSpaceId(e.target.value)}
                    SelectProps={{ native: true }}
                    fullWidth
                  >
                    {spaces.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </TextField>
                ) : (
                  <Alert severity="warning">
                    No sections found in your workspace yet. Create one in Settings before
                    creating new products.
                  </Alert>
                )}
              </>
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
