import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { generateDynamicQRToken, DEFAULT_CLINIC_SECRET } from '../services/crypto';
import { ClinicLogo } from './ClinicLogo';
import { RefreshCw, Maximize2, Minimize2, ShieldCheck, Volume2, VolumeX, Clock, MapPin } from 'lucide-react';
import { gasService } from '../services/gasService';

interface QRKioskDisplayProps {
  onBackToAttendance: () => void;
}

export const QRKioskDisplay: React.FC<QRKioskDisplayProps> = ({ onBackToAttendance }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(45);
  const [cycleSeconds, setCycleSeconds] = useState(45);
  const [tokenInfo, setTokenInfo] = useState<{ token: string; timestamp: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [recentScansCount, setRecentScansCount] = useState(0);

  // Load configured QR expiration from system config if present
  useEffect(() => {
    const config = gasService.getConfigMap();
    const configuredSeconds = Number(config.ThoiHanQRGiay || 45);
    setCycleSeconds(configuredSeconds);
    setSecondsRemaining(configuredSeconds);
  }, []);

  // Live clock
  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Generate new QR token and render to canvas
  const refreshQRCode = async () => {
    try {
      const { tokenString, payload } = await generateDynamicQRToken(DEFAULT_CLINIC_SECRET, cycleSeconds);
      setTokenInfo({ token: payload.token, timestamp: payload.timestamp });
      setSecondsRemaining(cycleSeconds);

      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, tokenString, {
          width: 340,
          margin: 2,
          color: {
            dark: '#073056', // deep clinic navy
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'M',
        });
      }

      if (soundEnabled) {
        playTickSound();
      }

      // Update count of today's scans
      const today = new Date().toISOString().split('T')[0];
      const todayLogs = gasService.getAllAttendanceRecords().filter(r => r.NgayChamCong === today);
      setRecentScansCount(todayLogs.length);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }
  };

  // Interval timer for countdown & periodic rotation
  useEffect(() => {
    refreshQRCode();

    const countdownTimer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          refreshQRCode();
          return cycleSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [cycleSeconds, soundEnabled]);

  const playTickSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // AudioContext blocked before interaction
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const progressPercent = ((cycleSeconds - secondsRemaining) / cycleSeconds) * 100;

  return (
    <div className={`flex flex-col items-center justify-center p-4 sm:p-6 transition-all ${
      isFullscreen ? 'fixed inset-0 z-50 bg-slate-900 text-white' : 'max-w-2xl mx-auto'
    }`}>
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-md flex flex-col items-center text-center">
        {/* Top Kiosk Header */}
        <div className="w-full flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <button
            onClick={onBackToAttendance}
            className="text-xs font-semibold text-sky-800 hover:text-sky-950 underline underline-offset-2"
          >
            ← Về trang chấm công
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              title={soundEnabled ? 'Tắt âm báo đổi mã' : 'Bật âm báo đổi mã'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-sky-700" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Clinic Identity Lockup */}
        <div className="flex flex-col items-center">
          <ClinicLogo size={76} />
          <h1 className="mt-3 text-lg sm:text-xl font-bold text-slate-900">
            PHÒNG KHÁM ĐA KHOA Y DƯỢC NHÃ UYÊN
          </h1>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-sky-600" />
            Ấp 5, xã Thới Bình, tỉnh Cà Mau
          </p>
        </div>

        {/* Live Clock & Shift Strip */}
        <div className="mt-4 flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200/80 text-xs text-slate-600">
          <Clock className="w-4 h-4 text-sky-700" />
          <span className="font-semibold text-slate-800">
            {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono font-bold text-slate-900 tabular-nums text-sm">
            {currentTime.toLocaleTimeString('vi-VN')}
          </span>
        </div>

        {/* QR Code Canvas Frame with Anti-Fraud Border */}
        <div className="mt-6 relative p-4 bg-white rounded-2xl border-2 border-sky-600 shadow-inner flex flex-col items-center">
          <div className="absolute top-2 right-2 text-[10px] font-mono text-slate-400">
            {tokenInfo?.token || 'NU-SESSION'}
          </div>

          <canvas ref={canvasRef} className="rounded-xl shadow-xs" />

          {/* Progress Countdown Bar */}
          <div className="w-full mt-4">
            <div className="flex items-center justify-between text-xs mb-1 font-medium text-slate-600">
              <span className="flex items-center gap-1 text-sky-800">
                <RefreshCw className="w-3 h-3 animate-spin text-sky-600" />
                Tự động đổi mã sau:
              </span>
              <span className="font-mono font-bold text-sky-950 tabular-nums">
                {secondsRemaining} giây
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-sky-700 transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${100 - progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Anti-Fraud Security Guarantee Notice */}
        <div className="mt-6 w-full p-4 bg-sky-50/70 border border-sky-200/80 rounded-xl text-left text-xs text-slate-700 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-sky-900">
            <ShieldCheck className="w-4 h-4 text-sky-700" />
            Cơ chế chống gian lận & chống chấm công hộ
          </div>
          <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside">
            <li>Mã QR mã hóa động, tự hủy sau mỗi {cycleSeconds} giây.</li>
            <li>Backend kiểm tra thời gian máy chủ Google, không tin cậy giờ trên điện thoại.</li>
            <li>Hệ thống yêu cầu tọa độ GPS nằm trong khuôn viên phòng khám tại Thới Bình, Cà Mau.</li>
            <li>Mỗi mã QR chỉ được sử dụng một lần (chống chụp màn hình gửi qua Zalo/Tin nhắn).</li>
          </ul>
        </div>

        {/* Bottom Status Ticker */}
        <div className="mt-5 w-full flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
          <span>Hôm nay đã ghi nhận: <strong className="font-mono text-slate-900">{recentScansCount}</strong> lượt</span>
          <button
            onClick={refreshQRCode}
            className="flex items-center gap-1 text-sky-700 hover:text-sky-900 font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Làm mới ngay
          </button>
        </div>
      </div>
    </div>
  );
};
