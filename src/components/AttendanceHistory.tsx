import React, { useState, useMemo } from 'react';
import { Staff, AttendanceRecord } from '../types';
import { gasService } from '../services/gasService';
import { Download, Filter, Search, Calendar, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface AttendanceHistoryProps {
  currentUser: Staff;
}

export const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({ currentUser }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7) // YYYY-MM
  );
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  const allRecords = gasService.getAllAttendanceRecords();

  // Filter records for this user or all if Admin viewing
  const userRecords = useMemo(() => {
    return allRecords.filter(r => {
      // If regular staff, only see own records
      if (currentUser.VaiTro !== 'Admin' && r.MaNhanVien !== currentUser.MaNhanVien) {
        return false;
      }

      // Filter by Month
      if (selectedMonth && !r.NgayChamCong.startsWith(selectedMonth)) {
        return false;
      }

      // Filter by Punch Type
      if (filterType !== 'ALL' && r.LoaiChamCong !== filterType) {
        return false;
      }

      // Filter by Status
      if (filterStatus !== 'ALL' && r.TrangThai !== filterStatus) {
        return false;
      }

      // Filter by Keyword
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        return (
          r.HoTen.toLowerCase().includes(kw) ||
          r.MaNhanVien.toLowerCase().includes(kw) ||
          r.GhiChu.toLowerCase().includes(kw) ||
          r.NgayChamCong.includes(kw)
        );
      }

      return true;
    });
  }, [allRecords, currentUser, selectedMonth, filterType, filterStatus, searchKeyword]);

  // Statistics calculation
  const totalDays = new Set(userRecords.map(r => r.NgayChamCong)).size;
  const lateCount = userRecords.filter(r => r.TrangThai === 'DiMuon').length;
  const earlyCount = userRecords.filter(r => r.TrangThai === 'VeSom').length;
  const onTimeCount = userRecords.filter(r => r.TrangThai === 'HopLe').length;
  const onTimeRate = userRecords.length > 0 ? Math.round((onTimeCount / userRecords.length) * 100) : 100;

  // CSV Export
  const handleExportCSV = () => {
    const csvData = gasService.exportAttendanceCSV(userRecords);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bang_Cham_Cong_${currentUser.MaNhanVien}_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner & Stats */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Lịch sử chấm công & Bảng công chi tiết
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Dữ liệu đồng bộ trực tiếp với Google Sheets của Phòng khám Nhã Uyên
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white text-slate-800"
            />
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Xuất Excel/CSV
            </button>
          </div>
        </div>

        {/* 4 Metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-xs text-slate-500">Tổng ngày có mặt</span>
            <div className="text-lg font-mono font-bold text-slate-900 tabular-nums mt-0.5">
              {totalDays} ngày
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-xs text-slate-500">Tỷ lệ đúng giờ</span>
            <div className="text-lg font-mono font-bold text-emerald-700 tabular-nums mt-0.5">
              {onTimeRate}%
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-xs text-slate-500">Số lần đi muộn</span>
            <div className="text-lg font-mono font-bold text-amber-700 tabular-nums mt-0.5">
              {lateCount} lần
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-xs text-slate-500">Số lần về sớm</span>
            <div className="text-lg font-mono font-bold text-rose-700 tabular-nums mt-0.5">
              {earlyCount} lần
            </div>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo ngày, ghi chú..."
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700"
            >
              <option value="ALL">Tất cả loại chấm công</option>
              <option value="VaoCa">Chấm công Vào</option>
              <option value="RaCa">Chấm công Ra</option>
            </select>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="HopLe">Hợp lệ (Đúng giờ)</option>
              <option value="DiMuon">Đi muộn</option>
              <option value="VeSom">Về sớm</option>
              <option value="DaDieuChinh">Đã điều chỉnh/Duyệt</option>
            </select>
          </div>
        </div>
      </section>

      {/* High-density Data Table */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Ngày</th>
                <th className="py-3 px-4">Giờ</th>
                <th className="py-3 px-4">Nhân viên</th>
                <th className="py-3 px-4">Loại</th>
                <th className="py-3 px-4">Ca làm việc</th>
                <th className="py-3 px-4 text-right">Khoảng cách</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {userRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Không tìm thấy bản ghi chấm công nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                userRecords.map(record => (
                  <tr key={record.MaBanGhi} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                      {record.NgayChamCong}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800 whitespace-nowrap">
                      {record.GioChamCong}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{record.HoTen}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{record.MaNhanVien}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium">
                      {record.LoaiChamCong === 'VaoCa' ? (
                        <span className="text-emerald-700">Vào ca</span>
                      ) : (
                        <span className="text-sky-700">Ra ca</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      {record.CaLamViec === 'CaSang'
                        ? 'Ca Sáng'
                        : record.CaLamViec === 'CaChieu'
                        ? 'Ca Chiều'
                        : 'Ca Trực'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                      {record.KhoangCachDenPhongKham}m
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          record.TrangThai === 'HopLe'
                            ? 'text-emerald-700'
                            : record.TrangThai === 'DiMuon'
                            ? 'text-amber-700'
                            : record.TrangThai === 'VeSom'
                            ? 'text-rose-700'
                            : 'text-sky-700'
                        }`}
                      >
                        {record.TrangThai === 'HopLe'
                          ? 'Đúng giờ'
                          : record.TrangThai === 'DiMuon'
                          ? 'Đi muộn'
                          : record.TrangThai === 'VeSom'
                          ? 'Về sớm'
                          : 'Đã duyệt bổ sung'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {record.GhiChu || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
