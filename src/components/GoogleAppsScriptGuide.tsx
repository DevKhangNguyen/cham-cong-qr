import React, { useState } from 'react';
import { GOOGLE_APPS_SCRIPT_CODE } from '../services/gasCodeTemplate';
import { gasService } from '../services/gasService';
import {
  FileCode,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
  Database,
  Layers,
  HelpCircle,
  PlayCircle,
  Wifi,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

export const GoogleAppsScriptGuide: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [gasUrlInput, setGasUrlInput] = useState(gasService.getGasUrl());
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadCode = () => {
    const blob = new Blob([GOOGLE_APPS_SCRIPT_CODE], {
      type: 'text/javascript;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Code.gs';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveAndTestUrl = async () => {
    gasService.setGasUrl(gasUrlInput);
    if (!gasUrlInput.trim()) {
      setTestResult({
        status: 'idle',
        message: 'Đã xóa cấu hình URL. Hệ thống đang sử dụng Google Sheets Store nội bộ.',
      });
      return;
    }

    setTestResult({ status: 'testing' });
    try {
      const response = await fetch(`${gasUrlInput.trim()}?action=PING`);
      const data = await response.json();
      if (data.status === 'success') {
        setTestResult({
          status: 'success',
          message: `Kết nối thành công! Giờ máy chủ: ${data.serverTime} (${data.timezone})`,
        });
      } else {
        setTestResult({
          status: 'error',
          message: `Google Apps Script phản hồi: ${data.message || 'Lỗi không xác định'}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: `Không thể kết nối đến Web App: ${err.message}. Hãy đảm bảo bạn đã chọn quyền truy cập là "Anyone" (Bất kỳ ai).`,
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-sky-700" />
              Cấu hình Google Sheets & Backend Google Apps Script
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Phòng khám Đa khoa Y Dược Nhã Uyên Cà Mau · Không cần máy chủ riêng hay database SQL phức tạp
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyCode}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Đã sao chép Code.gs!' : 'Sao chép mã Code.gs'}
            </button>
            <button
              onClick={handleDownloadCode}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" /> Tải về Code.gs
            </button>
          </div>
        </div>
      </section>

      {/* Web App URL Connection Tester */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Wifi className="w-4 h-4 text-sky-600" />
          Liên kết Web App Google Apps Script
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          Sau khi Deploy Web App từ Google Sheets, hãy dán đường link kết thúc bằng <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded">/exec</code> vào đây:
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="url"
            placeholder="https://script.google.com/macros/s/.../exec"
            value={gasUrlInput}
            onChange={e => setGasUrlInput(e.target.value)}
            className="flex-1 w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-1 focus:ring-sky-600"
          />
          <button
            onClick={handleSaveAndTestUrl}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap transition-colors"
          >
            Lưu & Kiểm tra kết nối
          </button>
        </div>

        {testResult.status === 'testing' && (
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-600 animate-ping" />
            Đang gửi tín hiệu kiểm tra (Ping) đến Google Apps Script...
          </div>
        )}

        {testResult.status === 'success' && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{testResult.message}</span>
          </div>
        )}

        {testResult.status === 'error' && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{testResult.message}</span>
          </div>
        )}
      </section>

      {/* 12-Step Implementation Guide for Non-Programmers */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Hướng dẫn triển khai 12 bước từng bước (Dành cho người không chuyên lập trình)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Thực hiện đầy đủ theo hướng dẫn này sẽ thiết lập hệ thống chấm công phòng khám hoạt động vĩnh viễn và hoàn toàn miễn phí.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Step 1 */}
          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-800 text-white flex items-center justify-center text-[10px]">1</span>
              Tạo Google Spreadsheet mới
            </div>
            <p className="text-slate-600 leading-relaxed">
              Truy cập <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-sky-700 underline font-semibold">sheets.new</a> trên trình duyệt. Đặt tên bảng tính là <strong>"Chấm Công - PKĐK Y Dược Nhã Uyên"</strong>.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-800 text-white flex items-center justify-center text-[10px]">2</span>
              Mở trình chỉnh sửa Apps Script
            </div>
            <p className="text-slate-600 leading-relaxed">
              Trên thanh menu Google Sheets, bấm vào <strong>Tiện ích mở rộng (Extensions)</strong> → chọn <strong>Apps Script</strong>.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-800 text-white flex items-center justify-center text-[10px]">3</span>
              Dán toàn bộ mã nguồn Code.gs
            </div>
            <p className="text-slate-600 leading-relaxed">
              Xóa sạch các dòng mặc định trong tệp <code>Mã.gs</code> (hoặc <code>Code.gs</code>). Bấm nút <strong>"Sao chép mã Code.gs"</strong> ở góc trên và dán toàn bộ vào. Bấm biểu tượng <strong>Lưu (Save)</strong>.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-800 text-white flex items-center justify-center text-[10px]">4</span>
              Chạy hàm setupSpreadsheet()
            </div>
            <p className="text-slate-600 leading-relaxed">
              Ở ô chọn hàm chạy phía trên Apps Script, chọn hàm <code>setupSpreadsheet</code> rồi bấm <strong>Chạy (Run)</strong>.
            </p>
          </div>

          {/* Step 5 */}
          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-800 text-white flex items-center justify-center text-[10px]">5</span>
              Cấp quyền truy cập Google Sheet
            </div>
            <p className="text-slate-600 leading-relaxed">
              Google sẽ hiện bảng thông báo yêu cầu ủy quyền. Bấm <em>Xem xét quyền</em> → Chọn tài khoản Google của bạn → Bấm <em>Nâng cao (Advanced)</em> → Chọn <em>Đi tới dự án (không an toàn)</em> → Bấm <strong>Cho phép (Allow)</strong>.
            </p>
          </div>

          {/* Step 6 */}
          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-800 text-white flex items-center justify-center text-[10px]">6</span>
              Kiểm tra 5 Sheets tự động tạo
            </div>
            <p className="text-slate-600 leading-relaxed">
              Quay lại tab Google Sheets: Hệ thống đã tự động tạo sẵn 5 Sheets: <code>NhanVien</code>, <code>ChamCong</code>, <code>CaLamViec</code>, <code>CauHinh</code>, <code>NhatKyHeThong</code> với đầy đủ định dạng màu xanh y tế.
            </p>
          </div>

          {/* Step 7 */}
          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-800 text-white flex items-center justify-center text-[10px]">7</span>
              Tài khoản Admin ban đầu
            </div>
            <p className="text-slate-600 leading-relaxed">
              Tài khoản quản trị viên đầu tiên được tạo tự động: Tên đăng nhập: <strong>admin</strong> | Mật khẩu: <strong>Admin@123</strong> (Đã băm SHA-256 kèm salt bảo mật, không lộ trên sheet).
            </p>
          </div>

          {/* Step 8 */}
          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-800 text-white flex items-center justify-center text-[10px]">8</span>
              Cấu hình vị trí Ấp 5, Thới Bình, Cà Mau
            </div>
            <p className="text-slate-600 leading-relaxed">
              Trong Sheet <code>CauHinh</code> hoặc tab Quản trị trên web, kiểm tra: Vĩ độ: <strong>9.3789</strong>, Kinh độ: <strong>105.1186</strong>, Bán kính: <strong>150m</strong>.
            </p>
          </div>

          {/* Step 9 */}
          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-800 text-white flex items-center justify-center text-[10px]">9</span>
              Triển khai dưới dạng Web App
            </div>
            <p className="text-slate-600 leading-relaxed">
              Trên Apps Script, bấm nút <strong>Triển khai (Deploy)</strong> ở góc trên bên phải → <strong>Tùy chọn triển khai mới (New deployment)</strong> → Chọn biểu tượng bánh răng ⚙️ → <strong>Ứng dụng web (Web app)</strong>.
            </p>
          </div>

          {/* Step 10 */}
          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-800 text-white flex items-center justify-center text-[10px]">10</span>
              Cấu hình quyền Thực thi Web App
            </div>
            <p className="text-slate-600 leading-relaxed">
              Chọn: <em>Execute as (Thực thi dưới tên):</em> <strong>Tôi (Me)</strong> | <em>Who has access (Người có quyền truy cập):</em> <strong>Bất kỳ ai (Anyone)</strong>. Bấm <strong>Triển khai (Deploy)</strong>.
            </p>
          </div>

          {/* Step 11 */}
          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-800 text-white flex items-center justify-center text-[10px]">11</span>
              Kết nối Web App URL vào website
            </div>
            <p className="text-slate-600 leading-relaxed">
              Sao chép đường link Web App URL (kết thúc bằng <code>/exec</code>), dán vào ô <strong>"Liên kết Web App"</strong> phía trên và bấm <em>Lưu & Kiểm tra</em>.
            </p>
          </div>

          {/* Step 12 */}
          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-800 text-white flex items-center justify-center text-[10px]">12</span>
              Sao lưu dữ liệu định kỳ an toàn
            </div>
            <p className="text-slate-600 leading-relaxed">
              Hàng tuần hoặc cuối tháng, trên Google Sheets chọn <strong>Tệp (File)</strong> → <strong>Tạo bản sao (Make a copy)</strong> hoặc <strong>Tải xuống (Download)</strong> → <strong>Microsoft Excel (.xlsx)</strong> để lưu trữ ngoại tuyến.
            </p>
          </div>
        </div>
      </section>

      {/* Code Viewer Preview Section */}
      <section className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-xs text-white">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <FileCode className="w-4 h-4 text-sky-400" />
            <span>Code.gs — Backend Google Apps Script</span>
          </div>
          <button
            onClick={handleCopyCode}
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
          >
            {copied ? 'Đã chép!' : 'Sao chép'}
          </button>
        </div>

        <pre className="max-h-72 overflow-y-auto text-[11px] font-mono text-slate-300 leading-relaxed p-3 bg-slate-950/80 rounded-lg">
          {GOOGLE_APPS_SCRIPT_CODE}
        </pre>
      </section>
    </div>
  );
};
