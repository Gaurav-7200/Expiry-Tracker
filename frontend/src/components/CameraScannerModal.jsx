import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  SwitchCamera,
  CheckCircle2,
  AlertCircle,
  Upload,
  Keyboard,
} from 'lucide-react';
import Quagga from '@ericblade/quagga2';
import { sounds } from '../utils/audio';

// STRICT REQUIREMENT: Only the 5 standard retail linear 1D barcode formats. QR is disabled.
const RETAIL_1D_READERS = ['ean_reader', 'code_128_reader'];

const READER_LABELS = {
  ean_reader: 'EAN-13',
  code_128_reader: 'Code 128',
  upc_reader: 'UPC-A',
  ean_8_reader: 'EAN-8',
  upc_e_reader: 'UPC-E',
};

// ============================================================================
// STRICT VALIDATION ENGINE (Requirement 2)
// Does NOT accept a result solely because the library returned a string.
// Validates character set, length, modulo-10 checksum, and decode confidence.
// ============================================================================
function validateBarcodeData(rawCode, rawFormat, decodedCodes = []) {
  if (!rawCode || typeof rawCode !== 'string') {
    return { valid: false, reason: 'Empty barcode string' };
  }

  const code = rawCode.trim();
  if (code.length < 2) {
    return { valid: false, reason: 'Barcode length too short (<2 chars)' };
  }

  // Calculate average decode error across all decoded characters
  const charErrors = (decodedCodes || [])
    .filter((c) => c && typeof c.error === 'number' && !isNaN(c.error))
    .map((c) => c.error);
  const avgError = charErrors.length > 0
    ? charErrors.reduce((a, b) => a + b, 0) / charErrors.length
    : null;

  // 1. EAN-13 Validation
  if (rawFormat === 'ean_13' || rawFormat === 'ean') {
    if (!/^\d{13}$/.test(code)) {
      return { valid: false, reason: 'EAN-13 must be exactly 13 numeric digits', avgError };
    }
    const digits = code.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }
    const expectedCheck = (10 - (sum % 10)) % 10;
    if (expectedCheck !== digits[12]) {
      return { valid: false, reason: 'EAN-13 checksum mismatch', avgError };
    }
    if (avgError !== null && avgError > 0.15) {
      return { valid: false, reason: 'EAN-13 decode confidence too low', avgError };
    }
  }

  // 2. EAN-8 Validation (Extra strict to prevent false positive pattern matches)
  else if (rawFormat === 'ean_8') {
    if (!/^\d{8}$/.test(code)) {
      return { valid: false, reason: 'EAN-8 must be exactly 8 numeric digits', avgError };
    }
    if (/^(\d)\1{7}$/.test(code)) {
      return { valid: false, reason: 'EAN-8 contains repeating dummy digits', avgError };
    }
    const digits = code.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      sum += digits[i] * (i % 2 === 0 ? 3 : 1);
    }
    const expectedCheck = (10 - (sum % 10)) % 10;
    if (expectedCheck !== digits[7]) {
      return { valid: false, reason: 'EAN-8 checksum mismatch', avgError };
    }
    if (avgError !== null && avgError > 0.16) {
      return { valid: false, reason: 'EAN-8 confidence too low (likely partial slice)', avgError };
    }
  }

  // 3. UPC-A Validation
  else if (rawFormat === 'upc_a' || rawFormat === 'upc') {
    if (!/^\d{12}$/.test(code)) {
      return { valid: false, reason: 'UPC-A must be exactly 12 numeric digits', avgError };
    }
    const digits = code.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += digits[i] * (i % 2 === 0 ? 3 : 1);
    }
    const expectedCheck = (10 - (sum % 10)) % 10;
    if (expectedCheck !== digits[11]) {
      return { valid: false, reason: 'UPC-A checksum mismatch', avgError };
    }
    if (avgError !== null && avgError > 0.22) {
      return { valid: false, reason: 'UPC-A confidence too low', avgError };
    }
  }

  // 4. UPC-E Validation
  // UPC-E is the most common false-positive when scanning EAN-13 barcodes,
  // because its 8-bar structure can match a sub-region of an EAN-13 strip.
  // Tighter confidence threshold (0.12 vs the previous 0.20) rejects most
  // partial-strip misreads before they enter the vote map.
  else if (rawFormat === 'upc_e') {
    if (!/^\d{8}$/.test(code)) {
      return { valid: false, reason: 'UPC-E must be 8 digits', avgError };
    }
    // UPC-E codes must start with 0 or 1
    if (code[0] !== '0' && code[0] !== '1') {
      return { valid: false, reason: 'UPC-E number system digit must be 0 or 1', avgError };
    }
    if (avgError !== null && avgError > 0.12) {
      return { valid: false, reason: `UPC-E confidence too low (${avgError.toFixed(4)} > 0.12) — likely EAN-13 partial read`, avgError };
    }
  }

  // 5. Code 128 Validation (Alphanumeric, spaces, symbols)
  else if (rawFormat === 'code_128') {
    if (!/^[\x20-\x7E]+$/.test(code)) {
      return { valid: false, reason: 'Code 128 contains invalid non-ASCII characters', avgError };
    }
    if (code.length < 6) {
      return { valid: false, reason: 'Code 128 too short (<6 chars)', avgError };
    }
    if (avgError !== null && avgError > 0.15) {
      return { valid: false, reason: 'Code 128 error too high', avgError };
    }
  }

  // Reject unsupported formats
  else {
    return { valid: false, reason: `Unsupported format: ${rawFormat}`, avgError };
  }

  return {
    valid: true,
    code,
    format: rawFormat,
    formatLabel: READER_LABELS[rawFormat] || rawFormat.toUpperCase(),
    avgError,
  };
}

