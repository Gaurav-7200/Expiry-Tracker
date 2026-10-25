import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  SwitchCamera,
  CheckCircle,
  AlertCircle,
  Upload,
  Sparkles,
  Info,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { sounds } from '../utils/audio';

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
  const [scannerError, setScannerError] = useState(null);
  const [lastScannedCode, setLastScannedCode] = useState(null);
  const [isContinuous, setIsContinuous] = useState(continuous);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const html5QrCodeRef = useRef(null);
  const scanCooldownRef = useRef(false);
  const readerElementId = 'stockwise-camera-reader';
  const fileInputRef = useRef(null);

  // Fetch available cameras when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setScannerError(null);
    setLastScannedCode(null);

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!isMounted) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back/rear camera on mobile phones
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          // If device list is empty, we can still attempt environment camera
          setSelectedCameraId('environment');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        // Fallback to environment
        setSelectedCameraId('environment');
      });

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen]);

  // Start scanner when camera is selected
  useEffect(() => {
    if (!isOpen || !selectedCameraId) return;

    let isMounted = true;
    const startScanner = async () => {
      try {
        await stopScanner();

        const qrCode = new Html5Qrcode(readerElementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.ITF,
          ],
          verbose: false,
        });

        html5QrCodeRef.current = qrCode;

        const cameraConfig =
          selectedCameraId === 'environment'
            ? { facingMode: 'environment' }
            : selectedCameraId;

        await qrCode.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!isMounted) return;
            handleBarcodeDetected(decodedText);
          },
          () => {
            // Ignore frame-by-frame non-detection
          }
        );

        if (isMounted) {
          setIsScanning(true);
          setScannerError(null);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to start Html5Qrcode:', err);
        setScannerError(
          `Unable to start live camera video. Please check browser camera permissions or snap a photo of the barcode below.`
        );
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen, selectedCameraId]);

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        // Ignore stop errors on unmount
      }
      html5QrCodeRef.current = null;
      setIsScanning(false);
    }
  };

  const handleBarcodeDetected = (code) => {
    if (scanCooldownRef.current) return;

    const cleanCode = code.trim();
    if (!cleanCode) return;

    scanCooldownRef.current = true;
    setScanCooldown(true);

    sounds.playScanBeep();
    setLastScannedCode(cleanCode);

    onScanSuccess(cleanCode);

    if (!isContinuous) {
      setTimeout(() => {
        void handleClose();
      }, 500);
    } else {
      // Cooldown in continuous mode
      setTimeout(() => {
        scanCooldownRef.current = false;
        setScanCooldown(false);
      }, 1500);
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIndex].id);
  };

  // Image file upload fallback
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setScannerError(null);

    try {
      await stopScanner();
      const qrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.ITF,
        ],
        verbose: false,
      });

      const decodedText = await qrCode.scanFile(file, true);
      handleBarcodeDetected(decodedText);
    } catch (err) {
      sounds.playErrorBuzz();
      setScannerError('Could not detect barcode from image. Make sure the barcode is crisp, clear, and well-lit.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-md bg-stone-900 rounded-3xl shadow-2xl border border-stone-800 overflow-hidden flex flex-col text-white">
        {/* Header */}
        <div className="p-4 bg-stone-950 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                {title}
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </h3>
              <p className="text-[11px] text-stone-400">
                Point phone or webcam camera at grocery barcode
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewfinder Container */}
        <div className="relative bg-black flex flex-col items-center justify-center min-h-[300px] overflow-hidden">
          {/* HTML5 QR Code Mount Element */}
          <div
            id={readerElementId}
            className="w-full h-full [&_video]:object-cover [&_video]:max-h-[360px]"
          />

          {/* Laser Scanning Animation Overlay */}
          {isScanning && !scannerError && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
              <div className="relative w-full max-w-[280px] h-[170px] border-2 border-emerald-500/80 rounded-2xl overflow-hidden shadow-lg shadow-emerald-500/20">
                {/* Corner reticles */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-sm"></div>

                {/* Animated Laser Beam */}
                <div className="w-full h-1 bg-linear-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_rgba(52,211,153,1)] animate-pulse absolute top-1/2 -translate-y-1/2"></div>
              </div>
            </div>
          )}

          {/* Last Scanned Feedback Toast */}
          {lastScannedCode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-emerald-950/90 text-emerald-200 border border-emerald-500/40 px-3 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-xs">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Scanned: {lastScannedCode}</span>
            </div>
          )}

          {/* Scanner Error or Permission Fallback Notice */}
          {scannerError && (
            <div className="p-6 text-center space-y-3 z-20 max-w-sm">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="text-xs text-stone-300 leading-relaxed font-medium">
                {scannerError}
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setScannerError(null);
                    if (cameras.length > 0) setSelectedCameraId(cameras[0].id);
                    else setSelectedCameraId('environment');
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Retry Camera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" /> Take/Upload Barcode Photo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden file input for mobile photo snapping */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Controls & Camera Switcher Toolbar */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 space-y-3">
          <div className="flex items-center justify-between text-xs gap-2">
            {/* Continuous Mode Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isContinuous}
                onChange={(e) => setIsContinuous(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 border-stone-700 focus:ring-emerald-500 bg-stone-800"
              />
              <span className="text-stone-300 font-medium">Continuous Scan</span>
            </label>

            <div className="flex items-center gap-2">
              {/* Photo snap/upload button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingFile}
                className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl flex items-center gap-1 text-[11px] font-medium transition cursor-pointer"
                title="Snap a photo using your phone camera or upload"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isProcessingFile ? 'Reading...' : 'Snap Photo'}</span>
              </button>

              {/* Switch Camera Button (if multiple cameras exist) */}
              {cameras.length > 1 && (
                <button
                  type="button"
                  onClick={switchCamera}
                  className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl flex items-center gap-1 font-semibold text-[11px] transition cursor-pointer"
                  title="Switch between front and back camera"
                >
                  <SwitchCamera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Switch Cam</span>
                </button>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="p-2.5 bg-stone-900 rounded-xl text-[11px] text-stone-400 flex items-center justify-between border border-stone-800">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Scans all grocery EAN-13, UPC, Code-128 & QR
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="text-stone-300 hover:text-white font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
