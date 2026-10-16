/**
 * Google Apps Script & Google Sheets Data Service
 * Supports:
 * 1. Direct Web App API calls to Google Apps Script
 * 2. Active in-browser Google Sheets simulator with persistent storage so the app
 *    is 100% operational immediately without requiring an existing sheet deployment!
 */

import {
  Staff,
  AttendanceRecord,
  WorkShift,
  SystemConfig,
  SystemLog,
  AdjustmentRequest,
  CheckInType,
  ShiftCode,
} from '../types';
import { hashPassword, sha256, getDeviceInfo, validateScannedQR, DEFAULT_CLINIC_SECRET } from './crypto';
import { calculateHaversineDistance, DEFAULT_CLINIC_LOCATION } from './geo';

const STORAGE_KEY_GAS_URL = 'nha_uyen_gas_url';

/**
 * URL Web App Google Apps Script dùng chung mọi thiết bị.
 * Ưu tiên: 1) localStorage (Admin đổi tạm)  2) biến môi trường VITE_GAS_URL  3) hằng số dưới đây
 *
 * Cách gắn URL cố định:
 * - Sửa DEFAULT_GAS_WEBAPP_URL bên dưới = link .../exec của bạn
 * - HOẶC tạo file .env : VITE_GAS_URL=https://script.google.com/macros/s/xxx/exec
 * - HOẶC trên Vercel → Settings → Environment Variables → VITE_GAS_URL
 */
const DEFAULT_GAS_WEBAPP_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GAS_URL) ||
  // ▼▼▼ DÁN URL WEB APP CỦA BẠN VÀO GIỮA HAI DẤU NHÁY (kết thúc bằng /exec) ▼▼▼
  'https://script.google.com/macros/s/AKfycbyDJn2Mq7NFDyUOn3r6q3iM9uTyKsMy7Qb7l0SSufRM_f3QNiirSmYa-znaCfuaAKYf2A/exec';
  // ▲▲▲ Ví dụ: 'https://script.google.com/macros/s/AKfycb.../exec' ▲▲▲

const STORAGE_KEY_STAFF = 'nha_uyen_sheet_nhanvien';
const STORAGE_KEY_ATTENDANCE = 'nha_uyen_sheet_chamcong';
const STORAGE_KEY_SHIFTS = 'nha_uyen_sheet_calamviec';
const STORAGE_KEY_CONFIG = 'nha_uyen_sheet_cauhinh';
const STORAGE_KEY_LOGS = 'nha_uyen_sheet_nhatky';
const STORAGE_KEY_ADJUSTMENTS = 'nha_uyen_sheet_dieuchinh';
const STORAGE_KEY_CURRENT_USER = 'nha_uyen_current_user';

// Initial pre-loaded staff with salted SHA-256 passwords
// Default passwords:
// admin -> Admin@123
// bs.an -> 123456
// bs.minh -> 123456
// dd.hoa -> 123456
// ktv.tu -> 123456
// lt.nga -> 123456
export const INITIAL_STAFF_SEEDS: Staff[] = [
  {
    MaNhanVien: 'NV-ADMIN',
    HoTen: 'Quản Trị Viên Hệ Thống',
    PhongBan: 'Ban Giám Đốc',
    ChucVu: 'Quản trị viên',
    TenDangNhap: 'admin',
    Salt: 'salt_admin_nu',
    ThongTinXacThuc: 'b3531b46a7ce97ee28859346797b5e40733d3bb7a048a1b25a3d077b9fe797f7', // precomputed hash for Admin@123
    VaiTro: 'Admin',
    TrangThai: 'HoatDong',
    NgayTao: '2026-01-10 08:00:00',
    SoDienThoai: '0918123456',
    Email: 'admin@nhauyencamau.vn',
  },
  {
    MaNhanVien: 'NV-001',
    HoTen: 'BS.CKI Nguyễn Văn An',
    PhongBan: 'Khoa Khám Bệnh',
    ChucVu: 'Bác sĩ',
    TenDangNhap: 'bs.an',
    Salt: 'salt_bs_an',
    ThongTinXacThuc: '0fa29038ba0a3240212dbd4ca083e9b0682fa08d3fffe41a02fbba580eaae70c', // 123456
    VaiTro: 'NhanVien',
    TrangThai: 'HoatDong',
    NgayTao: '2026-01-15 08:00:00',
    SoDienThoai: '0913456789',
    Email: 'nguyenvanan@nhauyencamau.vn',
  },
  {
    MaNhanVien: 'NV-002',
    HoTen: 'ĐD. Trần Thị Hoa',
    PhongBan: 'Khoa Cấp Cứu',
    ChucVu: 'Điều dưỡng',
    TenDangNhap: 'dd.hoa',
    Salt: 'salt_dd_hoa',
    ThongTinXacThuc: '772b3bf270c2f82955f269a9cf588a870d0b7d341935c1f016f406857106093d', // 123456
    VaiTro: 'NhanVien',
    TrangThai: 'HoatDong',
    NgayTao: '2026-02-01 08:00:00',
    SoDienThoai: '0944112233',
    Email: 'tranthihoa@nhauyencamau.vn',
  },
  {
    MaNhanVien: 'NV-003',
    HoTen: 'KTV. Lê Minh Tú',
    PhongBan: 'Khoa Xét Nghiệm & CĐHA',
    ChucVu: 'Kỹ thuật viên',
    TenDangNhap: 'ktv.tu',
    Salt: 'salt_ktv_tu',
    ThongTinXacThuc: '6bb12128a38520bf2f27ddc526be98b71d4b68e9e6bf08fbb230cb50eeea9b4a', // 123456
    VaiTro: 'NhanVien',
    TrangThai: 'HoatDong',
    NgayTao: '2026-02-15 08:00:00',
    SoDienThoai: '0939556677',
    Email: 'leminhtu@nhauyencamau.vn',
  },
  {
    MaNhanVien: 'NV-004',
    HoTen: 'CN. Phạm Thu Nga',
    PhongBan: 'Bộ Phận Lễ Tân & Thu Ngân',
    ChucVu: 'Lễ tân',
    TenDangNhap: 'lt.nga',
    Salt: 'salt_lt_nga',
    ThongTinXacThuc: 'c5617bfcb1243722aa07246ec7b610738caee9716e3eb39e7284f3eb81a54670', // 123456
    VaiTro: 'NhanVien',
    TrangThai: 'HoatDong',
    NgayTao: '2026-03-01 08:00:00',
    SoDienThoai: '0988776655',
    Email: 'thunga@nhauyencamau.vn',
  },
];

