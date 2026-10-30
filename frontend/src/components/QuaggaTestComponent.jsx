import React, { useEffect, useRef, useState, useCallback } from 'react';
import Quagga from '@ericblade/quagga2';
import {
  Camera,
  Play,
  Square,
  AlertTriangle,
  CheckCircle2,
  ScanLine,
  RefreshCw,
  Copy,
  Trash2,
  Info,
  ShieldCheck,
  Check,
  Volume2,
  X,
  Upload,
  Eye,
  Sliders,
  Terminal,
  FileSearch,
  Sparkles,
} from 'lucide-react';
import { sounds } from '../utils/audio';

// STRICT REQUIREMENT 1: Only the 5 required 1D retail linear barcode formats. QR is completely excluded.
const AVAILABLE_1D_READERS = [
  { id: 'ean_reader', label: 'EAN-13', desc: '13-digit standard retail products' },
  { id: 'code_128_reader', label: 'Code 128', desc: 'Alphanumeric logistics & retail (e.g. 424 HR SP 210)' },
];

const READER_FORMAT_MAP = {
  ean_reader: 'ean_13',
  ean_8_reader: 'ean_8',
  upc_reader: 'upc_a',
  upc_e_reader: 'upc_e',
  code_128_reader: 'code_128',
};

// ============================================================================
// STRICT VALIDATION ENGINE (Requirement 2)
// Does NOT accept a result solely because the library returned a string.
// Validates character set, length, modulo-10 checksum, and decode confidence.
// ============================================================================
function validateBarcodeData(rawCode, rawFormat, decodedCodes = []) {
  if (!rawCode || typeof rawCode !== 'string') {
    return { valid: false, reason: 'Empty code string' };
  }

  const code = rawCode.trim();
  if (code.length < 2) {
    return { valid: false, reason: 'Length too short (<2 characters)' };
  }

  // Calculate average and max decode error across all decoded characters
  const charErrors = (decodedCodes || [])
    .filter((c) => c && typeof c.error === 'number' && !isNaN(c.error))
    .map((c) => c.error);
  const avgError = charErrors.length > 0
    ? charErrors.reduce((a, b) => a + b, 0) / charErrors.length
    : null;
  const maxError = charErrors.length > 0 ? Math.max(...charErrors) : null;

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
      return { valid: false, reason: `EAN-13 checksum mismatch: expected ${expectedCheck}, got ${digits[12]}`, avgError };
    }
    if (avgError !== null && avgError > 0.15) {
      return { valid: false, reason: `EAN-13 confidence score too low (error ${avgError.toFixed(3)} > 0.15)`, avgError };
    }
  }

  // 2. EAN-8 Validation (Extra strict to prevent false positive pattern matches)
  else if (rawFormat === 'ean_8') {
    if (!/^\d{8}$/.test(code)) {
      return { valid: false, reason: 'EAN-8 must be exactly 8 numeric digits', avgError };
    }
    // Check for repetitive/dummy patterns like 00000000 or 11111111
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
      return { valid: false, reason: `EAN-8 checksum mismatch: expected ${expectedCheck}, got ${digits[7]}`, avgError };
    }
    // High bar for EAN-8: partial Code 128 slices produce noisy EAN-8 matches with avgError > 0.16
    if (avgError !== null && avgError > 0.16) {
      return { valid: false, reason: `EAN-8 confidence too low (error ${avgError.toFixed(3)} > 0.16 - likely partial slice)`, avgError };
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
      return { valid: false, reason: `UPC-A checksum mismatch: expected ${expectedCheck}, got ${digits[11]}`, avgError };
    }
    if (avgError !== null && avgError > 0.22) {
      return { valid: false, reason: `UPC-A confidence score too low (error ${avgError.toFixed(3)} > 0.22)`, avgError };
    }
  }

  // 4. UPC-E Validation
  else if (rawFormat === 'upc_e') {
    if (!/^\d{8}$/.test(code)) {
      return { valid: false, reason: 'UPC-E must be 8 digits', avgError };
    }
    if (avgError !== null && avgError > 0.20) {
      return { valid: false, reason: `UPC-E confidence score too low (error ${avgError.toFixed(3)} > 0.20)`, avgError };
    }
  }

  // 5. Code 128 Validation (Alphanumeric, spaces, symbols)
  else if (rawFormat === 'code_128') {
    // Code 128 can contain printable ASCII (e.g. "424 HR SP 210")
    if (!/^[\x20-\x7E]+$/.test(code)) {
      return { valid: false, reason: 'Code 128 contains invalid non-ASCII characters', avgError };
    }
    if (code.length < 6) {
      return { valid: false, reason: 'Code 128 too short (<6 chars)', avgError };
    }
    // Quagga internally checks modulo 103 checksum for Code 128. Verify character error.
    if (avgError !== null && avgError > 0.15) {
      return { valid: false, reason: `Code 128 error too high (error ${avgError.toFixed(3)} > 0.15)`, avgError };
    }
  }

  // Reject anything else
  else {
    return { valid: false, reason: `Unauthorized or unknown format: ${rawFormat}`, avgError };
  }

  return {
    valid: true,
    code,
    format: rawFormat,
    avgError,
    maxError,
    charCount: code.length,
    reason: 'Format and checksum verified',
  };
}

