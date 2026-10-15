import React, { useState, useEffect } from 'react';
import { Staff, AttendanceRecord, WorkShift, SystemLog, AdjustmentRequest, StaffRole, UserRole, ShiftCode } from '../types';
import { gasService } from '../services/gasService';
import {
  Users,
  Clock,
  MapPin,
  FileSpreadsheet,
  AlertOctagon,
  ShieldAlert,
  Plus,
  Lock,
  Unlock,
  Edit2,
  Check,
  X,
  Download,
  CheckCircle2,
  Settings,
  HelpCircle,
  FileCheck,
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: Staff;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'staff' | 'shifts' | 'adjustments' | 'logs' | 'config'
  >('overview');

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [adjustmentRequests, setAdjustmentRequests] = useState<AdjustmentRequest[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [configMap, setConfigMap] = useState<Record<string, string>>({});

  // Employee creation/edit modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState({
    MaNhanVien: '',
    HoTen: '',
    PhongBan: 'Khoa Khám Bệnh',
    ChucVu: 'Bác sĩ' as StaffRole,
    TenDangNhap: '',
    Password: '',
    VaiTro: 'NhanVien' as UserRole,
    TrangThai: 'HoatDong' as Staff['TrangThai'],
    SoDienThoai: '',
    Email: '',
  });

  // Action status message
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const refreshAllData = async () => {
    const staff = await gasService.fetchStaffFromGas();
    setStaffList(staff);
    setAttendanceRecords(gasService.getAllAttendanceRecords());
    setShifts(gasService.getShifts());
    setAdjustmentRequests(gasService.getAdjustmentRequests());
    setSystemLogs(gasService.getSystemLogs());
    setConfigMap(gasService.getConfigMap());
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const notify = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 3000);
  };

  // Metrics computation for today
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = attendanceRecords.filter(r => r.NgayChamCong === today);
  const uniqueCheckedInStaffIds = new Set(todayRecords.map(r => r.MaNhanVien));
  const activeStaffTotal = staffList.filter(s => s.TrangThai === 'HoatDong').length;
  const checkedInCount = uniqueCheckedInStaffIds.size;
  const notCheckedInCount = Math.max(0, activeStaffTotal - checkedInCount);
  const lateTodayCount = todayRecords.filter(r => r.TrangThai === 'DiMuon').length;

  // Toggle staff lock/unlock
  const handleToggleLock = async (maNhanVien: string) => {
    const res = await gasService.toggleStaffStatus(maNhanVien);
    if (res.success) {
      notify(`Đã ${res.status === 'HoatDong' ? 'mở khóa' : 'khóa'} tài khoản ${maNhanVien}`);
      await refreshAllData();
    } else {
      alert('Không thể đổi trạng thái nhân viên. Kiểm tra kết nối Google Sheets.');
    }
  };

  // Open modal to add staff
  const handleOpenAddStaff = () => {
    setEditingStaffId(null);
    const nextNum = staffList.length + 1;
    setStaffForm({
      MaNhanVien: `NV-${String(nextNum).padStart(3, '0')}`,
      HoTen: '',
      PhongBan: 'Khoa Khám Bệnh',
      ChucVu: 'Bác sĩ',
      TenDangNhap: '',
      Password: '',
      VaiTro: 'NhanVien',
      TrangThai: 'HoatDong',
      SoDienThoai: '',
      Email: '',
    });
    setIsStaffModalOpen(true);
  };

  // Open modal to edit staff
  const handleOpenEditStaff = (staff: Staff) => {
    setEditingStaffId(staff.MaNhanVien);
    setStaffForm({
      MaNhanVien: staff.MaNhanVien,
      HoTen: staff.HoTen,
      PhongBan: staff.PhongBan,
      ChucVu: staff.ChucVu,
      TenDangNhap: staff.TenDangNhap,
      Password: '', // leave empty unless resetting
      VaiTro: staff.VaiTro,
      TrangThai: staff.TrangThai,
      SoDienThoai: staff.SoDienThoai || '',
      Email: staff.Email || '',
    });
    setIsStaffModalOpen(true);
  };

  // Save staff (create or update)
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStaffId) {
      const updates: any = {
        HoTen: staffForm.HoTen,
        PhongBan: staffForm.PhongBan,
        ChucVu: staffForm.ChucVu,
        VaiTro: staffForm.VaiTro,
        TrangThai: staffForm.TrangThai,
        SoDienThoai: staffForm.SoDienThoai,
        Email: staffForm.Email,
      };
      if (staffForm.Password.trim()) {
        updates.newPasswordPlain = staffForm.Password.trim();
      }
      const res = await gasService.updateStaff(editingStaffId, updates);
      if (res.success) {
        notify('Cập nhật nhân viên thành công!');
        setIsStaffModalOpen(false);
        await refreshAllData();
      } else {
        alert(res.message);
      }
    } else {
      if (!staffForm.Password.trim()) {
        alert('Vui lòng nhập mật khẩu ban đầu cho nhân viên.');
        return;
      }
      const res = await gasService.createStaff({
        MaNhanVien: staffForm.MaNhanVien,
        HoTen: staffForm.HoTen,
        PhongBan: staffForm.PhongBan,
        ChucVu: staffForm.ChucVu,
        TenDangNhap: staffForm.TenDangNhap,
        passwordPlain: staffForm.Password.trim(),
        ThongTinXacThuc: '',
        VaiTro: staffForm.VaiTro,
        TrangThai: staffForm.TrangThai,
        SoDienThoai: staffForm.SoDienThoai,
        Email: staffForm.Email,
      });
      if (res.success) {
        notify('Tạo tài khoản nhân viên thành công!');
        setIsStaffModalOpen(false);
        await refreshAllData();
      } else {
        alert(res.message);
      }
    }
  };

  // Adjustment Approval Handler
  const handleReviewAdjustment = (reqId: string, approved: boolean) => {
    const note = prompt(
      approved ? 'Nhập ghi chú duyệt (tùy chọn):' : 'Nhập lý do từ chối yêu cầu:'
    );
    if (note === null) return;

    gasService.approveAdjustment(reqId, approved, currentUser.HoTen, note || (approved ? 'Đồng ý duyệt bổ sung' : 'Không đạt yêu cầu'));
    notify(approved ? 'Đã duyệt bổ sung công' : 'Đã từ chối yêu cầu');
    refreshAllData();
  };

  // Save Shift Edits
  const handleSaveShift = (shift: WorkShift) => {
    gasService.updateShift(shift);
    notify(`Đã cập nhật cấu hình ${shift.TenCa}`);
    refreshAllData();
  };

  // Save Clinic Geo Config
  const handleSaveConfig = (key: string, val: string) => {
    gasService.updateConfig(key, val);
    notify('Đã cập nhật cấu hình hệ thống');
    refreshAllData();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Admin Subheader & Navigation Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Bảng điều khiển Quản trị viên
            </h1>
            <p className="text-xs text-slate-500">
              Phòng khám Đa khoa Y Dược Nhã Uyên · Quản lý nhân sự, ca kíp và dữ liệu chấm công
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const csv = gasService.exportAttendanceCSV(attendanceRecords);
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Bao_Cao_Cham_Cong_Nha_Uyen_${today}.csv`;
                a.click();
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Xuất toàn bộ bảng công (CSV)
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-1 sm:gap-2 mt-5 border-t border-slate-100 pt-3 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'overview' ? 'bg-sky-100 text-sky-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tổng quan ngày
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'staff' ? 'bg-sky-100 text-sky-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Nhân sự ({staffList.length})
          </button>
          <button
            onClick={() => setActiveTab('shifts')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'shifts' ? 'bg-sky-100 text-sky-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Ca làm việc
          </button>
          <button
            onClick={() => setActiveTab('adjustments')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'adjustments' ? 'bg-sky-100 text-sky-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Duyệt bổ sung ({adjustmentRequests.filter(r => r.trangThai === 'ChoDuyet').length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'logs' ? 'bg-sky-100 text-sky-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Nhật ký kiểm tra ({systemLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'config' ? 'bg-sky-100 text-sky-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Vị trí & Cấu hình
          </button>
        </div>
      </div>

      {/* Status Notice Toast */}
      {statusNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Tổng nhân viên</span>
              <div className="text-2xl font-mono font-bold text-slate-900 mt-1 tabular-nums">
                {activeStaffTotal}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Đang hoạt động</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Đã chấm công hôm nay</span>
              <div className="text-2xl font-mono font-bold text-emerald-700 mt-1 tabular-nums">
                {checkedInCount}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">
                {Math.round((checkedInCount / Math.max(1, activeStaffTotal)) * 100)}% quân số
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Chưa chấm công</span>
              <div className="text-2xl font-mono font-bold text-slate-600 mt-1 tabular-nums">
                {notCheckedInCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Chưa có lượt quét</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Lượt đi muộn hôm nay</span>
              <div className="text-2xl font-mono font-bold text-amber-700 mt-1 tabular-nums">
                {lateTodayCount}
              </div>
              <div className="text-[11px] text-amber-600 mt-1">Vượt quá 15 phút gia hạn</div>
            </div>
          </div>

          {/* Today's Live Attendance Stream */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4">
              Lượt chấm công hôm nay ({todayRecords.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Giờ</th>
                    <th className="py-2.5 px-3">Mã NV</th>
                    <th className="py-2.5 px-3">Họ và tên</th>
                    <th className="py-2.5 px-3">Khoa / Phòng</th>
                    <th className="py-2.5 px-3">Loại</th>
                    <th className="py-2.5 px-3 text-right">Khoảng cách</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {todayRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        Chưa có lượt chấm công nào trong ngày hôm nay.
                      </td>
                    </tr>
                  ) : (
                    todayRecords.map(r => (
                      <tr key={r.MaBanGhi} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                          {r.GioChamCong}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{r.MaNhanVien}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{r.HoTen}</td>
                        <td className="py-2.5 px-3 text-slate-600">{r.PhongBan}</td>
                        <td className="py-2.5 px-3">
                          {r.LoaiChamCong === 'VaoCa' ? (
                            <span className="text-emerald-700 font-semibold">Vào ca</span>
                          ) : (
                            <span className="text-sky-700 font-semibold">Ra ca</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">{r.KhoangCachDenPhongKham}m</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={
                              r.TrangThai === 'HopLe'
                                ? 'text-emerald-700 font-semibold'
                                : r.TrangThai === 'DiMuon'
                                ? 'text-amber-700 font-semibold'
                                : 'text-rose-700 font-semibold'
                            }
                          >
                            {r.TrangThai === 'HopLe' ? 'Đúng giờ' : r.TrangThai === 'DiMuon' ? 'Đi muộn' : r.TrangThai}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF MANAGEMENT */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Danh sách nhân sự phòng khám</h2>
              <p className="text-xs text-slate-500">
                Nhân viên không thể tự đăng ký. Mật khẩu được mã hóa SHA-256 kèm Salt trên Google Sheets.
              </p>
            </div>
            <button
              onClick={handleOpenAddStaff}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm nhân viên mới
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Mã NV</th>
                  <th className="py-3 px-3">Họ và tên</th>
                  <th className="py-3 px-3">Phòng ban</th>
                  <th className="py-3 px-3">Chức vụ</th>
                  <th className="py-3 px-3">Tên đăng nhập</th>
                  <th className="py-3 px-3">Vai trò</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {staffList.map(staff => (
                  <tr key={staff.MaNhanVien} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                      {staff.MaNhanVien}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{staff.HoTen}</td>
                    <td className="py-3 px-3 text-slate-600">{staff.PhongBan}</td>
                    <td className="py-3 px-3">{staff.ChucVu}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{staff.TenDangNhap}</td>
                    <td className="py-3 px-3">
                      <span className={staff.VaiTro === 'Admin' ? 'text-sky-800 font-bold' : 'text-slate-600'}>
                        {staff.VaiTro}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={
                          staff.TrangThai === 'HoatDong'
                            ? 'text-emerald-700 font-semibold'
                            : 'text-rose-700 font-semibold'
                        }
                      >
                        {staff.TrangThai === 'HoatDong' ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditStaff(staff)}
                        title="Chỉnh sửa hoặc đổi mật khẩu"
                        className="p-1 text-slate-500 hover:text-sky-700 hover:bg-slate-100 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleLock(staff.MaNhanVien)}
                        title={staff.TrangThai === 'HoatDong' ? 'Khóa tài khoản' : 'Mở khóa'}
                        className={`p-1 rounded ${
                          staff.TrangThai === 'HoatDong'
                            ? 'text-slate-500 hover:text-rose-700 hover:bg-rose-50'
                            : 'text-rose-600 hover:text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {staff.TrangThai === 'HoatDong' ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: WORK SHIFTS */}
      {activeTab === 'shifts' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Cấu hình ca làm việc phòng khám</h2>
            <p className="text-xs text-slate-500">
              Quy định giờ vào ca, ra ca và thời gian gia hạn đi muộn / về sớm.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {shifts.map(shift => (
              <div key={shift.MaCa} className="p-4 border border-slate-200 rounded-xl space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-sm text-slate-900">{shift.TenCa}</span>
                  <span className="text-xs font-mono text-slate-500">{shift.MaCa}</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Giờ bắt đầu:</span>
                    <input
                      type="time"
                      value={shift.GioBatDau}
                      onChange={e => handleSaveShift({ ...shift, GioBatDau: e.target.value })}
                      className="px-2 py-1 border border-slate-300 rounded font-mono bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Giờ kết thúc:</span>
                    <input
                      type="time"
                      value={shift.GioKetThuc}
                      onChange={e => handleSaveShift({ ...shift, GioKetThuc: e.target.value })}
                      className="px-2 py-1 border border-slate-300 rounded font-mono bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Cho phép trễ:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={shift.ThoiGianChoPhepTre}
                        onChange={e =>
                          handleSaveShift({ ...shift, ThoiGianChoPhepTre: Number(e.target.value) })
                        }
                        className="w-16 px-2 py-1 border border-slate-300 rounded font-mono text-right bg-white"
                      />
                      <span className="text-slate-500">phút</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Cho phép về sớm:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={shift.ThoiGianChoPhepSom}
                        onChange={e =>
                          handleSaveShift({ ...shift, ThoiGianChoPhepSom: Number(e.target.value) })
                        }
                        className="w-16 px-2 py-1 border border-slate-300 rounded font-mono text-right bg-white"
                      />
                      <span className="text-slate-500">phút</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ADJUSTMENTS & EXCEPTIONS REVIEW */}
      {activeTab === 'adjustments' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Duyệt yêu cầu điều chỉnh & giải trình chấm công
            </h2>
            <p className="text-xs text-slate-500">
              Giải quyết các trường hợp quên bấm giờ, cấp cứu đột xuất hoặc lỗi thiết bị GPS ngoại cảnh.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Thời gian tạo</th>
                  <th className="py-3 px-3">Nhân viên</th>
                  <th className="py-3 px-3">Ngày xin bổ sung</th>
                  <th className="py-3 px-3">Giờ & Loại</th>
                  <th className="py-3 px-3">Lý do giải trình</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {adjustmentRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Hiện không có yêu cầu điều chỉnh nào cần xử lý.
                    </td>
                  </tr>
                ) : (
                  adjustmentRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                        {req.ngayTao}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{req.hoTen}</div>
                        <div className="text-[11px] font-mono text-slate-500">{req.maNhanVien}</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-medium">{req.ngayChamCong}</td>
                      <td className="py-3 px-3 font-mono">
                        {req.gioChamCong} ({req.loaiChamCong === 'VaoCa' ? 'Vào ca' : 'Ra ca'})
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-sm">{req.lyDo}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            req.trangThai === 'ChoDuyet'
                              ? 'text-amber-700'
                              : req.trangThai === 'DaDuyet'
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {req.trangThai === 'ChoDuyet'
                            ? 'Chờ duyệt'
                            : req.trangThai === 'DaDuyet'
                            ? 'Đã duyệt'
                            : 'Từ chối'}
                        </span>
                        {req.nguoiDuyet && (
                          <div className="text-[10px] text-slate-400">Bởi: {req.nguoiDuyet}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {req.trangThai === 'ChoDuyet' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleReviewAdjustment(req.id, true)}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                            >
                              Duyệt
                            </button>
                            <button
                              onClick={() => handleReviewAdjustment(req.id, false)}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                            >
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Đã xử lý</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: SYSTEM AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Nhật ký kiểm tra & Cảnh báo an ninh hệ thống
              </h2>
              <p className="text-xs text-slate-500">
                Ghi nhận các lần đăng nhập, đổi mật khẩu, quét thất bại và vượt bán kính GPS.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {systemLogs.length} sự kiện gần nhất
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Mã NV</th>
                  <th className="py-2.5 px-3">Hành động</th>
                  <th className="py-2.5 px-3">Kết quả</th>
                  <th className="py-2.5 px-3">Chi tiết / Lý do</th>
                  <th className="py-2.5 px-3">Thiết bị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {systemLogs.map(log => (
                  <tr key={log.MaNhatKy} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                      {log.ThoiGian}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                      {log.MaNhanVien}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{log.HanhDong}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={
                          log.KetQua === 'ThanhCong'
                            ? 'text-emerald-700 font-semibold'
                            : log.KetQua === 'CanhBao'
                            ? 'text-amber-700 font-semibold'
                            : 'text-rose-700 font-semibold'
                        }
                      >
                        {log.KetQua === 'ThanhCong'
                          ? 'Thành công'
                          : log.KetQua === 'CanhBao'
                          ? 'Cảnh báo'
                          : 'Thất bại'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-sm">{log.LyDo}</td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-500">{log.ThongTinThietBi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: LOCATION & CLINIC CONFIGURATION */}
      {activeTab === 'config' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Cấu hình địa điểm phòng khám & Tham số an ninh
            </h2>
            <p className="text-xs text-slate-500">
              Đồng bộ với Sheet “CauHinh” trong Google Sheets của phòng khám Nhã Uyên.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 border border-slate-200 rounded-xl space-y-2">
              <label className="font-bold text-slate-900 block">Tọa độ Vĩ độ (Latitude)</label>
              <input
                type="text"
                defaultValue={configMap.ViDoPhongKham || '9.3789'}
                onBlur={e => handleSaveConfig('ViDoPhongKham', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
              <span className="text-[11px] text-slate-500 block">
                Tọa độ GPS tại Ấp 5, xã Thới Bình, tỉnh Cà Mau
              </span>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl space-y-2">
              <label className="font-bold text-slate-900 block">Tọa độ Kinh độ (Longitude)</label>
              <input
                type="text"
                defaultValue={configMap.KinhDoPhongKham || '105.1186'}
                onBlur={e => handleSaveConfig('KinhDoPhongKham', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
              <span className="text-[11px] text-slate-500 block">
                Tọa độ GPS tại Ấp 5, xã Thới Bình, tỉnh Cà Mau
              </span>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl space-y-2">
              <label className="font-bold text-slate-900 block">Bán kính cho phép (Mét)</label>
              <input
                type="number"
                min="20"
                max="500"
                defaultValue={configMap.BanKinhChamCongMet || '150'}
                onBlur={e => handleSaveConfig('BanKinhChamCongMet', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
              <span className="text-[11px] text-slate-500 block">
                Khoảng cách tối đa từ nhân viên đến vị trí phòng khám (Mặc định 150m)
              </span>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl space-y-2">
              <label className="font-bold text-slate-900 block">Chu kỳ đổi mã QR động (Giây)</label>
              <input
                type="number"
                min="15"
                max="120"
                defaultValue={configMap.ThoiHanQRGiay || '45'}
                onBlur={e => handleSaveConfig('ThoiHanQRGiay', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
              <span className="text-[11px] text-slate-500 block">
                Thời gian mã QR tự đổi trên màn hình kiosk lễ tân (Khuyến nghị 30 - 60s)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Staff Create / Edit Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingStaffId ? `Chỉnh sửa nhân viên ${editingStaffId}` : 'Tạo tài khoản nhân viên mới'}
              </h3>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Mã nhân viên</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingStaffId}
                    value={staffForm.MaNhanVien}
                    onChange={e => setStaffForm({ ...staffForm, MaNhanVien: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Họ và tên</label>
                  <input
                    type="text"
                    required
                    value={staffForm.HoTen}
                    onChange={e => setStaffForm({ ...staffForm, HoTen: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Phòng ban / Khoa</label>
                  <select
                    value={staffForm.PhongBan}
                    onChange={e => setStaffForm({ ...staffForm, PhongBan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Khoa Khám Bệnh">Khoa Khám Bệnh</option>
                    <option value="Khoa Cấp Cứu">Khoa Cấp Cứu</option>
                    <option value="Khoa Xét Nghiệm & CĐHA">Khoa Xét Nghiệm & CĐHA</option>
                    <option value="Khoa Dược">Khoa Dược</option>
                    <option value="Bộ Phận Lễ Tân & Thu Ngân">Bộ Phận Lễ Tân & Thu Ngân</option>
                    <option value="Phòng Kế Toán - Hành Chính">Phòng Kế Toán - Hành Chính</option>
                    <option value="Ban Giám Đốc">Ban Giám Đốc</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Chức danh</label>
                  <select
                    value={staffForm.ChucVu}
                    onChange={e => setStaffForm({ ...staffForm, ChucVu: e.target.value as StaffRole })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Bác sĩ">Bác sĩ</option>
                    <option value="Điều dưỡng">Điều dưỡng</option>
                    <option value="Kỹ thuật viên">Kỹ thuật viên</option>
                    <option value="Lễ tân">Lễ tân</option>
                    <option value="Kế toán">Kế toán</option>
                    <option value="Quản trị viên">Quản trị viên</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tên đăng nhập</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingStaffId}
                    value={staffForm.TenDangNhap}
                    onChange={e => setStaffForm({ ...staffForm, TenDangNhap: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    {editingStaffId ? 'Mật khẩu mới (Bỏ trống nếu giữ nguyên)' : 'Mật khẩu khởi tạo'}
                  </label>
                  <input
                    type="password"
                    value={staffForm.Password}
                    onChange={e => setStaffForm({ ...staffForm, Password: e.target.value })}
                    placeholder={editingStaffId ? '••••••••' : 'Nhập mật khẩu...'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Vai trò</label>
                  <select
                    value={staffForm.VaiTro}
                    onChange={e => setStaffForm({ ...staffForm, VaiTro: e.target.value as UserRole })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="NhanVien">Nhân viên thông thường</option>
                    <option value="Admin">Quản trị viên (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={staffForm.TrangThai}
                    onChange={e =>
                      setStaffForm({ ...staffForm, TrangThai: e.target.value as Staff['TrangThai'] })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="HoatDong">Đang hoạt động</option>
                    <option value="Khoa">Tạm khóa</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg"
                >
                  {editingStaffId ? 'Cập nhật' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