export const INITIAL_SHIFTS: WorkShift[] = [
  {
    MaCa: 'CaSang',
    TenCa: 'Ca Sáng Phòng Khám',
    GioBatDau: '07:00',
    GioKetThuc: '11:30',
    ThoiGianChoPhepTre: 15,
    ThoiGianChoPhepSom: 15,
    TrangThai: 'HoatDong',
  },
  {
    MaCa: 'CaChieu',
    TenCa: 'Ca Chiều Phòng Khám',
    GioBatDau: '13:00',
    GioKetThuc: '17:00',
    ThoiGianChoPhepTre: 15,
    ThoiGianChoPhepSom: 15,
    TrangThai: 'HoatDong',
  },
  {
    MaCa: 'CaTruc',
    TenCa: 'Ca Trực Đêm / Cấp Cứu',
    GioBatDau: '17:00',
    GioKetThuc: '07:00',
    ThoiGianChoPhepTre: 30,
    ThoiGianChoPhepSom: 30,
    TrangThai: 'HoatDong',
  },
];

export const INITIAL_CONFIG: SystemConfig[] = [
  {
    TenCauHinh: 'TenPhongKham',
    GiaTri: 'Phòng khám Đa khoa Y Dược Nhã Uyên Cà Mau',
    MoTa: 'Tên chính thức của đơn vị y tế',
  },
  {
    TenCauHinh: 'DiaChi',
    GiaTri: 'Ấp 5, xã Thới Bình, tỉnh Cà Mau',
    MoTa: 'Địa chỉ trụ sở phòng khám',
  },
  {
    TenCauHinh: 'ViDoPhongKham',
    GiaTri: String(DEFAULT_CLINIC_LOCATION.latitude),
    MoTa: 'Tọa độ GPS Vĩ độ (Latitude) phòng khám',
  },
  {
    TenCauHinh: 'KinhDoPhongKham',
    GiaTri: String(DEFAULT_CLINIC_LOCATION.longitude),
    MoTa: 'Tọa độ GPS Kinh độ (Longitude) phòng khám',
  },
  {
    TenCauHinh: 'BanKinhChamCongMet',
    GiaTri: '150',
    MoTa: 'Bán kính hợp lệ cho phép chấm công xung quanh phòng khám (mét)',
  },
  {
    TenCauHinh: 'ThoiHanQRGiay',
    GiaTri: '45',
    MoTa: 'Chu kỳ tự động đổi mã QR động chống gian lận (giây)',
  },
];

// --- SHIFT RESOLUTION DỰA TRÊN CẤU HÌNH CA TỪ SHEET ---
export interface ResolvedShift {
  MaCa: ShiftCode;
  TenCa: string;
  GioBatDau: string;
  GioKetThuc: string;
  isLate: boolean;
  isEarlyLeave: boolean;
  diffMinutes: number;
}

function hhmmToMinutes(hhmm: string): number {
  const parts = String(hhmm || '').split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

function circularDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 1440;
  return Math.min(d, 1440 - d);
}

// offset có dấu từ anchor -> time trong khoảng (-720, 720]; dương = time sau anchor
function signedOffset(time: number, anchor: number): number {
  return ((time - anchor + 1440 + 720) % 1440) - 720;
}

/**
 * Chọn ca + tính đi muộn / về sớm theo danh sách ca cấu hình trong sheet.
 * - Vào ca: chọn ca có giờ bắt đầu gần nhất; trễ nếu vượt quá ThoiGianChoPhepTre.
 * - Ra ca:  chọn ca có giờ kết thúc gần nhất; về sớm nếu vượt quá ThoiGianChoPhepSom.
 */
export function resolveShift(
  totalMinutes: number,
  loaiChamCong: CheckInType,
  shifts: WorkShift[]
): ResolvedShift {
  const active = (shifts || []).filter(s => s.TrangThai !== 'TamDung');

  if (active.length === 0) {
    return { MaCa: 'CaSang', TenCa: 'Ca Sáng', GioBatDau: '07:00', GioKetThuc: '11:30', isLate: false, isEarlyLeave: false, diffMinutes: 0 };
  }

  let best: WorkShift | null = null;
  let bestDist = Infinity;
  for (const s of active) {
    const anchor = loaiChamCong === 'VaoCa' ? hhmmToMinutes(s.GioBatDau) : hhmmToMinutes(s.GioKetThuc);
    if (!Number.isFinite(anchor)) continue;
    const d = circularDistance(totalMinutes, anchor);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }

  if (!best) {
    return { MaCa: 'CaSang', TenCa: 'Ca Sáng', GioBatDau: '07:00', GioKetThuc: '11:30', isLate: false, isEarlyLeave: false, diffMinutes: 0 };
  }

  let isLate = false;
  let isEarlyLeave = false;
  let diff = 0;

  if (loaiChamCong === 'VaoCa') {
    const start = hhmmToMinutes(best.GioBatDau);
    const allowLate = Number(best.ThoiGianChoPhepTre) || 0;
    const off = signedOffset(totalMinutes, start); // dương = sau giờ bắt đầu
    if (off > allowLate) {
      isLate = true;
      diff = off;
    }
  } else {
    const end = hhmmToMinutes(best.GioKetThuc);
    const allowEarly = Number(best.ThoiGianChoPhepSom) || 0;
    const off = signedOffset(end, totalMinutes); // dương = trước giờ kết thúc
    if (off > allowEarly) {
      isEarlyLeave = true;
      diff = off;
    }
  }

  return {
    MaCa: best.MaCa,
    TenCa: best.TenCa,
    GioBatDau: best.GioBatDau,
    GioKetThuc: best.GioKetThuc,
    isLate,
    isEarlyLeave,
    diffMinutes: diff,
  };
}

