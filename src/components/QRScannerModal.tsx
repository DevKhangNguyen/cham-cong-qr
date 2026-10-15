import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, SwitchCamera, Upload, AlertCircle, CheckCircle2, MapPin, Loader2 } from 'lucide-react';
import { getCurrentAttendancePosition, GeolocationResult } from '../services/geo';
import { gasService } from '../services/gasService';
import { CheckInType } from '../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkType: CheckInType;
  onScanSuccess: (qrText: string, geo: GeolocationResult) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  checkType,
  onScanSuccess,
}) => {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [geoStatus, setGeoStatus] = useState<GeolocationResult | null>(null);
  const [isLoadingGeo, setIsLoadingGeo] = useState(false);

  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-camera-stream';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    // Refresh GPS coordinate status when opening scanner
    fetchGps();
    startScanner(cameraFacing);

    return () => {
      stopScanner();
    };
  }, [isOpen, cameraFacing]);

  const fetchGps = async () => {
    setIsLoadingGeo(true);
    try {
      await gasService.fetchConfigFromGas();
      const clinic = gasService.getClinicGeo();
      const pos = await getCurrentAttendancePosition(
        clinic.latitude,
        clinic.longitude,
        clinic.radiusMeters,
        false
      );
      setGeoStatus(pos);
    } catch {
      setGeoStatus(null);
    } finally {
      setIsLoadingGeo(false);
    }
  };

  const startScanner = async (facingMode: 'environment' | 'user') => {
    setScannerError(null);
    setIsScanning(true);

    try {
      // Clean up previous instance if running
      if (qrReaderRef.current) {
        try {
          await qrReaderRef.current.stop();
        } catch {
          // ignore
        }
        qrReaderRef.current = null;
      }

      // Small delay to ensure container element is mounted
      await new Promise(r => setTimeout(r, 100));

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      qrReaderRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: facingMode },
        config,
        (decodedText) => {
          handleSuccessfulScan(decodedText);
        },
        () => {
          // Frame without QR code detected - ignore to prevent console spam
        }
      );
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setScannerError(
        'Không thể mở camera. Vui lòng cấp quyền camera trong cài đặt trình duyệt hoặc sử dụng nút "Tải ảnh QR" bên dưới.'
      );
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (qrReaderRef.current) {
      try {
        if (qrReaderRef.current.isScanning) {
          await qrReaderRef.current.stop();
        }
        qrReaderRef.current.clear();
      } catch (err) {
        console.warn('Scanner stop error:', err);
      }
      qrReaderRef.current = null;
    }
    setIsScanning(false);
  };

  const handleSuccessfulScan = async (qrText: string) => {
    // Play short success sound beep
    playBeepSound();

    // Stop scanner first
    await stopScanner();

    // Re-verify position at exact punch instant
    let pos = geoStatus;
    if (!pos || !pos.success) {
      const clinic = gasService.getClinicGeo();
      pos = await getCurrentAttendancePosition(
        clinic.latitude,
        clinic.longitude,
        clinic.radiusMeters,
        false
      );
    }

    onScanSuccess(qrText, pos);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScannerError(null);
      let scanner = qrReaderRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(scannerContainerId);
        qrReaderRef.current = scanner;
      }

      const decodedText = await scanner.scanFile(file, true);
      handleSuccessfulScan(decodedText);
    } catch (err: any) {
      setScannerError('Không tìm thấy mã QR trong hình ảnh tải lên.');
    }
  };

  const toggleCamera = () => {
    setCameraFacing(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const playBeepSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // 880Hz A5 note
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // AudioContext may be blocked before gesture
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-sky-700" />
              Quét QR {checkType === 'VaoCa' ? 'Chấm Công VÀO' : 'Chấm Công RA'}
            </h3>
            <p className="text-xs text-slate-500">
              Hướng camera vào mã QR động hiển thị tại quầy phòng khám
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GPS Distance Bar */}
        <div className="px-5 py-2.5 bg-sky-50/70 border-b border-sky-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
            {isLoadingGeo ? (
              <span className="flex items-center gap-1.5 text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" /> Đang định vị GPS...
              </span>
            ) : geoStatus?.success ? (
              <span>
                Cách phòng khám: <strong className="font-mono text-sky-900">{geoStatus.distanceMeters}m</strong>
                {geoStatus.isSimulated && <span className="text-[10px] text-slate-500 ml-1">(Tọa độ chuẩn)</span>}
              </span>
            ) : (
              <span className="text-amber-700">Chưa xác định tọa độ GPS</span>
            )}
          </div>
          {geoStatus?.withinRadius && (
            <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Hợp lệ
            </span>
          )}
        </div>

        {/* Camera Scanner Viewport */}
        <div className="p-4 flex flex-col items-center">
          <div className="relative w-full aspect-square max-w-[300px] bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-300">
            <div id={scannerContainerId} className="w-full h-full" />

            {/* Target reticle overlay */}
            <div className="absolute inset-8 border-2 border-dashed border-sky-400/80 rounded-lg pointer-events-none flex items-center justify-center">
              <div className="w-12 h-12 border-2 border-white/60 rounded-sm" />
            </div>
          </div>

          {scannerError && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2 w-full">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{scannerError}</span>
            </div>
          )}

          {/* Camera controls & Fallback options */}
          <div className="mt-4 flex items-center justify-between w-full gap-2">
            <button
              onClick={toggleCamera}
              className="flex-1 py-2 px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <SwitchCamera className="w-4 h-4 text-slate-600" />
              Đổi camera ({cameraFacing === 'environment' ? 'Sau' : 'Trước'})
            </button>

            <label className="flex-1 py-2 px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload className="w-4 h-4 text-slate-600" />
              Tải ảnh QR
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Địa chỉ: Ấp 5, xã Thới Bình, Cà Mau
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
