export type StaffRole = 'Bác sĩ' | 'Điều dưỡng' | 'Kỹ thuật viên' | 'Lễ tân' | 'Kế toán' | 'Quản trị viên';
export type UserRole = 'Admin' | 'NhanVien';
export type AccountStatus = 'HoatDong' | 'Khoa';
export type CheckInType = 'VaoCa' | 'RaCa';
export type AttendanceStatus = 'HopLe' | 'DiMuon' | 'VeSom' | 'NgoaiBanKinh' | 'TuChoi' | 'ChoDuyet' | 'DaDieuChinh';
export type ShiftCode = 'CaSang' | 'CaChieu' | 'CaTruc' | 'NgoaiGio';

export interface Staff {
  MaNhanVien: string;
  HoTen: string;
  PhongBan: string;
  ChucVu: StaffRole;
  TenDangNhap: string;
  ThongTinXacThuc: string; // Salted SHA-256 hash
  Salt?: string;
  VaiTro: UserRole;
  TrangThai: AccountStatus;
  NgayTao: string;
  SoDienThoai?: string;
  Email?: string;
}

export interface AttendanceRecord {
  MaBanGhi: string;
  MaNhanVien: string;
  HoTen: string;
  PhongBan: string;
  NgayChamCong: string; // YYYY-MM-DD
  GioChamCong: string; // HH:mm:ss
  LoaiChamCong: CheckInType;
  CaLamViec: ShiftCode;
  ViDo: number;
  KinhDo: number;
  KhoangCachDenPhongKham: number; // in meters
  TrangThai: AttendanceStatus;
  MaPhienQR: string;
  NguonGhiNhan: 'QR_Web' | 'DieuChinh_Admin' | 'YeuCauNgoaiLe';
  GhiChu: string;
}

export interface WorkShift {
  MaCa: ShiftCode;
  TenCa: string;
  GioBatDau: string; // HH:mm
  GioKetThuc: string; // HH:mm
  ThoiGianChoPhepTre: number; // Minutes
  ThoiGianChoPhepSom: number; // Minutes
  TrangThai: 'HoatDong' | 'TamDung';
}

export interface SystemConfig {
  TenCauHinh: string;
  GiaTri: string;
  MoTa: string;
}

export interface SystemLog {
  MaNhatKy: string;
  ThoiGian: string; // ISO / GMT+7 formatted
  MaNhanVien: string;
  HanhDong: string;
  KetQua: 'ThanhCong' | 'ThatBai' | 'CanhBao';
  LyDo: string;
  ThongTinThietBi: string;
  ThamChieuBanGhi?: string;
}

export interface QRTokenPayload {
  token: string;
  clinicId: string;
  timestamp: number;
  nonce: string;
  checkType: CheckInType | 'Any';
  signature: string;
}

export interface AdjustmentRequest {
  id: string;
  maNhanVien: string;
  hoTen: string;
  ngayChamCong: string;
  gioChamCong: string;
  loaiChamCong: CheckInType;
  caLamViec: ShiftCode;
  lyDo: string;
  trangThai: 'ChoDuyet' | 'DaDuyet' | 'TuChoi';
  ngayTao: string;
  nguoiDuyet?: string;
  ngayDuyet?: string;
  ghiChuDuyet?: string;
}