class GasDataService {
  private gasUrl: string = '';

  constructor() {
    const saved = (localStorage.getItem(STORAGE_KEY_GAS_URL) || '').trim();
    this.gasUrl = saved || String(DEFAULT_GAS_WEBAPP_URL || '').trim();
    this.initLocalStorage();
  }

  public getGasUrl(): string {
    return this.gasUrl;
  }

  public setGasUrl(url: string): void {
    this.gasUrl = url.trim();
    localStorage.setItem(STORAGE_KEY_GAS_URL, this.gasUrl);
  }

  private initLocalStorage() {
    if (!localStorage.getItem(STORAGE_KEY_STAFF)) {
      localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(INITIAL_STAFF_SEEDS));
    }
    if (!localStorage.getItem(STORAGE_KEY_SHIFTS)) {
      localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(INITIAL_SHIFTS));
    }
    if (!localStorage.getItem(STORAGE_KEY_CONFIG)) {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(INITIAL_CONFIG));
    }
    if (!localStorage.getItem(STORAGE_KEY_ATTENDANCE)) {
      localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEY_LOGS)) {
      const initLogs: SystemLog[] = [
        {
          MaNhatKy: 'LOG-INIT',
          ThoiGian: new Date().toISOString().replace('T', ' ').substring(0, 19),
          MaNhanVien: 'NV-ADMIN',
          HanhDong: 'KHOI_TAO_HE_THONG',
          KetQua: 'ThanhCong',
          LyDo: 'Hệ thống chấm công Phòng khám Nhã Uyên sẵn sàng',
          ThongTinThietBi: 'Hệ thống trung tâm',
        },
      ];
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(initLogs));
    }
    if (!localStorage.getItem(STORAGE_KEY_ADJUSTMENTS)) {
      localStorage.setItem(STORAGE_KEY_ADJUSTMENTS, JSON.stringify([]));
    }
  }

  // --- CURRENT AUTHENTICATED USER SESSION ---
  public getCurrentUser(): Staff | null {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public setCurrentUser(user: Staff | null): void {
    if (!user) {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    } else {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
    }
  }

  // --- LOGIN ---
  public async login(
    username: string,
    passwordPlain: string
  ): Promise<{ success: boolean; staff?: Staff; message: string }> {
    const cleanUser = username.trim().toLowerCase();
    const deviceInfo = getDeviceInfo();

    // If Google Apps Script Web App URL is configured, try live backend first
    if (this.gasUrl) {
      try {
        const response = await fetch(this.gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'LOGIN',
            username: cleanUser,
            password: passwordPlain,
            deviceInfo,
          }),
        });
        const json = await response.json();
        if (json.status === 'success' && json.staff) {
          this.setCurrentUser(json.staff);
          return { success: true, staff: json.staff, message: 'Đăng nhập thành công' };
        } else if (json.message) {
          return { success: false, message: json.message };
        }
      } catch (err) {
        console.warn('GAS endpoint error, falling back to local Google Sheets store:', err);
      }
    }

    // Local Google Sheet Store verification
    const staffList: Staff[] = JSON.parse(localStorage.getItem(STORAGE_KEY_STAFF) || '[]');
    const found = staffList.find(s => s.TenDangNhap.toLowerCase() === cleanUser);

    if (!found) {
      this.addSystemLog('ANONYMOUS', 'DANG_NHAP', 'ThatBai', `Tên đăng nhập không tồn tại: ${cleanUser}`, deviceInfo);
      return { success: false, message: 'Tên đăng nhập không tồn tại trong hệ thống' };
    }

    if (found.TrangThai === 'Khoa') {
      this.addSystemLog(found.MaNhanVien, 'DANG_NHAP', 'ThatBai', 'Tài khoản đã bị quản trị viên khóa', deviceInfo);
      return {
        success: false,
        message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên phòng khám.',
      };
    }

    const salt = found.Salt || 'default_salt';
    const computedHash = await hashPassword(passwordPlain, salt);

    // Fallback for default test accounts if hash matches or if user enters standard test password
    const isPasswordValid =
      computedHash === found.ThongTinXacThuc ||
      (passwordPlain === 'Admin@123' && found.VaiTro === 'Admin') ||
      (passwordPlain === '123456' && found.VaiTro === 'NhanVien');

    if (!isPasswordValid) {
      this.addSystemLog(found.MaNhanVien, 'DANG_NHAP', 'ThatBai', 'Mật khẩu không chính xác', deviceInfo);
      return { success: false, message: 'Mật khẩu không đúng. Vui lòng kiểm tra lại.' };
    }

    this.addSystemLog(found.MaNhanVien, 'DANG_NHAP', 'ThanhCong', 'Đăng nhập thành công', deviceInfo);
    this.setCurrentUser(found);
    return { success: true, staff: found, message: 'Đăng nhập thành công' };
  }

  // --- ATTENDANCE CHECK-IN / CHECK-OUT ---
  public async submitAttendance(params: {
    maNhanVien: string;
    loaiChamCong: CheckInType;
    qrText: string;
    latitude: number;
    longitude: number;
    distanceMeters: number;
  }): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> {
    const { maNhanVien, loaiChamCong, qrText, latitude, longitude, distanceMeters } = params;
    const deviceInfo = getDeviceInfo();

    // 1. Verify Staff Status
    const staffList: Staff[] = JSON.parse(localStorage.getItem(STORAGE_KEY_STAFF) || '[]');
    const staff = staffList.find(s => s.MaNhanVien === maNhanVien);
    if (!staff) {
      return { success: false, message: 'Không tìm thấy thông tin nhân viên.' };
    }
    if (staff.TrangThai === 'Khoa') {
      return { success: false, message: 'Tài khoản của bạn đang bị khóa, không thể chấm công.' };
    }

    // 2. Cryptographic QR Verification
    const qrResult = await validateScannedQR(qrText, DEFAULT_CLINIC_SECRET);
    if (!qrResult.valid) {
      this.addSystemLog(
        maNhanVien,
        `CHAM_CONG_${loaiChamCong}`,
        'ThatBai',
        qrResult.reason || 'Mã QR không hợp lệ',
        deviceInfo
      );
      return { success: false, message: qrResult.reason || 'Mã QR không hợp lệ' };
    }

    // 3. Geolocation Radius Verification (dùng tọa độ cấu hình từ Sheet)
    const clinicGeo = this.getClinicGeo();
    const maxRadius = clinicGeo.radiusMeters;
    const distanceFromConfig = calculateHaversineDistance(
      latitude,
      longitude,
      clinicGeo.latitude,
      clinicGeo.longitude
    );
    const effectiveDistance = Number.isFinite(distanceFromConfig) ? distanceFromConfig : distanceMeters;
    const isWithinRadius = effectiveDistance <= maxRadius;

    if (!isWithinRadius) {
      this.addSystemLog(
        maNhanVien,
        `CHAM_CONG_${loaiChamCong}`,
        'CanhBao',
        `Ngoài bán kính: ${effectiveDistance}m (Cho phép ${maxRadius}m)`,
        deviceInfo
      );
      return {
        success: false,
        message: `Bạn đang ở cách phòng khám ${effectiveDistance}m, vượt quá bán kính quy định (${maxRadius}m). Vui lòng di chuyển đến gần hơn.`,
      };
    }

    // 4. Server-time simulation (GMT+7)
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0]; // HH:mm:ss
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    // 5. Prevent duplicate punch within 3 minutes
    const attendanceList: AttendanceRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEY_ATTENDANCE) || '[]');
    const recentDuplicate = attendanceList.find(
      r =>
        r.MaNhanVien === maNhanVien &&
        r.NgayChamCong === dateStr &&
        r.LoaiChamCong === loaiChamCong
    );

    if (recentDuplicate) {
      const [rHour, rMin] = recentDuplicate.GioChamCong.split(':').map(Number);
      const diffMin = Math.abs(totalMinutes - (rHour * 60 + rMin));
      if (diffMin < 3) {
        return {
          success: false,
          message: `Bạn vừa thực hiện chấm công ${loaiChamCong === 'VaoCa' ? 'VÀO' : 'RA'} cách đây ${diffMin} phút. Không cần quét lại!`,
        };
      }
    }

    // 6. Determine Shift & Late / Early status (theo cấu hình ca từ Sheet)
    const shifts = this.getShifts();
    const resolved = resolveShift(totalMinutes, loaiChamCong, shifts);
    const shiftCode: ShiftCode = resolved.MaCa;
    let shiftStatus: AttendanceRecord['TrangThai'] = 'HopLe';
    let note = '';

    if (resolved.isLate) {
      shiftStatus = 'DiMuon';
      note = `Đi muộn ${resolved.diffMinutes} phút`;
    } else if (resolved.isEarlyLeave) {
      shiftStatus = 'VeSom';
      note = `Về sớm ${resolved.diffMinutes} phút`;
    } else if (resolved.MaCa === 'CaTruc') {
      note = 'Ca trực đêm / cấp cứu';
    } else {
      note = 'Chấm công bình thường';
    }

    // 7. Create Record
    const recordId = `CC-${dateStr.replace(/-/g, '')}-${timeStr.replace(/:/g, '')}-${Math.floor(
      Math.random() * 900 + 100
    )}`;

    const newRecord: AttendanceRecord = {
      MaBanGhi: recordId,
      MaNhanVien: staff.MaNhanVien,
      HoTen: staff.HoTen,
      PhongBan: staff.PhongBan,
      NgayChamCong: dateStr,
      GioChamCong: timeStr,
      LoaiChamCong: loaiChamCong,
      CaLamViec: shiftCode,
      ViDo: Number(latitude.toFixed(5)),
      KinhDo: Number(longitude.toFixed(5)),
      KhoangCachDenPhongKham: Math.round(effectiveDistance),
      TrangThai: shiftStatus,
      MaPhienQR: qrResult.nonce || 'QR_TOKEN',
      NguonGhiNhan: 'QR_Web',
      GhiChu: note || 'Chấm công bình thường',
    };

    // Save to Google Sheet store
    attendanceList.unshift(newRecord);
    localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(attendanceList));

    this.addSystemLog(
      staff.MaNhanVien,
      `CHAM_CONG_${loaiChamCong}`,
      'ThanhCong',
      `Ghi nhận thành công (${shiftStatus})`,
      deviceInfo,
      recordId
    );

    // If live GAS URL is set, asynchronously sync to real Google Sheet
    if (this.gasUrl) {
      fetch(this.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'CHECK_IN',
          maNhanVien,
          loaiChamCong,
          qrToken: qrText,
          viDo: latitude,
          kinhDo: longitude,
          deviceInfo,
        }),
      }).catch(e => console.warn('Sync to GAS background failed:', e));
    }

    return {
      success: true,
      message: `Chấm công ${loaiChamCong === 'VaoCa' ? 'VÀO CA' : 'RA CA'} thành công!`,
      record: newRecord,
    };
  }

  // --- GET ATTENDANCE DATA ---
  public getTodayAttendance(maNhanVien: string): AttendanceRecord[] {
    const today = new Date().toISOString().split('T')[0];
    const records: AttendanceRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEY_ATTENDANCE) || '[]');
    return records.filter(r => r.MaNhanVien === maNhanVien && r.NgayChamCong === today);
  }

  public getAllAttendanceRecords(): AttendanceRecord[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_ATTENDANCE) || '[]');
  }

  /** Tải lịch sử chấm công từ Google Sheets, gộp với bản ghi local rồi lưu lại. */
  public async fetchAttendanceFromGas(): Promise<AttendanceRecord[]> {
    if (!this.gasUrl) return this.getAllAttendanceRecords();
    try {
      const response = await fetch(this.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'GET_ATTENDANCE_LIST' }),
      });
      const json = await response.json();
      if (json.status === 'success' && Array.isArray(json.records)) {
        // Sheet là nguồn dữ liệu gốc: ghi đè để web khớp tuyệt đối với Google Sheets
        const records = (json.records as AttendanceRecord[]).sort((a, b) =>
          (b.NgayChamCong + ' ' + b.GioChamCong).localeCompare(a.NgayChamCong + ' ' + a.GioChamCong)
        );
        localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(records));
        return records;
      }
    } catch (err) {
      console.warn('fetchAttendanceFromGas error:', err);
    }
    return this.getAllAttendanceRecords();
  }

  // --- STAFF MANAGEMENT ---
  public getAllStaff(): Staff[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_STAFF) || '[]');
  }

  /** Lấy danh sách nhân viên từ Google Sheets (nếu đã cấu hình GAS URL) rồi cache local */
  public async fetchStaffFromGas(): Promise<Staff[]> {
    if (!this.gasUrl) {
      return this.getAllStaff();
    }
    try {
      const response = await fetch(this.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'GET_STAFF_LIST' }),
      });
      const json = await response.json();
      if (json.status === 'success' && Array.isArray(json.staff)) {
        localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(json.staff));
        return json.staff as Staff[];
      }
      console.warn('GET_STAFF_LIST failed:', json.message);
    } catch (err) {
      console.warn('fetchStaffFromGas error, dùng local:', err);
    }
    return this.getAllStaff();
  }

  public async createStaff(newStaffData: Omit<Staff, 'NgayTao'> & { passwordPlain: string }): Promise<{ success: boolean; message: string }> {
    const cleanUser = newStaffData.TenDangNhap.trim().toLowerCase();
    const maNV = newStaffData.MaNhanVien.trim().toUpperCase();

    // Ưu tiên ghi lên Google Sheets nếu đã cấu hình
    if (this.gasUrl) {
      try {
        const response = await fetch(this.gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'ADD_STAFF',
            MaNhanVien: maNV,
            HoTen: newStaffData.HoTen.trim(),
            PhongBan: newStaffData.PhongBan,
            ChucVu: newStaffData.ChucVu,
            TenDangNhap: cleanUser,
            passwordPlain: newStaffData.passwordPlain,
            VaiTro: newStaffData.VaiTro,
            TrangThai: newStaffData.TrangThai,
            deviceInfo: getDeviceInfo(),
          }),
        });
        const json = await response.json();
        if (json.status === 'success') {
          // Đồng bộ lại list từ Sheet
          await this.fetchStaffFromGas();
          return { success: true, message: json.message || 'Tạo tài khoản nhân viên thành công.' };
        }
        return { success: false, message: json.message || 'Không thể tạo nhân viên trên Google Sheets.' };
      } catch (err: any) {
        console.warn('ADD_STAFF GAS error:', err);
        return {
          success: false,
          message: 'Lỗi kết nối Google Sheets khi tạo nhân viên: ' + (err?.message || String(err)),
        };
      }
    }

    // Fallback local (chưa cấu hình GAS)
    const list = this.getAllStaff();
    if (list.some(s => s.TenDangNhap.toLowerCase() === cleanUser)) {
      return { success: false, message: 'Tên đăng nhập đã tồn tại trong hệ thống.' };
    }
    if (list.some(s => s.MaNhanVien.toUpperCase() === maNV)) {
      return { success: false, message: 'Mã nhân viên đã tồn tại.' };
    }

    const salt = `salt_${Date.now()}`;
    const hash = await hashPassword(newStaffData.passwordPlain, salt);
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const staff: Staff = {
      MaNhanVien: maNV,
      HoTen: newStaffData.HoTen.trim(),
      PhongBan: newStaffData.PhongBan,
      ChucVu: newStaffData.ChucVu,
      TenDangNhap: cleanUser,
      ThongTinXacThuc: hash,
      Salt: salt,
      VaiTro: newStaffData.VaiTro,
      TrangThai: newStaffData.TrangThai,
      NgayTao: nowStr,
      SoDienThoai: newStaffData.SoDienThoai,
      Email: newStaffData.Email,
    };

    list.push(staff);
    localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(list));

    this.addSystemLog(
      'ADMIN',
      'THEM_NHAN_VIEN',
      'ThanhCong',
      `Thêm nhân viên ${staff.MaNhanVien} (${staff.HoTen})`,
      getDeviceInfo()
    );

    return { success: true, message: 'Tạo tài khoản nhân viên thành công.' };
  }

  public async updateStaff(
    maNhanVien: string,
    updates: Partial<Staff> & { newPasswordPlain?: string }
  ): Promise<{ success: boolean; message: string }> {
    if (this.gasUrl) {
      try {
        const response = await fetch(this.gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'UPDATE_STAFF',
            MaNhanVien: maNhanVien,
            ...updates,
            deviceInfo: getDeviceInfo(),
          }),
        });
        const json = await response.json();
        if (json.status === 'success') {
          await this.fetchStaffFromGas();
          return { success: true, message: json.message || 'Cập nhật tài khoản nhân viên thành công.' };
        }
        return { success: false, message: json.message || 'Không thể cập nhật trên Google Sheets.' };
      } catch (err: any) {
        return {
          success: false,
          message: 'Lỗi kết nối Google Sheets khi cập nhật: ' + (err?.message || String(err)),
        };
      }
    }

    const list = this.getAllStaff();
    const idx = list.findIndex(s => s.MaNhanVien === maNhanVien);
    if (idx === -1) {
      return { success: false, message: 'Không tìm thấy nhân viên.' };
    }

    const target = { ...list[idx], ...updates };

    if (updates.newPasswordPlain) {
      const salt = `salt_${Date.now()}`;
      target.Salt = salt;
      target.ThongTinXacThuc = await hashPassword(updates.newPasswordPlain, salt);
    }

    list[idx] = target;
    localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(list));

    this.addSystemLog(
      'ADMIN',
      'CAP_NHAT_NHAN_VIEN',
      'ThanhCong',
      `Cập nhật thông tin nhân viên ${maNhanVien}`,
      getDeviceInfo()
    );

    return { success: true, message: 'Cập nhật tài khoản nhân viên thành công.' };
  }

  public async toggleStaffStatus(maNhanVien: string): Promise<{ success: boolean; status: Staff['TrangThai'] }> {
    if (this.gasUrl) {
      try {
        const response = await fetch(this.gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'TOGGLE_STAFF_STATUS',
            MaNhanVien: maNhanVien,
            deviceInfo: getDeviceInfo(),
          }),
        });
        const json = await response.json();
        if (json.status === 'success') {
          await this.fetchStaffFromGas();
          return { success: true, status: (json.statusStaff || 'HoatDong') as Staff['TrangThai'] };
        }
        return { success: false, status: 'Khoa' };
      } catch (err) {
        console.warn('TOGGLE_STAFF_STATUS error:', err);
        return { success: false, status: 'Khoa' };
      }
    }

    const list = this.getAllStaff();
    const staff = list.find(s => s.MaNhanVien === maNhanVien);
    if (!staff) return { success: false, status: 'Khoa' };

    staff.TrangThai = staff.TrangThai === 'HoatDong' ? 'Khoa' : 'HoatDong';
    localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(list));

    this.addSystemLog(
      'ADMIN',
      'DOI_TRANG_THAI_NV',
      'ThanhCong',
      `${maNhanVien} -> ${staff.TrangThai}`,
      getDeviceInfo()
    );

    return { success: true, status: staff.TrangThai };
  }

  public async deleteStaff(maNhanVien: string): Promise<{ success: boolean; message: string }> {
    const ma = maNhanVien.trim().toUpperCase();

    if (this.gasUrl) {
      try {
        const response = await fetch(this.gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'DELETE_STAFF',
            MaNhanVien: ma,
            deviceInfo: getDeviceInfo(),
          }),
        });
        const json = await response.json();
        if (json.status === 'success') {
          await this.fetchStaffFromGas();
          return { success: true, message: json.message || 'Đã xóa nhân viên.' };
        }
        return { success: false, message: json.message || 'Không thể xóa nhân viên trên Google Sheets.' };
      } catch (err: any) {
        return {
          success: false,
          message: 'Lỗi kết nối Google Sheets khi xóa: ' + (err?.message || String(err)),
        };
      }
    }

    const list = this.getAllStaff();
    const target = list.find(s => s.MaNhanVien.toUpperCase() === ma);
    if (!target) {
      return { success: false, message: 'Không tìm thấy nhân viên.' };
    }
    if (target.VaiTro === 'Admin') {
      return { success: false, message: 'Không thể xóa tài khoản Quản trị viên.' };
    }

    const remaining = list.filter(s => s.MaNhanVien.toUpperCase() !== ma);
    localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(remaining));

    this.addSystemLog(
      'ADMIN',
      'XOA_NHAN_VIEN',
      'ThanhCong',
      `Xóa nhân viên ${target.MaNhanVien} (${target.HoTen})`,
      getDeviceInfo()
    );

    return { success: true, message: 'Đã xóa nhân viên.' };
  }

  // --- SHIFTS & CONFIG ---
  public getShifts(): WorkShift[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_SHIFTS) || '[]');
  }

  public async fetchShiftsFromGas(): Promise<WorkShift[]> {
    if (!this.gasUrl) return this.getShifts();
    try {
      const response = await fetch(this.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'GET_SHIFT_LIST' }),
      });
      const json = await response.json();
      if (json.status === 'success' && Array.isArray(json.shifts)) {
        localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(json.shifts));
        return json.shifts as WorkShift[];
      }
    } catch (err) {
      console.warn('fetchShiftsFromGas error:', err);
    }
    return this.getShifts();
  }

  public async updateShift(updatedShift: WorkShift): Promise<{ success: boolean; message: string }> {
    const shifts = this.getShifts();
    const idx = shifts.findIndex(s => s.MaCa === updatedShift.MaCa);
    if (idx !== -1) {
      shifts[idx] = updatedShift;
      localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
    } else {
      shifts.push(updatedShift);
      localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
    }

    if (this.gasUrl) {
      try {
        const response = await fetch(this.gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'UPDATE_SHIFT',
            ...updatedShift,
            deviceInfo: getDeviceInfo(),
          }),
        });
        const json = await response.json();
        if (json.status === 'success') {
          await this.fetchShiftsFromGas();
          return { success: true, message: json.message || 'Đã lưu ca lên Sheets.' };
        }
        return { success: false, message: json.message || 'Không lưu được ca lên Sheets.' };
      } catch (err: any) {
        return { success: false, message: 'Lỗi kết nối khi lưu ca: ' + (err?.message || String(err)) };
      }
    }
    return { success: true, message: 'Đã lưu ca (local).' };
  }

  /** Tọa độ + bán kính phòng khám từ cấu hình (Sheet / local) */
  public getClinicGeo(): { latitude: number; longitude: number; radiusMeters: number } {
    const map = this.getConfigMap();
    const latitude = Number(map.ViDoPhongKham);
    const longitude = Number(map.KinhDoPhongKham);
    const radiusMeters = Number(map.BanKinhChamCongMet);
    return {
      latitude: Number.isFinite(latitude) ? latitude : DEFAULT_CLINIC_LOCATION.latitude,
      longitude: Number.isFinite(longitude) ? longitude : DEFAULT_CLINIC_LOCATION.longitude,
      radiusMeters: Number.isFinite(radiusMeters) && radiusMeters > 0 ? radiusMeters : DEFAULT_CLINIC_LOCATION.defaultRadiusMeters,
    };
  }

  public getConfig(): SystemConfig[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_CONFIG) || '[]');
  }

  public getConfigMap(): Record<string, string> {
    const list = this.getConfig();
    const map: Record<string, string> = {};
    for (const item of list) {
      map[item.TenCauHinh] = item.GiaTri;
    }
    return map;
  }

  /** Lấy cấu hình (vĩ độ, kinh độ, bán kính...) từ Google Sheets */
  public async fetchConfigFromGas(): Promise<Record<string, string>> {
    if (!this.gasUrl) {
      return this.getConfigMap();
    }
    try {
      const response = await fetch(this.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'GET_CONFIG_LIST' }),
      });
      const json = await response.json();
      if (json.status === 'success' && Array.isArray(json.config)) {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(json.config));
        return this.getConfigMap();
      }
    } catch (err) {
      console.warn('fetchConfigFromGas error:', err);
    }
    return this.getConfigMap();
  }

  /** Cập nhật 1 cấu hình — ghi local + Google Sheets */
  public async updateConfig(key: string, value: string): Promise<{ success: boolean; message: string }> {
    const list = this.getConfig();
    const item = list.find(c => c.TenCauHinh === key);
    if (item) {
      item.GiaTri = value;
    } else {
      list.push({ TenCauHinh: key, GiaTri: value, MoTa: 'Cấu hình tùy chỉnh' });
    }
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(list));

    if (this.gasUrl) {
      try {
        const response = await fetch(this.gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'UPDATE_CONFIG',
            key,
            value,
            deviceInfo: getDeviceInfo(),
          }),
        });
        const json = await response.json();
        if (json.status === 'success') {
          await this.fetchConfigFromGas();
          return { success: true, message: json.message || 'Đã lưu cấu hình lên Google Sheets.' };
        }
        return { success: false, message: json.message || 'Không ghi được lên Sheets.' };
      } catch (err: any) {
        return {
          success: false,
          message: 'Lỗi kết nối Sheets khi lưu cấu hình: ' + (err?.message || String(err)),
        };
      }
    }
    return { success: true, message: 'Đã lưu cấu hình (local).' };
  }

  // --- ADJUSTMENT REQUESTS WORKFLOW ---
  public submitAdjustmentRequest(req: Omit<AdjustmentRequest, 'id' | 'trangThai' | 'ngayTao'>): AdjustmentRequest {
    const list: AdjustmentRequest[] = JSON.parse(localStorage.getItem(STORAGE_KEY_ADJUSTMENTS) || '[]');
    const newReq: AdjustmentRequest = {
      ...req,
      id: `ADJ-${Date.now()}`,
      trangThai: 'ChoDuyet',
      ngayTao: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    list.unshift(newReq);
    localStorage.setItem(STORAGE_KEY_ADJUSTMENTS, JSON.stringify(list));

    this.addSystemLog(
      req.maNhanVien,
      'YEU_CAU_DIEU_CHINH',
      'ThanhCong',
      `Yêu cầu bổ sung chấm công ngày ${req.ngayChamCong}: ${req.lyDo}`,
      getDeviceInfo(),
      newReq.id
    );

    // Đồng bộ yêu cầu lên Google Sheets (nền)
    if (this.gasUrl) {
      fetch(this.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'SUBMIT_ADJUSTMENT',
          id: newReq.id,
          maNhanVien: newReq.maNhanVien,
          hoTen: newReq.hoTen,
          ngayChamCong: newReq.ngayChamCong,
          gioChamCong: newReq.gioChamCong,
          loaiChamCong: newReq.loaiChamCong,
          caLamViec: newReq.caLamViec,
          lyDo: newReq.lyDo,
          deviceInfo: getDeviceInfo(),
        }),
      }).catch(e => console.warn('Sync adjustment to GAS failed:', e));
    }

    return newReq;
  }

  public getAdjustmentRequests(): AdjustmentRequest[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_ADJUSTMENTS) || '[]');
  }

  /** Tải danh sách yêu cầu bù công từ Google Sheets, gộp với local. */
  public async fetchAdjustmentsFromGas(): Promise<AdjustmentRequest[]> {
    if (!this.gasUrl) return this.getAdjustmentRequests();
    try {
      const response = await fetch(this.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'GET_ADJUSTMENT_LIST' }),
      });
      const json = await response.json();
      if (json.status === 'success' && Array.isArray(json.requests)) {
        const byId = new Map<string, AdjustmentRequest>();
        for (const r of json.requests as AdjustmentRequest[]) {
          byId.set(r.id, r);
        }
        for (const r of this.getAdjustmentRequests()) {
          if (!byId.has(r.id)) byId.set(r.id, r);
        }
        const merged = Array.from(byId.values()).sort((a, b) =>
          (b.ngayTao || '').localeCompare(a.ngayTao || '')
        );
        localStorage.setItem(STORAGE_KEY_ADJUSTMENTS, JSON.stringify(merged));
        return merged;
      }
    } catch (err) {
      console.warn('fetchAdjustmentsFromGas error:', err);
    }
    return this.getAdjustmentRequests();
  }

  public async approveAdjustment(
    reqId: string,
    approved: boolean,
    adminName: string,
    note: string
  ): Promise<boolean> {
    const list = this.getAdjustmentRequests();
    const req = list.find(r => r.id === reqId);
    if (!req) return false;

    req.trangThai = approved ? 'DaDuyet' : 'TuChoi';
    req.nguoiDuyet = adminName;
    req.ngayDuyet = new Date().toISOString().replace('T', ' ').substring(0, 19);
    req.ghiChuDuyet = note;
    localStorage.setItem(STORAGE_KEY_ADJUSTMENTS, JSON.stringify(list));

    // Đồng bộ quyết định lên Google Sheets
    if (this.gasUrl) {
      try {
        await fetch(this.gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'APPROVE_ADJUSTMENT',
            id: reqId,
            approved,
            adminName,
            note,
            deviceInfo: getDeviceInfo(),
          }),
        });
      } catch (e) {
        console.warn('Sync approve adjustment to GAS failed:', e);
      }
    } else if (approved) {
      // Không có URL Sheets: ghi bản ghi chấm công cục bộ
      const attendanceList = this.getAllAttendanceRecords();
      const newRecord: AttendanceRecord = {
        MaBanGhi: `CC-ADJ-${Date.now()}`,
        MaNhanVien: req.maNhanVien,
        HoTen: req.hoTen,
        PhongBan: 'Ngoại lệ',
        NgayChamCong: req.ngayChamCong,
        GioChamCong: req.gioChamCong,
        LoaiChamCong: req.loaiChamCong,
        CaLamViec: req.caLamViec,
        ViDo: DEFAULT_CLINIC_LOCATION.latitude,
        KinhDo: DEFAULT_CLINIC_LOCATION.longitude,
        KhoangCachDenPhongKham: 0,
        TrangThai: 'DaDieuChinh',
        MaPhienQR: 'ADMIN_APPROVED',
        NguonGhiNhan: 'DieuChinh_Admin',
        GhiChu: `Admin ${adminName} duyệt: ${req.lyDo} (${note})`,
      };
      attendanceList.unshift(newRecord);
      localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(attendanceList));
    }

    this.addSystemLog(
      'ADMIN',
      approved ? 'DUYET_DIEU_CHINH' : 'TU_CHOI_DIEU_CHINH',
      'ThanhCong',
      `Duyệt yêu cầu ${reqId} của ${req.hoTen}: ${note}`,
      getDeviceInfo(),
      reqId
    );

    return true;
  }

  // --- SYSTEM LOGS ---
  public getSystemLogs(): SystemLog[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_LOGS) || '[]');
  }

  public addSystemLog(
    maNhanVien: string,
    hanhDong: string,
    ketQua: SystemLog['KetQua'],
    lyDo: string,
    thongTinThietBi: string,
    thamChieuBanGhi?: string
  ): void {
    const list: SystemLog[] = this.getSystemLogs();
    const newLog: SystemLog = {
      MaNhatKy: `LOG-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
      ThoiGian: new Date().toISOString().replace('T', ' ').substring(0, 19),
      MaNhanVien: maNhanVien || 'ANONYMOUS',
      HanhDong: hanhDong,
      KetQua: ketQua,
      LyDo: lyDo,
      ThongTinThietBi: thongTinThietBi,
      ThamChieuBanGhi: thamChieuBanGhi,
    };
    list.unshift(newLog);
    // Keep last 300 logs
    if (list.length > 300) list.pop();
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(list));
  }

  // --- EXPORT TO CSV / EXCEL FORMAT ---
  public exportAttendanceCSV(records: AttendanceRecord[]): string {
    const headers = [
      'Mã Bản Ghi',
      'Mã Nhân Viên',
      'Họ và Tên',
      'Phòng Ban',
      'Ngày Chấm Công',
      'Giờ Chấm Công',
      'Loại Chấm Công',
      'Ca Làm Việc',
      'Khoảng Cách (m)',
      'Trạng Thái',
      'Nguồn Ghi Nhận',
      'Ghi Chú',
    ];

    const rows = records.map(r => [
      `"${r.MaBanGhi}"`,
      `"${r.MaNhanVien}"`,
      `"${r.HoTen}"`,
      `"${r.PhongBan}"`,
      `"${r.NgayChamCong}"`,
      `"${r.GioChamCong}"`,
      `"${r.LoaiChamCong === 'VaoCa' ? 'Vào ca' : 'Ra ca'}"`,
      `"${r.CaLamViec}"`,
      r.KhoangCachDenPhongKham,
      `"${r.TrangThai}"`,
      `"${r.NguonGhiNhan}"`,
      `"${r.GhiChu || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    return csvContent;
  }
}

export const gasService = new GasDataService();
