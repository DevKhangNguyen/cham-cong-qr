import React, { useState, useEffect } from 'react';
import { Staff, AttendanceRecord, CheckInType, ShiftCode, WorkShift } from '../types';
import { gasService, resolveShift } from '../services/gasService';
import { QRScannerModal } from './QRScannerModal';
import { GeolocationResult, getCurrentAttendancePosition } from '../services/geo';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRightCircle,
  FileQuestion,
  MapPin,
  Sparkles,
  QrCode,
  ShieldCheck,
  Send,
  RefreshCw,
} from 'lucide-react';

interface StaffAttendanceProps {
  currentUser: Staff;
  onOpenKiosk: () => void;
  onNavigateHistory: () => void;
}

export const StaffAttendance: React.FC<StaffAttendanceProps> = ({
  currentUser,
  onOpenKiosk,
  onNavigateHistory,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeCheckType, setActiveCheckType] = useState<CheckInType>('VaoCa');
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    record?: AttendanceRecord;
  } | null>(null);

  // Quick Adjustment Request Modal State
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjDate, setAdjDate] = useState(new Date().toISOString().split('T')[0]);
  const [adjTime, setAdjTime] = useState('07:00');
  const [adjType, setAdjType] = useState<CheckInType>('VaoCa');
  const [adjShift, setAdjShift] = useState<ShiftCode>('CaSang');
  const [adjReason, setAdjReason] = useState('');
  const [adjSubmitted, setAdjSubmitted] = useState(false);

  // Live Digital Clock (GMT+7)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load today's attendance records
  const loadTodayData = () => {
    const records = gasService.getTodayAttendance(currentUser.MaNhanVien);
    setTodayRecords(records);
  };

  // Manual sync of shift config with Google Sheets
  const handleSyncShift = async () => {
    const list = await gasService.fetchShiftsFromGas();
    setShifts(list);
    loadTodayData();
    setFeedbackMessage({ type: 'success', text: 'Đã cập nhật cấu hình ca mới nhất từ Google Sheets' });
  };

  useEffect(() => {
    loadTodayData();
  }, [currentUser.MaNhanVien]);

  // Load shift configuration from Google Sheets (hoặc local) so the web matches the sheet
  useEffect(() => {
    let active = true;
    (async () => {
      const list = await gasService.fetchShiftsFromGas();
      if (active) setShifts(list);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Determine current active shift (theo cấu hình ca trong Sheet)
  const getCurrentShiftInfo = () => {
    const totalMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const resolved = resolveShift(totalMinutes, 'VaoCa', shifts);
    const timeRange = `${resolved.GioBatDau} - ${resolved.GioKetThuc}`;
    return {
      name: `${resolved.TenCa} (${timeRange})`,
      code: resolved.MaCa,
      status: resolved.isLate
        ? `Đã quá giờ vào ca (Tính đi muộn ${resolved.diffMinutes} phút)`
        : 'Đang trong giờ làm việc',
      isLateWindow: resolved.isLate,
    };
  };

  const currentShift = getCurrentShiftInfo();

  // Trigger Scanner for Check-in / Check-out
  const handleStartPunch = (type: CheckInType) => {
    setActiveCheckType(type);
    setFeedbackMessage(null);
    setIsScannerOpen(true);
  };

  // Handle Scan Result
  const handleScanSuccess = async (qrText: string, geo: GeolocationResult) => {
    setIsScannerOpen(false);

    const lat = geo.latitude || 9.3789;
    const lng = geo.longitude || 105.1186;
    const distance = geo.distanceMeters || 15;

    const result = await gasService.submitAttendance({
      maNhanVien: currentUser.MaNhanVien,
      loaiChamCong: activeCheckType,
      qrText,
      latitude: lat,
      longitude: lng,
      distanceMeters: distance,
    });

    if (result.success) {
      setFeedbackMessage({
        type: 'success',
        text: result.message,
        record: result.record,
      });
      loadTodayData();
    } else {
      setFeedbackMessage({
        type: 'error',
        text: result.message,
      });
    }
  };

  // Monthly stats calculation
  const allUserRecords = gasService
    .getAllAttendanceRecords()
    .filter(r => r.MaNhanVien === currentUser.MaNhanVien);

  const uniqueDays = new Set(allUserRecords.map(r => r.NgayChamCong)).size;
  const lateCount = allUserRecords.filter(r => r.TrangThai === 'DiMuon').length;
  const earlyCount = allUserRecords.filter(r => r.TrangThai === 'VeSom').length;

  const firstCheckIn = todayRecords.find(r => r.LoaiChamCong === 'VaoCa');
  const lastCheckOut = [...todayRecords].reverse().find(r => r.LoaiChamCong === 'RaCa');

  // Submit Adjustment Request Handler
  const handleSubmitAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjReason.trim()) return;

    gasService.submitAdjustmentRequest({
      maNhanVien: currentUser.MaNhanVien,
      hoTen: currentUser.HoTen,
      ngayChamCong: adjDate,
      gioChamCong: adjTime,
      loaiChamCong: adjType,
      caLamViec: adjShift,
      lyDo: adjReason.trim(),
    });

    setAdjSubmitted(true);
    setTimeout(() => {
      setAdjSubmitted(false);
      setIsAdjustmentModalOpen(false);
      setAdjReason('');
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Header Profile & Date-Time Card */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-900 font-bold text-lg shrink-0">
              {currentUser.HoTen.split(' ').slice(-1)[0]?.substring(0, 2).toUpperCase() || 'NV'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                  {currentUser.HoTen}
                </h1>
                <span className="text-xs font-mono font-medium text-slate-500">
                  ({currentUser.MaNhanVien})
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentUser.ChucVu} · {currentUser.PhongBan}
              </p>
            </div>
          </div>

          {/* Live Clock Display */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg self-start sm:self-auto">
            <Clock className="w-5 h-5 text-sky-700 shrink-0" />
            <div>
              <div className="text-xs text-slate-500">Giờ máy chủ (GMT+7)</div>
              <div className="text-base sm:text-lg font-mono font-bold text-slate-900 tabular-nums">
                {currentTime.toLocaleTimeString('vi-VN')}
              </div>
            </div>
          </div>
        </div>

        {/* Current Active Shift Strip */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Hôm nay: <strong className="text-slate-900">{currentTime.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Ca hiện tại: <strong className="text-sky-900">{currentShift.name}</strong></span>
          </div>

          <div className="text-slate-500 font-medium flex items-center gap-2">
            <button
              onClick={handleSyncShift}
              title="Đồng bộ cấu hình ca mới nhất từ Google Sheets"
              className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <span className={currentShift.isLateWindow ? 'text-amber-700 font-semibold' : 'text-emerald-700'}>
              {currentShift.status}
            </span>
          </div>
        </div>
      </section>

      {/* Feedback Alert Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : 'bg-rose-50/80 border-rose-200 text-rose-950'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs sm:text-sm">
            <div className="font-bold">{feedbackMessage.text}</div>
            {feedbackMessage.record && (
              <div className="mt-1 text-xs text-emerald-800 space-x-2">
                <span>Giờ ghi nhận: <strong className="font-mono">{feedbackMessage.record.GioChamCong}</strong></span>
                <span>·</span>
                <span>Khoảng cách: <strong className="font-mono">{feedbackMessage.record.KhoangCachDenPhongKham}m</strong></span>
                {feedbackMessage.record.GhiChu && (
                  <>
                    <span>·</span>
                    <span>{feedbackMessage.record.GhiChu}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Main Large Touch Buttons for Attendance (Section 6 & Anti-Slop) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* CHECK-IN BUTTON */}
        <button
          onClick={() => handleStartPunch('VaoCa')}
          className="group relative p-6 bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between min-h-[140px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
              Bắt đầu ca làm việc
            </span>
            <QrCode className="w-6 h-6 text-emerald-200 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight">
              CHẤM CÔNG VÀO
            </div>
            <p className="text-xs text-emerald-100/90 mt-1">
              Mở camera quét mã QR động tại sảnh lễ tân
            </p>
          </div>
        </button>

        {/* CHECK-OUT BUTTON */}
        <button
          onClick={() => handleStartPunch('RaCa')}
          className="group relative p-6 bg-gradient-to-br from-sky-800 to-slate-900 hover:from-sky-900 hover:to-slate-950 text-white rounded-xl shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between min-h-[140px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-200">
              Kết thúc ca làm việc
            </span>
            <QrCode className="w-6 h-6 text-sky-200 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight">
              CHẤM CÔNG RA
            </div>
            <p className="text-xs text-sky-200/90 mt-1">
              Ghi nhận giờ kết thúc ca và đối soát giờ làm
            </p>
          </div>
        </button>
      </section>

      {/* 3. Today's Attendance Status & Recent Punches */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Trạng thái chấm công hôm nay
          </h2>
          <span className="text-xs text-slate-500">
            {todayRecords.length} lượt ghi nhận
          </span>
        </div>

        {/* Summary Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="text-[11px] text-slate-500 font-medium">Giờ vào sớm nhất</div>
            <div className="text-sm sm:text-base font-mono font-bold text-slate-900 mt-1">
              {firstCheckIn ? firstCheckIn.GioChamCong : 'Chưa có'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="text-[11px] text-slate-500 font-medium">Giờ ra gần nhất</div>
            <div className="text-sm sm:text-base font-mono font-bold text-slate-900 mt-1">
              {lastCheckOut ? lastCheckOut.GioChamCong : 'Chưa có'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="text-[11px] text-slate-500 font-medium">Công tích lũy tháng</div>
            <div className="text-sm sm:text-base font-mono font-bold text-slate-900 mt-1">
              {uniqueDays} ngày công
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="text-[11px] text-slate-500 font-medium">Đi muộn / Về sớm</div>
            <div className="text-sm sm:text-base font-mono font-bold text-amber-700 mt-1">
              {lateCount} muộn · {earlyCount} sớm
            </div>
          </div>
        </div>

        {/* Today's punches list */}
        {todayRecords.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
            Hôm nay bạn chưa thực hiện lượt chấm công nào. Hãy bấm nút “CHẤM CÔNG VÀO” ở trên để quét mã.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {todayRecords.map(record => (
              <div
                key={record.MaBanGhi}
                className="py-3 flex items-center justify-between text-xs sm:text-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      record.LoaiChamCong === 'VaoCa' ? 'bg-emerald-500' : 'bg-sky-600'
                    }`}
                  />
                  <div>
                    <div className="font-semibold text-slate-900">
                      {record.LoaiChamCong === 'VaoCa' ? 'Chấm công Vào' : 'Chấm công Ra'}
                      <span className="ml-2 font-mono text-xs text-slate-500 font-normal">
                        {record.GioChamCong}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {record.CaLamViec === 'CaSang'
                        ? 'Ca Sáng'
                        : record.CaLamViec === 'CaChieu'
                        ? 'Ca Chiều'
                        : 'Ca Trực'}
                      {' · '}Khoảng cách: {record.KhoangCachDenPhongKham}m
                      {record.GhiChu && ` · ${record.GhiChu}`}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-xs font-semibold ${
                      record.TrangThai === 'HopLe'
                        ? 'text-emerald-700'
                        : record.TrangThai === 'DiMuon'
                        ? 'text-amber-700'
                        : record.TrangThai === 'VeSom'
                        ? 'text-rose-700'
                        : 'text-slate-600'
                    }`}
                  >
                    {record.TrangThai === 'HopLe'
                      ? 'Hợp lệ'
                      : record.TrangThai === 'DiMuon'
                      ? 'Đi muộn'
                      : record.TrangThai === 'VeSom'
                      ? 'Về sớm'
                      : 'Đã duyệt'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Quick Actions: Exception Request & History Links */}
      <section className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-100/80 rounded-xl border border-slate-200 text-xs">
        <div className="text-slate-600">
          <span>Quên chấm công hoặc lỗi GPS ngoại cảnh? </span>
          <button
            onClick={() => setIsAdjustmentModalOpen(true)}
            className="font-semibold text-sky-800 hover:text-sky-950 underline underline-offset-2 ml-1"
          >
            Gửi yêu cầu giải trình / duyệt bù công
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateHistory}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors shadow-2xs"
          >
            Xem toàn bộ lịch sử
          </button>
          <button
            onClick={onOpenKiosk}
            className="px-3 py-1.5 text-xs font-medium text-sky-900 bg-sky-100 hover:bg-sky-200 rounded-lg transition-colors"
          >
            Mở màn hình QR Kiosk
          </button>
        </div>
      </section>

      {/* QR Camera Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        checkType={activeCheckType}
        onScanSuccess={handleScanSuccess}
      />

      {/* Exception / Adjustment Request Modal */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileQuestion className="w-4 h-4 text-sky-700" />
                Gửi yêu cầu điều chỉnh chấm công
              </h3>
              <button
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            {adjSubmitted ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <div className="text-sm font-bold text-slate-900">
                  Gửi yêu cầu thành công!
                </div>
                <p className="text-xs text-slate-500">
                  Quản trị viên phòng khám sẽ xem xét và đối chiếu bảng công của bạn.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitAdjustment} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Ngày cần bổ sung
                  </label>
                  <input
                    type="date"
                    required
                    value={adjDate}
                    onChange={e => setAdjDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Giờ thực tế
                    </label>
                    <input
                      type="time"
                      required
                      value={adjTime}
                      onChange={e => setAdjTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Loại chấm công
                    </label>
                    <select
                      value={adjType}
                      onChange={e => setAdjType(e.target.value as CheckInType)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="VaoCa">Vào ca</option>
                      <option value="RaCa">Ra ca</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Ca làm việc
                  </label>
                  <select
                    value={adjShift}
                    onChange={e => setAdjShift(e.target.value as ShiftCode)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="CaSang">Ca Sáng (07:00 - 11:30)</option>
                    <option value="CaChieu">Ca Chiều (13:00 - 17:00)</option>
                    <option value="CaTruc">Ca Trực Đêm (17:00 - 07:00)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Lý do giải trình (Bắt buộc)
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Ví dụ: Cấp cứu bệnh nhân gấp chưa kịp quét QR; mất mạng 4G; lỗi định vị GPS..."
                    value={adjReason}
                    onChange={e => setAdjReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-600"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAdjustmentModalOpen(false)}
                    className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Gửi yêu cầu
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