export const QuaggaTestComponent = () => {
  // Scanner state machine: 'idle' | 'starting' | 'scanning' | 'error'
  const [scannerStatus, setScannerStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);

  // Enabled decoders (default: all 5 required retail 1D readers)
  const [enabledReaders, setEnabledReaders] = useState([
    'ean_reader',
    'code_128_reader',
  ]);

  // Video devices & selected camera
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  // Viewfinder scan region & quality settings (Requirement 3)
  const [scanRegionMode, setScanRegionMode] = useState('ribbon'); // 'ribbon' (center 40%) | 'full' (100%)
  const [halfSample, setHalfSample] = useState(false); // false = full pixel resolution for dense Code 128
  const [patchSize, setPatchSize] = useState('medium'); // 'small' | 'medium' | 'large'
  const [drawBoundingBox, setDrawBoundingBox] = useState(true);

  // Live Raw Diagnostics (Requirement 5)
  const [liveRawFrame, setLiveRawFrame] = useState(null);
  const [liveEventLog, setLiveEventLog] = useState([]);

  // Multi-Frame Consensus State (Requirement 4)
  // Required: At least 3 separate consecutive frames with the exact same barcode & format
  const REQUIRED_CONSENSUS_FRAMES = 3;
  const [consensusProgress, setConsensusProgress] = useState({
    candidateCode: null,
    candidateFormat: null,
    count: 0,
    required: REQUIRED_CONSENSUS_FRAMES,
    avgError: null,
  });

  // Manual Confirmation State (Requirement 6)
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [confirmedScans, setConfirmedScans] = useState([]);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [copiedCode, setCopiedCode] = useState(null);

  // Static Image / Screenshot Testing State (Requirement 8)
  const [imageTestResult, setImageTestResult] = useState(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef(null);

  // DOM Refs
  const scannerContainerRef = useRef(null);
  const isMountedRef = useRef(false);
  const isStartingRef = useRef(false);
  const isRunningRef = useRef(false);

  // Consensus tracking ref to avoid stale closures in high-frequency event handlers
  const consensusTrackerRef = useRef({
    candidateCode: null,
    candidateFormat: null,
    consecutiveMatches: 0,
    lastMatchTime: 0,
    avgError: null,
  });

  // Duplicate suppression tracking ref
  const lastAcceptedCodeRef = useRef(null);
  const lastAcceptedTimeRef = useRef(0);

  // Append entry to live diagnostic log
  const logDiagnosticEvent = useCallback((event) => {
    const time = new Date().toLocaleTimeString();
    setLiveEventLog((prev) => [
      { id: Date.now() + Math.random(), time, ...event },
      ...prev.slice(0, 29), // keep last 30 events
    ]);
  }, []);

  // Enumerate cameras on mount
  useEffect(() => {
    isMountedRef.current = true;

    async function loadCameras() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          return;
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        if (isMountedRef.current) {
          setVideoDevices(videoInputs);
          if (videoInputs.length > 0 && !selectedDeviceId) {
            const backCam = videoInputs.find(
              (d) =>
                d.label.toLowerCase().includes('back') ||
                d.label.toLowerCase().includes('rear') ||
                d.label.toLowerCase().includes('environment')
            );
            setSelectedDeviceId(backCam ? backCam.deviceId : videoInputs[0].deviceId);
          }
        }
      } catch (err) {
        console.warn('[QuaggaPoC] Error enumerating cameras:', err);
      }
    }

    loadCameras();

    return () => {
      isMountedRef.current = false;
      stopScannerSync();
    };
  }, []);

  // Teardown helper
  const stopScannerSync = () => {
    try {
      Quagga.offDetected(onBarcodeDetected);
      Quagga.offProcessed(onFrameProcessed);
      Quagga.stop();
    } catch (e) {}
    isRunningRef.current = false;
    isStartingRef.current = false;
  };

  // Quagga onProcessed callback: draws real-time bounding boxes
  const onFrameProcessed = useCallback(
    (result) => {
      if (!drawBoundingBox) return;
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
              color: '#3b82f6',
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
    },
    [drawBoundingBox]
  );

  // ============================================================================
  // MULTI-FRAME CONSENSUS & VALIDATION HANDLER (Requirements 2, 4, 5, 6)
  // ============================================================================
  const onBarcodeDetected = useCallback(
    (result) => {
      if (!result || !result.codeResult || !result.codeResult.code) return;

      const rawCode = String(result.codeResult.code).trim();
      const rawFormat = result.codeResult.format || 'unknown';
      const decodedCodes = result.codeResult.decodedCodes || [];

      // Step 1: Strict Validation (Reject false positives immediately)
      const validation = validateBarcodeData(rawCode, rawFormat, decodedCodes);

      // Update live raw frame diagnostics display (Requirement 5)
      setLiveRawFrame({
        code: rawCode,
        format: rawFormat,
        valid: validation.valid,
        reason: validation.reason,
        avgError: validation.avgError,
        timestamp: new Date().toLocaleTimeString(),
      });

      if (!validation.valid) {
        logDiagnosticEvent({
          type: 'REJECTED_VALIDATION',
          code: rawCode,
          format: rawFormat,
          error: validation.avgError,
          detail: validation.reason,
        });

        // Reset consensus candidate if an invalid code was received
        consensusTrackerRef.current = {
          candidateCode: null,
          candidateFormat: null,
          consecutiveMatches: 0,
          lastMatchTime: 0,
          avgError: null,
        };
        setConsensusProgress({
          candidateCode: null,
          candidateFormat: null,
          count: 0,
          required: REQUIRED_CONSENSUS_FRAMES,
          avgError: null,
        });
        return;
      }

      // Step 2: Multi-Frame Consensus Tracking (Requirement 4)
      const now = Date.now();
      const tracker = consensusTrackerRef.current;
      const MAX_FRAME_GAP_MS = 1400; // Allow up to 1.4s between frames while holding camera

      if (
        tracker.candidateCode === validation.code &&
        tracker.candidateFormat === validation.format &&
        now - tracker.lastMatchTime <= MAX_FRAME_GAP_MS
      ) {
        // Same candidate seen again within window: increment match count
        tracker.consecutiveMatches += 1;
        tracker.lastMatchTime = now;
        tracker.avgError = validation.avgError;
      } else {
        // Different candidate or expired gap: reset counter to 1 with new candidate
        tracker.candidateCode = validation.code;
        tracker.candidateFormat = validation.format;
        tracker.consecutiveMatches = 1;
        tracker.lastMatchTime = now;
        tracker.avgError = validation.avgError;

        logDiagnosticEvent({
          type: 'NEW_CANDIDATE',
          code: validation.code,
          format: validation.format,
          error: validation.avgError,
          detail: `Candidate detected. Awaiting ${REQUIRED_CONSENSUS_FRAMES} consistent frames.`,
        });
      }

      // Update live UI progress for consensus
      setConsensusProgress({
        candidateCode: tracker.candidateCode,
        candidateFormat: tracker.candidateFormat,
        count: tracker.consecutiveMatches,
        required: REQUIRED_CONSENSUS_FRAMES,
        avgError: tracker.avgError,
      });

      // Step 3: Consensus Threshold Evaluation
      if (tracker.consecutiveMatches >= REQUIRED_CONSENSUS_FRAMES) {
        // Require duplicate cooldown check
        const isDuplicate =
          lastAcceptedCodeRef.current === validation.code &&
          now - lastAcceptedTimeRef.current < 3000;

        if (isDuplicate) {
          // Suppress repeated confirmation while same code remains locked
          return;
        }

        lastAcceptedCodeRef.current = validation.code;
        lastAcceptedTimeRef.current = now;

        logDiagnosticEvent({
          type: 'CONSENSUS_CONFIRMED',
          code: validation.code,
          format: validation.format,
          error: validation.avgError,
          detail: `CONSENSUS REACHED (${tracker.consecutiveMatches} consistent frames). Ready for confirmation.`,
        });

        // Trigger manual confirmation card (Requirement 6)
        setPendingConfirmation({
          code: validation.code,
          format: validation.format,
          avgError: validation.avgError,
          maxError: validation.maxError,
          framesVerified: tracker.consecutiveMatches,
          timestamp: new Date().toLocaleTimeString(),
        });

        try {
          sounds.playScanBeep();
        } catch (e) {}

        // Reset tracker for subsequent scans
        consensusTrackerRef.current = {
          candidateCode: null,
          candidateFormat: null,
          consecutiveMatches: 0,
          lastMatchTime: 0,
          avgError: null,
        };
      }
    },
    [logDiagnosticEvent]
  );

  // Start the Quagga scanner with enhanced image & scan-region constraints (Requirement 3)
  const startScanner = async () => {
    if (isStartingRef.current || isRunningRef.current) return;

    setErrorMessage(null);
    setErrorDetails(null);
    setScannerStatus('starting');
    isStartingRef.current = true;

    await new Promise((resolve) => setTimeout(resolve, 80));

    const container = scannerContainerRef.current;
    if (!container) {
      setErrorMessage('Camera viewfinder container is not available.');
      setScannerStatus('error');
      isStartingRef.current = false;
      return;
    }

    container.innerHTML = '';

    // Define focused scan area ribbon vs full-frame
    const scanArea =
      scanRegionMode === 'ribbon'
        ? {
            // Strict center ribbon: focus on middle 40% height, 80% width
            top: '30%',
            bottom: '30%',
            left: '10%',
            right: '10%',
          }
        : {
            top: '5%',
            bottom: '5%',
            left: '5%',
            right: '5%',
          };

    const quaggaConfig = {
      inputStream: {
        type: 'LiveStream',
        size: 1280,
        constraints: selectedDeviceId
          ? {
              deviceId: { exact: selectedDeviceId },
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
        area: scanArea,
      },
      locator: {
        patchSize: patchSize,
        halfSample: halfSample, // false = full resolution for thin Code 128 lines
      },
      numOfWorkers: 0, // 0 = main thread (instant & avoids Vite bundle chunking issues)
      frequency: 10,
      decoder: {
        readers: enabledReaders.length > 0 ? enabledReaders : ['code_128_reader', 'ean_reader'],
        multiple: false,
      },
      locate: true,
    };

    Quagga.init(quaggaConfig, (err) => {
      isStartingRef.current = false;

      if (!isMountedRef.current) {
        try {
          Quagga.stop();
        } catch (e) {}
        return;
      }

      if (err) {
        console.error('[QuaggaPoC] Init error:', err);
        let humanMsg = 'Failed to access camera.';
        if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
          humanMsg = 'Camera access was denied by Chrome. Click the camera icon in Chrome address bar to grant access.';
        } else if (err.name === 'NotFoundError') {
          humanMsg = 'No camera found on this device. Please connect a webcam.';
        } else if (err.name === 'NotReadableError') {
          humanMsg = 'Camera is currently in use by another application. Close other camera apps and retry.';
        }
        setErrorMessage(humanMsg);
        setErrorDetails(err.toString());
        setScannerStatus('error');
        isRunningRef.current = false;
        return;
      }

      Quagga.onDetected(onBarcodeDetected);
      Quagga.onProcessed(onFrameProcessed);

      try {
        Quagga.start();
        isRunningRef.current = true;
        setScannerStatus('scanning');
        logDiagnosticEvent({
          type: 'SCANNER_STARTED',
          detail: `Active decoders: ${enabledReaders.join(', ')} | HalfSample: ${halfSample} | Region: ${scanRegionMode}`,
        });
      } catch (startErr) {
        setErrorMessage('Failed to start scanner engine: ' + (startErr.message || startErr));
        setScannerStatus('error');
        isRunningRef.current = false;
      }
    });
  };

  const stopScanner = async () => {
    setScannerStatus('idle');
    stopScannerSync();
    if (scannerContainerRef.current) {
      scannerContainerRef.current.innerHTML = '';
    }
    logDiagnosticEvent({ type: 'SCANNER_STOPPED', detail: 'Scanner stopped by user.' });
  };

  // Requirement 6: Manual Confirmation Actions
  const handleConfirmCandidate = () => {
    if (!pendingConfirmation) return;
    const confirmed = {
      ...pendingConfirmation,
      confirmedAt: new Date().toLocaleTimeString(),
      id: Date.now() + Math.random(),
    };
    setConfirmedScans((prev) => [confirmed, ...prev.slice(0, 19)]);
    setPendingConfirmation(null);
    logDiagnosticEvent({
      type: 'MANUALLY_CONFIRMED',
      code: confirmed.code,
      format: confirmed.format,
      detail: 'Candidate confirmed and saved to accepted list.',
    });
  };

  const handleRejectCandidate = () => {
    if (!pendingConfirmation) return;
    logDiagnosticEvent({
      type: 'MANUALLY_REJECTED',
      code: pendingConfirmation.code,
      format: pendingConfirmation.format,
      detail: 'Rejected by user as false positive.',
    });
    setRejectedCount((prev) => prev + 1);
    setPendingConfirmation(null);
    consensusTrackerRef.current = {
      candidateCode: null,
      candidateFormat: null,
      consecutiveMatches: 0,
      lastMatchTime: 0,
      avgError: null,
    };
  };

  // Requirement 8: Static Image Testing (e.g. Reference Screenshot upload)
  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setImageTestResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      Quagga.decodeSingle(
        {
          src: dataUrl,
          numOfWorkers: 0,
          inputStream: {
            size: 1280,
            willReadFrequently: true,
          },
          decoder: {
            readers: enabledReaders,
          },
          locate: true,
        },
        (result) => {
          setIsProcessingImage(false);
          if (result && result.codeResult && result.codeResult.code) {
            const validation = validateBarcodeData(
              result.codeResult.code,
              result.codeResult.format,
              result.codeResult.decodedCodes
            );
            setImageTestResult({
              success: true,
              rawCode: result.codeResult.code,
              format: result.codeResult.format,
              validation,
              decodedCodes: result.codeResult.decodedCodes,
            });
            logDiagnosticEvent({
              type: 'IMAGE_DECODED',
              code: result.codeResult.code,
              format: result.codeResult.format,
              detail: `Static image decoded. Validation: ${validation.reason}`,
            });
          } else {
            setImageTestResult({
              success: false,
              message: 'No barcode could be localized or decoded in this static image with current readers.',
            });
            logDiagnosticEvent({
              type: 'IMAGE_FAILED',
              detail: 'No barcode detected in uploaded image file.',
            });
          }
        }
      );
    };
    reader.readAsDataURL(file);
  };

  const handleCopyCode = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleReader = (readerId) => {
    setEnabledReaders((prev) => {
      const next = prev.includes(readerId) ? prev.filter((r) => r !== readerId) : [...prev, readerId];
      if (next.length === 0) return [readerId]; // Keep at least one
      return next;
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner & Status Header */}
      <div className="bg-white rounded-xl shadow-xs border border-stone-200 p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Debug &amp; Reliability Workbench
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Consensus Verification: {REQUIRED_CONSENSUS_FRAMES} Consecutive Frames
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-stone-100 text-stone-600 border border-stone-200">
                Strict Modulo-10 &amp; Code 128 Engine
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
              1D Barcode False-Positive Elimination Lab
            </h2>
            <p className="text-sm text-stone-500">
              Debugged to eliminate single-frame glitches (such as accidental EAN-8 matches on Code 128 symbols).
              Requires 3-frame consensus, strict validation, and manual confirmation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {scannerStatus === 'scanning' ? (
              <button
                type="button"
                onClick={stopScanner}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-xs transition cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                Stop Live Camera
              </button>
            ) : (
              <button
                type="button"
                onClick={startScanner}
                disabled={scannerStatus === 'starting'}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm shadow-md transition cursor-pointer"
              >
                {scannerStatus === 'starting' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Starting Camera...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    Start Live Scanner
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Decoder Selection Toggles (Requirement 1) */}
        <div className="mt-4 pt-4 border-t border-stone-100">
          <div className="text-xs font-bold text-stone-700 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ScanLine className="w-3.5 h-3.5 text-indigo-600" />
              Active 1D Readers ({enabledReaders.length} of 5 selected &bull; QR Code disabled):
            </span>
            <span className="text-stone-400 font-normal text-[11px]">
              Tip: Uncheck EAN-8 to completely isolate Code 128 testing
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_1D_READERS.map((r) => {
              const active = enabledReaders.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    toggleReader(r.id);
                    if (scannerStatus === 'scanning') {
                      stopScanner().then(() => setTimeout(startScanner, 250));
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
                    active
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs'
                      : 'bg-stone-50 border-stone-200 text-stone-400 hover:text-stone-700'
                  }`}
                  title={r.desc}
                >
                  <span className={`w-2 h-2 rounded-full ${active ? 'bg-indigo-600' : 'bg-stone-300'}`} />
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* REQUIREMENT 6: Manual Confirmation Card (Displays when candidate reaches consensus) */}
      {pendingConfirmation && (
        <div className="bg-amber-50 rounded-xl border-2 border-amber-400 p-5 md:p-6 shadow-lg animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white tracking-wide uppercase">
                  Pending Manual Confirmation
                </span>
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified across {pendingConfirmation.framesVerified} consecutive frames
                </span>
              </div>
              <div className="font-mono text-3xl font-black text-amber-950 tracking-wider break-all select-all">
                {pendingConfirmation.code}
              </div>
              <div className="text-xs text-amber-800 flex flex-wrap gap-3 font-medium">
                <span>Format: <strong className="font-mono uppercase">{pendingConfirmation.format}</strong></span>
                {pendingConfirmation.avgError !== null && (
                  <span>Avg Char Error: <strong className="font-mono">{pendingConfirmation.avgError.toFixed(3)}</strong></span>
                )}
                <span>Detected at: <strong>{pendingConfirmation.timestamp}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleRejectCandidate}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-white hover:bg-rose-50 border border-stone-300 hover:border-rose-300 text-stone-700 hover:text-rose-700 font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <X className="w-4 h-4 text-rose-500" />
                Reject as False Positive
              </button>
              <button
                type="button"
                onClick={handleConfirmCandidate}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md transition cursor-pointer"
              >
                <Check className="w-4 h-4 text-white stroke-[3]" />
                Confirm &amp; Accept Barcode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Viewfinder & Real-time Diagnostic Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Viewfinder & Enhanced Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl shadow-xs border border-stone-200 overflow-hidden">
            {/* Viewfinder Header */}
            <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-stone-600" />
                <span className="text-xs font-bold text-stone-800">Live Camera Stream</span>
              </div>

              {/* Status State Badge */}
              <div>
                {scannerStatus === 'idle' && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-200 text-stone-700">
                    STOPPED
                  </span>
                )}
                {scannerStatus === 'starting' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                    STARTING CAMERA...
                  </span>
                )}
                {scannerStatus === 'scanning' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    SCANNING (Consensus Active)
                  </span>
                )}
                {scannerStatus === 'error' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    CAMERA ERROR
                  </span>
                )}
              </div>
            </div>

            {/* Video Viewfinder Container */}
            <div className="relative bg-black min-h-[360px] flex items-center justify-center overflow-hidden">
              <div
                id="quagga-interactive"
                ref={scannerContainerRef}
                className="w-full relative flex items-center justify-center [&>video]:w-full [&>video]:h-auto [&>video]:max-h-[460px] [&>video]:object-contain [&>canvas.drawingBuffer]:absolute [&>canvas.drawingBuffer]:top-0 [&>canvas.drawingBuffer]:left-0 [&>canvas.drawingBuffer]:w-full [&>canvas.drawingBuffer]:h-full"
              />

              {/* Enhanced Visual Scan Region & Alignment Guidance (Requirement 3) */}
              {scannerStatus === 'scanning' && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {scanRegionMode === 'ribbon' ? (
                    <div className="w-[82%] h-36 border-2 border-emerald-400/80 rounded-xl relative flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                      {/* Red laser line across horizontal center */}
                      <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444]" />
                      <div className="absolute top-2 left-3 text-[10px] text-emerald-300 font-mono bg-black/70 px-2 py-0.5 rounded">
                        Target Scanning Ribbon (Center 40%)
                      </div>
                      <div className="absolute bottom-2 text-[10px] text-white/90 font-mono bg-black/70 px-2.5 py-0.5 rounded">
                        Align Code 128 / EAN bars across laser line
                      </div>
                    </div>
                  ) : (
                    <div className="w-[92%] h-[85%] border-2 border-dashed border-emerald-400/50 rounded-xl relative flex items-center justify-center">
                      <div className="w-full h-0.5 bg-red-500/70" />
                      <span className="absolute bottom-2 text-[10px] text-white/80 bg-black/60 px-2 py-0.5 rounded font-mono">
                        Full-Frame Scanning Mode
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Idle State Prompt */}
              {scannerStatus === 'idle' && (
                <div className="text-center p-8 text-stone-400 space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-500">
                    <Camera className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-semibold text-stone-300">Webcam is off</p>
                  <button
                    type="button"
                    onClick={startScanner}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    Start Camera
                  </button>
                </div>
              )}

              {/* Camera Error Screen */}
              {scannerStatus === 'error' && (
                <div className="text-center p-8 text-stone-300 space-y-3 max-w-md">
                  <div className="w-12 h-12 mx-auto rounded-full bg-rose-950/80 border border-rose-700 flex items-center justify-center text-rose-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-rose-300">{errorMessage || 'Camera access failed.'}</p>
                  {errorDetails && (
                    <p className="text-[11px] font-mono text-stone-400 bg-stone-900 p-2 rounded border border-stone-800 break-words text-left">
                      {errorDetails}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={startScanner}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-white font-semibold text-xs border border-stone-700 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry Camera
                  </button>
                </div>
              )}
            </div>

            {/* Viewfinder Tuning Controls (Requirement 3: Scan-region & image quality) */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Camera device picker */}
                <div className="flex items-center gap-2">
                  <label htmlFor="camera-device-select" className="font-semibold text-stone-700 whitespace-nowrap">Camera:</label>
                  <select
                    id="camera-device-select"
                    value={selectedDeviceId}
                    onChange={(e) => {
                      setSelectedDeviceId(e.target.value);
                      if (scannerStatus === 'scanning') {
                        stopScanner().then(() => setTimeout(startScanner, 200));
                      }
                    }}
                    className="w-full text-xs bg-white border border-stone-300 rounded-md px-2 py-1.5 text-stone-800"
                  >
                    {videoDevices.length === 0 && <option value="">Default Webcam</option>}
                    {videoDevices.map((d, idx) => (
                      <option key={d.deviceId || idx} value={d.deviceId}>
                        {d.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Scan Region Mode */}
                <div className="flex items-center gap-2">
                  <label htmlFor="scan-region-select" className="font-semibold text-stone-700 whitespace-nowrap">Scan Area:</label>
                  <select
                    id="scan-region-select"
                    value={scanRegionMode}
                    onChange={(e) => {
                      setScanRegionMode(e.target.value);
                      if (scannerStatus === 'scanning') {
                        stopScanner().then(() => setTimeout(startScanner, 200));
                      }
                    }}
                    className="w-full text-xs bg-white border border-stone-300 rounded-md px-2 py-1.5 text-stone-800"
                  >
                    <option value="ribbon">Focused Ribbon (Middle 40% - Recommended for 1D)</option>
                    <option value="full">Full Frame (100% Viewfinder)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-200/60 text-[11px] text-stone-600">
                {/* HalfSample Toggle */}
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={halfSample}
                    onChange={(e) => {
                      setHalfSample(e.target.checked);
                      if (scannerStatus === 'scanning') {
                        stopScanner().then(() => setTimeout(startScanner, 200));
                      }
                    }}
                    className="rounded border-stone-300 text-indigo-600"
                  />
                  <span>HalfSample downsampling (Disable for fine Code 128 lines)</span>
                </label>

                {/* Locator Overlay Toggle */}
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={drawBoundingBox}
                    onChange={(e) => setDrawBoundingBox(e.target.checked)}
                    className="rounded border-stone-300 text-indigo-600"
                  />
                  <span>Show Locator Candidate Boxes</span>
                </label>
              </div>
            </div>
          </div>

          {/* REQUIREMENT 8: Reference Image / Screenshot File Upload Test */}
          <div className="bg-white rounded-xl shadow-xs border border-stone-200 p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-stone-800 flex items-center gap-1.5">
                <FileSearch className="w-4 h-4 text-indigo-600" />
                Static Image / Reference Screenshot Tester
              </h3>
              <span className="text-[11px] text-stone-400">Offline validation test</span>
            </div>
            <p className="text-xs text-stone-500">
              Upload or drag a screenshot/photo of your reference barcode (e.g. the Code 128 <code>424 HR SP 210</code> screenshot) to test single-image decoding independently of the webcam.
            </p>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="quagga-image-input"
              />
              <label
                htmlFor="quagga-image-input"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs border border-stone-300 cursor-pointer transition"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                {isProcessingImage ? 'Decoding Image...' : 'Upload Barcode Image / Screenshot'}
              </label>

              {imageTestResult && (
                <button
                  type="button"
                  onClick={() => setImageTestResult(null)}
                  className="text-xs text-stone-400 hover:text-stone-600"
                >
                  Clear result
                </button>
              )}
            </div>

            {/* Static Image Result Display */}
            {imageTestResult && (
              <div
                className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                  imageTestResult.success
                    ? imageTestResult.validation.valid
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {imageTestResult.success ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Decoded from Image:</span>
                      <span className="font-mono uppercase font-bold text-[11px]">
                        Format: {imageTestResult.format}
                      </span>
                    </div>
                    <div className="font-mono text-xl font-black">{imageTestResult.rawCode}</div>
                    <div className="text-[11px]">
                      Validation:{' '}
                      <strong className={imageTestResult.validation.valid ? 'text-emerald-700' : 'text-amber-700'}>
                        {imageTestResult.validation.reason}
                      </strong>
                    </div>
                  </>
                ) : (
                  <div>{imageTestResult.message}</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Diagnostics, Consensus Meter & Confirmed History (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* REQUIREMENT 4 & 5: Live Frame Candidate & Consensus Meter */}
          <div className="bg-white rounded-xl shadow-xs border border-stone-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-stone-800 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Consensus Verification Meter
              </h3>
              <span className="text-[11px] font-mono text-stone-500">
                Threshold: {REQUIRED_CONSENSUS_FRAMES} frames
              </span>
            </div>

            {/* Visual consensus progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-stone-600">Candidate Persistence:</span>
                <span className="font-mono font-bold text-indigo-700">
                  {consensusProgress.candidateCode
                    ? `${consensusProgress.count} / ${REQUIRED_CONSENSUS_FRAMES} frames`
                    : 'Awaiting barcode...'}
                </span>
              </div>
              <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden border border-stone-200">
                <div
                  className={`h-full transition-all duration-150 ${
                    consensusProgress.count >= REQUIRED_CONSENSUS_FRAMES
                      ? 'bg-emerald-500'
                      : consensusProgress.count > 0
                      ? 'bg-indigo-500'
                      : 'bg-transparent'
                  }`}
                  style={{
                    width: `${Math.min(100, (consensusProgress.count / REQUIRED_CONSENSUS_FRAMES) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Current Active Candidate Inspector */}
            {consensusProgress.candidateCode ? (
              <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-200 space-y-1 text-xs">
                <div className="flex justify-between text-indigo-900">
                  <span className="font-semibold">Candidate Code:</span>
                  <span className="font-mono uppercase font-bold text-[11px] text-indigo-700">
                    {consensusProgress.candidateFormat}
                  </span>
                </div>
                <div className="font-mono text-base font-bold text-indigo-950 break-all">
                  {consensusProgress.candidateCode}
                </div>
                {consensusProgress.avgError !== null && (
                  <div className="text-[11px] text-indigo-800 font-mono">
                    Avg character error: {consensusProgress.avgError.toFixed(3)}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-stone-50 border border-dashed border-stone-200 text-stone-400 text-xs text-center italic">
                Hold barcode steady in the guide ribbon to accumulate consensus.
              </div>
            )}

            {/* Live Raw Frame Diagnostics Box (Requirement 5) */}
            <div className="pt-2 border-t border-stone-100 space-y-2">
              <div className="text-[11px] font-bold text-stone-700 flex items-center justify-between">
                <span>Last Raw Frame Decoded by Library:</span>
                {liveRawFrame && <span className="font-mono text-[10px] text-stone-400">{liveRawFrame.timestamp}</span>}
              </div>

              {liveRawFrame ? (
                <div className="p-2.5 bg-stone-900 text-stone-200 rounded-lg font-mono text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-stone-400">Raw String:</span>
                    <span className="text-emerald-400 font-bold">{liveRawFrame.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Format:</span>
                    <span className="text-indigo-300">{liveRawFrame.format}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Validation:</span>
                    <span className={liveRawFrame.valid ? 'text-emerald-400' : 'text-rose-400'}>
                      {liveRawFrame.valid ? 'PASSED' : 'REJECTED'}
                    </span>
                  </div>
                  {!liveRawFrame.valid && (
                    <div className="text-[10px] text-rose-300 border-t border-stone-800 pt-1">
                      Reason: {liveRawFrame.reason}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-stone-400 italic">No raw frame decoded yet in this session.</div>
              )}
            </div>
          </div>

          {/* Confirmed Scans List (Requirement 6) */}
          <div className="bg-white rounded-xl shadow-xs border border-stone-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-stone-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Manually Confirmed Barcodes ({confirmedScans.length})
              </h3>
              {confirmedScans.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmedScans([])}
                  className="text-[11px] text-stone-400 hover:text-rose-600 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {confirmedScans.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-3 text-center">
                Barcodes confirmed by you will appear here ready to copy or bind to products.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {confirmedScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-emerald-950 truncate select-all">
                        {scan.code}
                      </div>
                      <div className="text-[10px] text-emerald-700">
                        {scan.format.toUpperCase()} &bull; {scan.confirmedAt}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(scan.code)}
                      className="p-1.5 text-emerald-700 hover:text-emerald-900 rounded hover:bg-white cursor-pointer"
                      title="Copy barcode string"
                    >
                      {copiedCode === scan.code ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* False Positives Rejected Counter */}
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              <span>Rejected False Positives:</span>
              <span className="font-mono font-bold text-rose-600">{rejectedCount}</span>
            </div>
          </div>

          {/* Real-time Diagnostic Event Stream (Requirement 5) */}
          <div className="bg-stone-900 rounded-xl p-4 text-stone-200 space-y-2 shadow-xs border border-stone-800">
            <div className="flex items-center justify-between text-xs border-b border-stone-800 pb-2">
              <span className="font-bold flex items-center gap-1.5 text-stone-300">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                Live Frame Event Log
              </span>
              <button
                type="button"
                onClick={() => setLiveEventLog([])}
                className="text-[10px] text-stone-500 hover:text-stone-300 cursor-pointer"
              >
                Clear log
              </button>
            </div>

            <div className="font-mono text-[10px] space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {liveEventLog.length === 0 ? (
                <div className="text-stone-600 py-3 text-center italic">Waiting for camera frame events...</div>
              ) : (
                liveEventLog.map((ev) => (
                  <div key={ev.id} className="border-b border-stone-800/60 pb-1 leading-relaxed">
                    <div className="flex justify-between text-stone-500">
                      <span>[{ev.time}]</span>
                      <span
                        className={
                          ev.type.startsWith('REJECTED')
                            ? 'text-rose-400'
                            : ev.type.includes('CONFIRMED')
                            ? 'text-emerald-400'
                            : 'text-indigo-400'
                        }
                      >
                        {ev.type}
                      </span>
                    </div>
                    {ev.code && (
                      <div className="text-stone-300">
                        Code: <span className="text-amber-300">{ev.code}</span> ({ev.format})
                        {ev.error !== undefined && ev.error !== null && (
                          <span className="text-stone-500 ml-1">err: {ev.error.toFixed(3)}</span>
                        )}
                      </div>
                    )}
                    <div className="text-stone-400 text-[9px]">{ev.detail}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