export const CameraScannerModal = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Barcode Scanner (Camera)',
  continuous = false,
}) => {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const [lastScannedCode, setLastScannedCode] = useState(null);
  const [lastScannedFormat, setLastScannedFormat] = useState(null);
  const [isContinuous, setIsContinuous] = useState(continuous);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Multi-frame consensus — require this many hits within VOTE_WINDOW_MS
  const REQUIRED_CONSENSUS_FRAMES = 3;
  const VOTE_WINDOW_MS = 3000; // rolling window for vote-map entries
  const [consensusCount, setConsensusCount] = useState(0);
  // Display the leading candidate's code in the UI
  const [candidateDisplay, setCandidateDisplay] = useState(null);

  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isMountedRef = useRef(false);
  const isRunningRef = useRef(false);
  const isStartingRef = useRef(false);
  const scanCooldownRef = useRef(false);

  // ── Rolling-vote consensus tracker ─────────────────────────────────────────
  // Each unique "code|format" key maps to { count, lastSeen }.
  // On every valid detection the matching key is incremented.
  // Expired entries (lastSeen > VOTE_WINDOW_MS ago) are pruned before each read.
  // The first key to reach REQUIRED_CONSENSUS_FRAMES wins.
  //
  // Rationale: A single-candidate tracker resets whenever a DIFFERENT valid code
  // appears (e.g. UPC-E false-positive from the same EAN-13 bars). That prevents
  // the real code from ever accumulating 3 hits. A vote map lets both candidates
  // accumulate independently — the correct, repeatedly-detected code wins first.
  const voteMapRef = useRef(new Map()); // key → { count, lastSeen, format }

  const lastAcceptedCodeRef = useRef(null);
  const lastAcceptedTimeRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopScannerSync();
    };
  }, []);

  // Enumerate video cameras on modal open
  useEffect(() => {
    if (!isOpen) return;

    setScannerError(null);
    setLastScannedCode(null);
    setLastScannedFormat(null);
    setShowManualInput(false);
    setManualCode('');
    scanCooldownRef.current = false;
    setScanCooldown(false);
    setConsensusCount(0);
    setCandidateDisplay(null);
    voteMapRef.current = new Map();

    let active = true;

    async function loadCameras() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          return;
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        if (active && videoInputs.length > 0) {
          setCameras(videoInputs);
          const backCam = videoInputs.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.deviceId : videoInputs[0].deviceId);
        }
      } catch (err) {
        console.warn('[CameraScannerModal] Error listing cameras:', err);
      }
    }

    loadCameras();

    return () => {
      active = false;
      stopScannerSync();
    };
  }, [isOpen]);

  // ── Stable refs that hold the latest callback implementations ──────────────
  // These refs are updated every render without triggering a Quagga restart,
  // because only the ref *values* change, not the stable wrapper functions
  // that Quagga actually registers. This breaks the restart loop:
  //   onBarcodeDetected(useCallback) → deps change → scanner useEffect fires
  //   → stopScannerSync() → consensusTrackerRef cleared → counter resets to 0
  const onBarcodeDetectedImplRef = useRef(null);
  const onFrameProcessedImplRef  = useRef(null);

  // Stable wrappers registered with Quagga — never change identity
  const stableOnDetected  = useCallback((r) => onBarcodeDetectedImplRef.current?.(r),  []);
  const stableOnProcessed = useCallback((r) => onFrameProcessedImplRef.current?.(r), []);

  const stopScannerSync = () => {
    try {
      Quagga.offDetected(stableOnDetected);
      Quagga.offProcessed(stableOnProcessed);
      Quagga.stop();
    } catch (e) {}
    isRunningRef.current = false;
    isStartingRef.current = false;
  };

  const stopScanner = useCallback(async () => {
    stopScannerSync();
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    if (isMountedRef.current) {
      setIsScanning(false);
      setIsStartingCamera(false);
    }
  }, []);

  const handleClose = useCallback(async () => {
    await stopScanner();
    onClose();
  }, [stopScanner, onClose]);

  // Quagga real-time canvas overlays — implementation stored in ref so the
  // stable wrapper (stableOnProcessed) can always call the latest version
  // without ever changing its own identity.
  onFrameProcessedImplRef.current = (result) => {
    try {
      const drawingCtx = Quagga.canvas?.ctx?.overlay;
      const drawingCanvas = Quagga.canvas?.dom?.overlay;
      if (!drawingCtx || !drawingCanvas) return;

      drawingCtx.clearRect(
        0,
        0,
        parseInt(drawingCanvas.getAttribute('width') || '0', 10),
        parseInt(drawingCanvas.getAttribute('height') || '0', 10)
      );

      if (result) {
        if (result.boxes) {
          result.boxes
            .filter((box) => box !== result.box)
            .forEach((box) => {
              Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, {
                color: 'rgba(16, 185, 129, 0.4)',
                lineWidth: 1.5,
              });
            });
        }
        if (result.box) {
          Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, {
            color: '#10b981',
            lineWidth: 2,
          });
        }
        if (result.codeResult && result.codeResult.code) {
          Quagga.ImageDebug.drawPath(result.line, { x: 'x', y: 'y' }, drawingCtx, {
            color: '#ef4444',
            lineWidth: 3,
          });
        }
      }
    } catch (e) {}
  };

  // ── validateBarcodeData format normalisation ─────────────────────────────
  // Quagga2 emits 'ean_13' for the ean_reader, but the format string can vary.
  // Normalise here so the validator always receives a known key.
  function normaliseFormat(fmt) {
    if (!fmt) return 'unknown';
    const f = fmt.toLowerCase();
    if (f === 'ean_13' || f === 'ean') return 'ean_13';
    if (f === 'ean_8')                  return 'ean_8';
    if (f === 'upc_a' || f === 'upc')  return 'upc_a';
    if (f === 'upc_e')                  return 'upc_e';
    if (f === 'code_128')               return 'code_128';
    return f;
  }

  // Multi-frame rolling-vote consensus handler.
  // All logic lives in a ref-impl so the stable Quagga wrapper never changes
  // identity and the scanner useEffect never restarts mid-scan.
  onBarcodeDetectedImplRef.current = (result) => {
    if (scanCooldownRef.current) return;
    if (!result?.codeResult?.code) return;

    const rawCode   = String(result.codeResult.code).trim();
    const rawFormat = normaliseFormat(result.codeResult.format);
    const decodedCodes = result.codeResult.decodedCodes || [];

    // ── Step 1: Strict format + checksum + confidence validation ─────────────
    const validation = validateBarcodeData(rawCode, rawFormat, decodedCodes);
    if (!validation.valid) {
      console.log(
        `[Scanner] INVALID frame — raw="${rawCode}" fmt="${rawFormat}" ` +
        `reason="${validation.reason}" avgError=${validation.avgError?.toFixed(4) ?? 'n/a'}`
      );
      return; // silently skip — do NOT touch the vote map
    }

    // ── Step 2: Rolling-vote map — prune expired, then increment ─────────────
    //
    // ROOT CAUSE FIX: The old "single candidate" tracker reset the counter
    // whenever a DIFFERENT valid code appeared (e.g. UPC-E false-positive from
    // the same EAN-13 bars alternating every frame). Neither candidate ever
    // reached 3/3. A vote map lets every valid candidate accumulate votes
    // independently. The first to reach the threshold wins — even if other
    // false candidates are also accumulating votes more slowly.
    const now = Date.now();
    const voteMap = voteMapRef.current;
    const key = `${validation.code}|${validation.format}`;

    // Prune stale entries
    for (const [k, v] of voteMap.entries()) {
      if (now - v.lastSeen > VOTE_WINDOW_MS) {
        console.log(`[Scanner] Vote expired for "${k}" (count was ${v.count})`);
        voteMap.delete(k);
      }
    }

    // Increment or create this candidate's vote
    const existing = voteMap.get(key);
    if (existing) {
      existing.count   += 1;
      existing.lastSeen = now;
    } else {
      voteMap.set(key, { count: 1, lastSeen: now, format: validation.format, code: validation.code });
    }

    const currentCount = voteMap.get(key).count;

    // Show the leading candidate (highest votes) in the UI
    let leading = { code: validation.code, count: currentCount };
    for (const [, v] of voteMap.entries()) {
      if (v.count > leading.count) leading = v;
    }
    setConsensusCount(leading.count);
    setCandidateDisplay(leading.code);

    console.log(
      `[Scanner] VALID — "${validation.code}" (${validation.format}) ` +
      `avgErr=${validation.avgError?.toFixed(4) ?? 'n/a'} ` +
      `votes=${currentCount}/${REQUIRED_CONSENSUS_FRAMES} | ` +
      `map=[${[...voteMap.entries()].map(([k, v]) => `${k}:${v.count}`).join(', ')}]`
    );

    // ── Step 3: Acceptance — first candidate to reach threshold wins ──────────
    if (currentCount >= REQUIRED_CONSENSUS_FRAMES) {
      const isDuplicate =
        lastAcceptedCodeRef.current === validation.code &&
        now - lastAcceptedTimeRef.current < 2500;
      if (isDuplicate) return;

      // Lock immediately before any async work
      scanCooldownRef.current = true;
      lastAcceptedCodeRef.current = validation.code;
      lastAcceptedTimeRef.current = now;
      setScanCooldown(true);

      sounds.playScanBeep();
      setLastScannedCode(validation.code);
      setLastScannedFormat(validation.formatLabel);
      voteMapRef.current = new Map(); // clear all votes

      console.log(
        `[Scanner] ✅ ACCEPTED "${validation.code}" (${validation.formatLabel}) ` +
        `after ${currentCount} votes — invoking onScanSuccess`
      );

      // Invoke parent callback exactly once
      onScanSuccess(validation.code, validation.format);

      if (!isContinuous) {
        setTimeout(() => {
          if (isMountedRef.current) void handleClose();
        }, 350);
      } else {
        setTimeout(() => {
          scanCooldownRef.current = false;
          setScanCooldown(false);
          setConsensusCount(0);
          setCandidateDisplay(null);
        }, 1500);
      }
    }
  };

  // Start Quagga Scanner Engine
  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    const startScanner = async () => {
      if (isStartingRef.current || isRunningRef.current) return;
      isStartingRef.current = true;
      setIsStartingCamera(true);
      setScannerError(null);

      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!active || !isMountedRef.current) return;

      const container = containerRef.current;
      if (!container) {
        isStartingRef.current = false;
        setIsStartingCamera(false);
        return;
      }

      container.innerHTML = '';

      const quaggaConfig = {
        inputStream: {
          type: 'LiveStream',
          size: 1280,
          constraints: selectedCameraId
            ? {
                deviceId: { exact: selectedCameraId },
                width: { min: 640, ideal: 1920 },
                height: { min: 480, ideal: 1080 },
                advanced: [{ focusMode: 'continuous' }],
              }
            : {
                facingMode: 'environment',
                width: { min: 640, ideal: 1920 },
                height: { min: 480, ideal: 1080 },
                advanced: [{ focusMode: 'continuous' }],
              },
          target: container,
          willReadFrequently: true,
          area: {
            // Strict center ribbon: focus on middle 40% height, 80% width
            top: '30%',
            bottom: '30%',
            left: '10%',
            right: '10%',
          },
        },
        locator: {
          patchSize: 'medium',
          halfSample: false, // Full pixel resolution for dense Code 128 lines
        },
        numOfWorkers: 0,
        frequency: 10,
        decoder: {
          readers: RETAIL_1D_READERS,
          multiple: false,
        },
        locate: true,
      };

      Quagga.init(quaggaConfig, (err) => {
        isStartingRef.current = false;
        if (!active || !isMountedRef.current) {
          try {
            Quagga.stop();
          } catch (e) {}
          return;
        }

        setIsStartingCamera(false);

        if (err) {
          console.error('[CameraScannerModal] Init error:', err);
          let userMsg = 'Failed to access camera.';
          if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
            userMsg = 'Camera permission denied. Please allow camera access in Chrome settings.';
          } else if (err.name === 'NotFoundError') {
            userMsg = 'No camera found. Please connect a webcam.';
          } else if (err.name === 'NotReadableError') {
            userMsg = 'Camera is in use by another application. Please close other camera apps.';
          }
          setScannerError(userMsg);
          return;
        }

        Quagga.onDetected(stableOnDetected);
        Quagga.onProcessed(stableOnProcessed);

        try {
          Quagga.start();
          isRunningRef.current = true;
          setIsScanning(true);
        } catch (startErr) {
          setScannerError('Failed to start camera feed: ' + (startErr.message || startErr));
        }
      });
    };

    startScanner();

    return () => {
      active = false;
      stopScannerSync();
    };
  }, [isOpen, selectedCameraId]);

  // Camera switcher
  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.deviceId === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    stopScanner().then(() => {
      setSelectedCameraId(cameras[nextIndex].deviceId);
    });
  };

  // Manual code submission fallback
  const handleManualSubmit = (e) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;
    sounds.playScanBeep();
    onScanSuccess(clean, 'manual');
    void handleClose();
  };

  // Upload image file fallback
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    const reader = new FileReader();
    reader.onload = (uploadEv) => {
      const dataUrl = uploadEv.target.result;
      Quagga.decodeSingle(
        {
          src: dataUrl,
          numOfWorkers: 0,
          inputStream: { size: 1280, willReadFrequently: true },
          decoder: { readers: RETAIL_1D_READERS },
          locate: true,
        },
        (result) => {
          setIsProcessingFile(false);
          if (result && result.codeResult && result.codeResult.code) {
            const validation = validateBarcodeData(
              result.codeResult.code,
              result.codeResult.format,
              result.codeResult.decodedCodes
            );
            if (validation.valid) {
              sounds.playScanBeep();
              onScanSuccess(validation.code, validation.format);
              void handleClose();
            } else {
              sounds.playErrorBuzz();
              alert(`Decoded barcode failed validation: ${validation.reason}`);
            }
          } else {
            sounds.playErrorBuzz();
            alert('No 1D retail barcode could be detected in this photo. Please try a clearer picture or enter manually.');
          }
        }
      );
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/80 backdrop-blur-xs no-print">
      <div className="relative w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 bg-stone-950">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">{title}</h3>
              <p className="text-[10px] text-stone-400 font-mono">1D Retail Barcode Engine (Quagga2)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Viewport */}
        <div className="relative bg-black flex-1 min-h-[300px] sm:min-h-[360px] flex items-center justify-center overflow-hidden">
          {/* Target Element for Quagga Viewport */}
          <div
            ref={containerRef}
            className="w-full relative flex items-center justify-center [&>video]:w-full [&>video]:h-auto [&>video]:max-h-[460px] [&>video]:object-contain [&>canvas.drawingBuffer]:absolute [&>canvas.drawingBuffer]:top-0 [&>canvas.drawingBuffer]:left-0 [&>canvas.drawingBuffer]:w-full [&>canvas.drawingBuffer]:h-full"
          />

          {/* Alignment Laser Guide & Scan Ribbon */}
          {isScanning && !scannerError && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[85%] h-36 border-2 border-emerald-400/80 rounded-xl relative flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                {/* Red Laser Line */}
                <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444]" />
                <span className="absolute bottom-2 text-[10px] text-white/90 bg-black/70 px-2 py-0.5 rounded font-mono">
                  Align 1D barcode bars across red laser line
                </span>

                {/* Consensus Pill — shows leading candidate + vote count */}
                {consensusCount > 0 && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500 text-black flex items-center gap-1">
                    {candidateDisplay && (
                      <span className="opacity-70 max-w-[90px] truncate">{candidateDisplay}</span>
                    )}
                    <span>{consensusCount}/{REQUIRED_CONSENSUS_FRAMES}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Starting / Loading Spinner */}
          {isStartingCamera && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin" />
              <p className="text-xs font-semibold text-stone-300">Starting 1D Camera Scanner...</p>
            </div>
          )}

          {/* Camera Error Screen */}
          {scannerError && (
            <div className="absolute inset-0 bg-black/90 p-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-700 flex items-center justify-center text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-rose-300 max-w-xs">{scannerError}</p>
              <button
                type="button"
                onClick={() => setShowManualInput(true)}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
              >
                Enter Barcode Manually
              </button>
            </div>
          )}

          {/* Success Decoded Banner Overlay */}
          {lastScannedCode && (
            <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center p-6 text-center space-y-2 z-30 animate-in fade-in duration-150">
              <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-lg">
                <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div className="font-mono text-2xl font-black text-white tracking-wider">
                {lastScannedCode}
              </div>
              <div className="text-xs text-emerald-300 font-medium">
                {lastScannedFormat || '1D Barcode'} &bull; Decoded &amp; Validated
              </div>
            </div>
          )}
        </div>

        {/* Manual Keyboard Input Accordion */}
        {showManualInput && (
          <form onSubmit={handleManualSubmit} className="p-3 bg-stone-950 border-t border-stone-800 flex gap-2">
            <input
              type="text"
              autoFocus
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Type product barcode (e.g. 8901030383848)"
              className="flex-1 px-3 py-1.5 text-xs bg-stone-900 border border-stone-700 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
            >
              Submit
            </button>
          </form>
        )}

        {/* Modal Footer Controls */}
        <div className="p-3.5 bg-stone-950 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Continuous Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer text-stone-300 select-none">
            <input
              type="checkbox"
              checked={isContinuous}
              onChange={(e) => setIsContinuous(e.target.checked)}
              className="rounded border-stone-700 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Continuous Scan</span>
          </label>

          <div className="flex items-center gap-2">
            {/* Upload File / Screenshot */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingFile}
              className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1 cursor-pointer transition"
              title="Upload a photo of a barcode"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isProcessingFile ? 'Analyzing...' : 'Upload'}</span>
            </button>

            {/* Manual Type Toggle */}
            <button
              type="button"
              onClick={() => setShowManualInput((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1 cursor-pointer transition"
            >
              <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Type</span>
            </button>

            {/* Switch Camera */}
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={switchCamera}
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1 cursor-pointer transition"
                title="Switch camera device"
              >
                <SwitchCamera className="w-3.5 h-3.5 text-emerald-400" />
                <span>Switch</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
