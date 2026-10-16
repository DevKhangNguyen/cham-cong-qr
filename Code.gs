/**
 * =========================================================================
 * PHÒNG KHÁM ĐA KHOA Y DƯỢC NHÃ UYÊN CÀ MAU
 * BACKEND CHẤM CÔNG NHÂN VIÊN BẰNG QR CODE ĐỘNG & GOOGLE SHEETS
 * Địa chỉ: Ấp 5, xã Thới Bình, tỉnh Cà Mau
 * Múi giờ: Asia/Ho_Chi_Minh (GMT+7)
 *
 * File này khớp 100% với web qr-project (src/services/gasService.ts):
 *  - Action nhận: LOGIN, CHECK_IN, GET_STAFF_LIST, ADD_STAFF, UPDATE_STAFF,
 *    TOGGLE_STAFF_STATUS, GET_SHIFT_LIST, UPDATE_SHIFT,
 *    GET_CONFIG_LIST, UPDATE_CONFIG  (+ PING qua doGet)
 *  - Cấu trúc JSON trả về đúng như web mong đợi (staff / shifts / config ...)
 * =========================================================================
 */

// Tên các bảng tính (Sheets)
var SHEET_NHAN_VIEN   = 'NhanVien';
var SHEET_CHAM_CONG   = 'ChamCong';
var SHEET_CA_LAM_VIEC = 'CaLamViec';
var SHEET_CAU_HINH    = 'CauHinh';
var SHEET_NHAT_KY     = 'NhatKyHeThong';

var TIMEZONE = 'Asia/Ho_Chi_Minh';
var CLINIC_ID = 'PKDK_NHA_UYEN_CAMAU';
var DEFAULT_SECRET = 'NHA_UYEN_CLINIC_SECURE_TOKEN_SECRET_2026';

/* =========================================================================
 * 1. KHỞI TẠO BẢNG TÍNH (chạy 1 lần: chọn hàm setupSpreadsheet -> Run)
 * ========================================================================= */
function setupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // --- Sheet NhanVien ---
  var sNhanVien = getOrCreateSheet(ss, SHEET_NHAN_VIEN);
  sNhanVien.clear();
  sNhanVien.appendRow([
    'MaNhanVien', 'HoTen', 'PhongBan', 'ChucVu', 'TenDangNhap',
    'ThongTinXacThuc', 'Salt', 'VaiTro', 'TrangThai', 'NgayTao'
  ]);
  styleHeaderRow(sNhanVien, '#0B4B82');

  var adminSalt = 'nha_uyen_salt_admin';
  sNhanVien.appendRow([
    'NV-ADMIN', 'Quản Trị Viên Hệ Thống', 'Ban Giám Đốc', 'Quản trị viên',
    'admin', hashSha256(adminSalt + ':Admin@123:' + adminSalt), adminSalt,
    'Admin', 'HoatDong', getFormattedNow()
  ]);

  var bsSalt = 'salt_bs_an';
  sNhanVien.appendRow([
    'NV-001', 'BS.CKI Nguyễn Văn An', 'Khoa Khám Bệnh', 'Bác sĩ',
    'bs.an', hashSha256(bsSalt + ':123456:' + bsSalt), bsSalt,
    'NhanVien', 'HoatDong', getFormattedNow()
  ]);

  var ddSalt = 'salt_dd_hoa';
  sNhanVien.appendRow([
    'NV-002', 'ĐD. Trần Thị Hoa', 'Khoa Cấp Cứu', 'Điều dưỡng',
    'dd.hoa', hashSha256(ddSalt + ':123456:' + ddSalt), ddSalt,
    'NhanVien', 'HoatDong', getFormattedNow()
  ]);

  var ktvSalt = 'salt_ktv_tu';
  sNhanVien.appendRow([
    'NV-003', 'KTV. Lê Minh Tú', 'Khoa Xét Nghiệm & CĐHA', 'Kỹ thuật viên',
    'ktv.tu', hashSha256(ktvSalt + ':123456:' + ktvSalt), ktvSalt,
    'NhanVien', 'HoatDong', getFormattedNow()
  ]);

  var ltSalt = 'salt_lt_nga';
  sNhanVien.appendRow([
    'NV-004', 'CN. Phạm Thu Nga', 'Bộ Phận Lễ Tân & Thu Ngân', 'Lễ tân',
    'lt.nga', hashSha256(ltSalt + ':123456:' + ltSalt), ltSalt,
    'NhanVien', 'HoatDong', getFormattedNow()
  ]);

  // --- Sheet ChamCong ---
  var sChamCong = getOrCreateSheet(ss, SHEET_CHAM_CONG);
  sChamCong.clear();
  sChamCong.appendRow([
    'MaBanGhi', 'MaNhanVien', 'HoTen', 'PhongBan', 'NgayChamCong',
    'GioChamCong', 'LoaiChamCong', 'CaLamViec', 'ViDo', 'KinhDo',
    'KhoangCachDenPhongKham', 'TrangThai', 'MaPhienQR', 'NguonGhiNhan', 'GhiChu'
  ]);
  styleHeaderRow(sChamCong, '#0B4B82');

  // --- Sheet CaLamViec ---
  var sCaLamViec = getOrCreateSheet(ss, SHEET_CA_LAM_VIEC);
  sCaLamViec.clear();
  sCaLamViec.appendRow([
    'MaCa', 'TenCa', 'GioBatDau', 'GioKetThuc',
    'ThoiGianChoPhepTre', 'ThoiGianChoPhepSom', 'TrangThai'
  ]);
  styleHeaderRow(sCaLamViec, '#0B4B82');
  sCaLamViec.appendRow(['CaSang', 'Ca Sáng Phòng Khám', '07:00', '11:30', 15, 15, 'HoatDong']);
  sCaLamViec.appendRow(['CaChieu', 'Ca Chiều Phòng Khám', '13:00', '17:00', 15, 15, 'HoatDong']);
  sCaLamViec.appendRow(['CaTruc', 'Ca Trực Đêm / Cấp Cứu', '17:00', '07:00', 30, 30, 'HoatDong']);

  // --- Sheet CauHinh ---
  var sCauHinh = getOrCreateSheet(ss, SHEET_CAU_HINH);
  sCauHinh.clear();
  sCauHinh.appendRow(['TenCauHinh', 'GiaTri', 'MoTa']);
  styleHeaderRow(sCauHinh, '#0B4B82');
  sCauHinh.appendRow(['TenPhongKham', 'Phòng khám Đa khoa Y Dược Nhã Uyên Cà Mau', 'Tên đơn vị']);
  sCauHinh.appendRow(['DiaChi', 'Ấp 5, xã Thới Bình, tỉnh Cà Mau', 'Địa chỉ phòng khám']);
  sCauHinh.appendRow(['ViDoPhongKham', '9.3789', 'Tọa độ Vĩ độ GPS phòng khám']);
  sCauHinh.appendRow(['KinhDoPhongKham', '105.1186', 'Tọa độ Kinh độ GPS phòng khám']);
  sCauHinh.appendRow(['BanKinhChamCongMet', '150', 'Bán kính hợp lệ tối đa (mét)']);
  sCauHinh.appendRow(['ThoiHanQRGiay', '45', 'Thời gian hiệu lực mỗi mã QR động (giây)']);
  sCauHinh.appendRow(['ChoPhepChamCongNgoaiGio', 'Co', 'Ghi nhận ngoài giờ với cảnh báo']);

  // --- Sheet NhatKyHeThong ---
  var sNhatKy = getOrCreateSheet(ss, SHEET_NHAT_KY);
  sNhatKy.clear();
  sNhatKy.appendRow([
    'MaNhatKy', 'ThoiGian', 'MaNhanVien', 'HanhDong', 'KetQua',
    'LyDo', 'ThongTinThietBi', 'ThamChieuBanGhi'
  ]);
  styleHeaderRow(sNhatKy, '#0B4B82');

  // Lưu khóa bí mật QR vào Script Properties
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('CLINIC_SECRET')) {
    props.setProperty('CLINIC_SECRET', DEFAULT_SECRET);
  }

  ghiNhatKy('SYSTEM', 'KHOI_TAO_HE_THONG', 'ThanhCong',
    'Khởi tạo 5 sheets, tài khoản Admin và nhân viên mẫu', 'Google Apps Script');

  return 'Cấu hình bảng tính Phòng khám Đa khoa Y Dược Nhã Uyên thành công!';
}

/* =========================================================================
 * 2. GET (dùng cho kiểm tra kết nối PING và vài truy vấn tiện ích)
 * ========================================================================= */
function doGet(e) {
  var params = e ? e.parameter : {};
  var action = String(params.action || 'PING').toUpperCase();

  try {
    var result;
    switch (action) {
      case 'PING':
        result = {
          status: 'success',
          message: 'Google Apps Script Chấm Công Nhã Uyên Cà Mau hoạt động bình thường',
          serverTime: getFormattedNow(),
          timezone: TIMEZONE
        };
        break;
      case 'GET_CONFIG_LIST':
        result = getConfigList(params);
        break;
      case 'GET_SHIFT_LIST':
        result = getShiftList(params);
        break;
      case 'GET_STAFF_LIST':
        result = getStaffList(params);
        break;
      case 'GET_ATTENDANCE_LIST':
        result = getAttendanceList(params);
        break;
      default:
        result = { status: 'error', message: 'Hành động GET không được hỗ trợ: ' + action };
    }
    return createJsonResponse(result);
  } catch (err) {
    return createJsonResponse({ status: 'error', message: 'Lỗi máy chủ: ' + err.toString() });
  }
}

/* =========================================================================
 * 3. POST (toàn bộ nghiệp vụ) — khớp tên action web gửi
 * ========================================================================= */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (lockErr) {
    return createJsonResponse({
      status: 'error',
      message: 'Hệ thống đang bận xử lý nhiều yêu cầu đồng thời. Vui lòng thử lại sau vài giây.'
    });
  }

  try {
    var data = parseRequestBody(e);
    var action = String(data.action || '').toUpperCase();
    var result;

    switch (action) {
      case 'LOGIN':                result = handleStaffLogin(data); break;
      case 'CHECK_IN':             result = handleAttendanceCheck(data); break;
      case 'GET_STAFF_LIST':       result = getStaffList(data); break;
      case 'ADD_STAFF':            result = addStaff(data); break;
      case 'UPDATE_STAFF':         result = updateStaff(data); break;
      case 'TOGGLE_STAFF_STATUS':  result = toggleStaffStatus(data); break;
      case 'DELETE_STAFF':         result = deleteStaff(data); break;
      case 'GET_ATTENDANCE_LIST':  result = getAttendanceList(data); break;
      case 'GET_SHIFT_LIST':       result = getShiftList(data); break;
      case 'UPDATE_SHIFT':         result = updateShiftRow(data); break;
      case 'GET_CONFIG_LIST':      result = getConfigList(data); break;
      case 'UPDATE_CONFIG':        result = updateConfig(data); break;
      default:
        result = { status: 'error', message: 'Hành động POST không hỗ trợ: ' + action };
    }

    return createJsonResponse(result);
  } catch (err) {
    return createJsonResponse({ status: 'error', message: 'Lỗi máy chủ: ' + err.toString() });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/* =========================================================================
 * 4. ĐĂNG NHẬP
 * Web mong đợi: { status:'success', staff:{ MaNhanVien, HoTen, ... } }
 * ========================================================================= */
function handleStaffLogin(data) {
  var username = String(data.username || data.taiKhoan || '').trim().toLowerCase();
  var password = String(data.password || data.matKhau || '');
  var deviceInfo = data.deviceInfo || 'Trình duyệt Web';

  if (!username || !password) {
    return { status: 'error', message: 'Vui lòng nhập tên đăng nhập và mật khẩu' };
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NHAN_VIEN);
  if (!sheet) return { status: 'error', message: 'Không tìm thấy bảng nhân viên' };

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    var dbUser = String(rows[i][4] || '').trim().toLowerCase();
    if (dbUser !== username) continue;

    // Trạng thái tài khoản
    var trangThai = String(rows[i][8] || '').trim();
    if (trangThai && trangThai !== 'HoatDong') {
      ghiNhatKy(rows[i][0], 'DANG_NHAP', 'ThatBai', 'Tài khoản bị khóa', deviceInfo);
      return { status: 'error', message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên phòng khám.' };
    }

    // Kiểm tra mật khẩu: hash = sha256(salt + ':' + password + ':' + salt)
    var salt = String(rows[i][6] || '').trim();
    var storedHash = String(rows[i][5] || '').trim();
    var inputHash = hashSha256(salt + ':' + password + ':' + salt);

    if (inputHash !== storedHash) {
      ghiNhatKy(rows[i][0], 'DANG_NHAP', 'ThatBai', 'Mật khẩu không chính xác', deviceInfo);
      return { status: 'error', message: 'Mật khẩu không đúng. Vui lòng kiểm tra lại.' };
    }

    // Trả về đúng shape web dùng (PascalCase + trường "staff")
    var staff = {
      MaNhanVien: rows[i][0],
      HoTen: rows[i][1],
      PhongBan: rows[i][2],
      ChucVu: rows[i][3],
      TenDangNhap: rows[i][4],
      ThongTinXacThuc: storedHash,
      Salt: salt,
      VaiTro: rows[i][7],
      TrangThai: trangThai || 'HoatDong',
      NgayTao: rows[i][9] ? formatDateTimeValue(rows[i][9]) : getFormattedNow()
    };

    ghiNhatKy(staff.MaNhanVien, 'DANG_NHAP', 'ThanhCong', 'Đăng nhập thành công', deviceInfo);

    return {
      status: 'success',
      success: true,
      message: 'Đăng nhập thành công',
      staff: staff
    };
  }

  ghiNhatKy(username, 'DANG_NHAP', 'ThatBai', 'Tên đăng nhập không tồn tại', deviceInfo);
  return { status: 'error', message: 'Tên đăng nhập không tồn tại trong hệ thống' };
}

/* =========================================================================
 * 5. CHẤM CÔNG (VÀO CA / RA CA)
 * Web gửi: { action:'CHECK_IN', maNhanVien, loaiChamCong, qrToken, viDo, kinhDo, deviceInfo }
 * ========================================================================= */
function handleAttendanceCheck(data) {
  var maNhanVien = data.maNhanVien;
  var loaiChamCong = data.loaiChamCong === 'RaCa' ? 'RaCa' : 'VaoCa';
  var qrTokenString = data.qrToken;
  var viDo = Number(data.viDo);
  var kinhDo = Number(data.kinhDo);
  var deviceInfo = data.deviceInfo || 'Trình duyệt Web';

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sNhanVien = ss.getSheetByName(SHEET_NHAN_VIEN);
  var sChamCong = ss.getSheetByName(SHEET_CHAM_CONG);
  if (!sChamCong) return { status: 'error', message: 'Không tìm thấy bảng chấm công' };

  // 5.1 Nhân viên
  var staff = findStaffById(sNhanVien, maNhanVien);
  if (!staff) return { status: 'error', message: 'Không tìm thấy thông tin nhân viên.' };
  if (staff.TrangThai && staff.TrangThai !== 'HoatDong') {
    return { status: 'error', message: 'Tài khoản của bạn đang bị khóa, không thể chấm công.' };
  }

  // 5.2 QR động (chữ ký + hạn dùng + chống phát lại)
  var secret = PropertiesService.getScriptProperties().getProperty('CLINIC_SECRET') || DEFAULT_SECRET;
  var qrCheck = verifyQRToken(qrTokenString, secret);
  if (!qrCheck.valid) {
    ghiNhatKy(maNhanVien, 'CHAM_CONG_' + loaiChamCong, 'ThatBai', qrCheck.reason, deviceInfo);
    return { status: 'error', message: qrCheck.reason };
  }

  // 5.3 GPS & bán kính
  var config = getConfigMap();
  var clinicLat = toNumber(config.ViDoPhongKham, 9.3789);
  var clinicLng = toNumber(config.KinhDoPhongKham, 105.1186);
  var maxRadius = toNumber(config.BanKinhChamCongMet, 150);

  var distance = calculateDistance(viDo, kinhDo, clinicLat, clinicLng);
  if (!isFinite(distance) || distance > maxRadius) {
    ghiNhatKy(maNhanVien, 'CHAM_CONG_' + loaiChamCong, 'CanhBao',
      'Ngoài bán kính: ' + distance + 'm (Cho phép ' + maxRadius + 'm)', deviceInfo);
    return {
      status: 'error',
      message: 'Bạn đang ở cách phòng khám ' + distance + 'm, vượt quá bán kính quy định (' + maxRadius + 'm). Vui lòng di chuyển đến gần hơn.'
    };
  }

  // 5.4 Thời gian máy chủ Google (GMT+7)
  var now = new Date();
  var ngayHienTai = Utilities.formatDate(now, TIMEZONE, 'yyyy-MM-dd');
  var gioHienTai = Utilities.formatDate(now, TIMEZONE, 'HH:mm:ss');
  var gioPhutHienTai = Utilities.formatDate(now, TIMEZONE, 'HH:mm');
  var totalMinutes = minutesOfDay(gioPhutHienTai);

  // 5.5 Chống chấm trùng trong 3 phút
  var recent = getRecentPunches(sChamCong, maNhanVien, ngayHienTai);
  for (var p = 0; p < recent.length; p++) {
    if (recent[p].loai === loaiChamCong && recent[p].gio) {
      if (getMinuteDifference(recent[p].gio, gioPhutHienTai) < 3) {
        return {
          status: 'error',
          message: 'Bạn vừa thực hiện chấm công ' + (loaiChamCong === 'VaoCa' ? 'VÀO' : 'RA') + ' cách đây ít phút. Không cần quét lại!'
        };
      }
    }
  }

  // 5.6 Xác định ca & đi muộn / về sớm
  var shiftInfo = determineShift(totalMinutes, loaiChamCong);
  var trangThai = 'HopLe';
  var ghiChu = '';
  if (shiftInfo.isLate) {
    trangThai = 'DiMuon';
    ghiChu = 'Đi muộn ' + shiftInfo.diffMinutes + ' phút';
  } else if (shiftInfo.isEarlyLeave) {
    trangThai = 'VeSom';
    ghiChu = 'Về sớm ' + shiftInfo.diffMinutes + ' phút';
  } else if (shiftInfo.shiftCode === 'CaTruc') {
    ghiChu = 'Ca trực đêm / cấp cứu';
  } else {
    ghiChu = 'Chấm công bình thường';
  }

  // 5.7 Ghi bản ghi
  var maBanGhi = 'CC-' + Utilities.formatDate(now, TIMEZONE, 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
  sChamCong.appendRow([
    maBanGhi,
    staff.MaNhanVien,
    staff.HoTen,
    staff.PhongBan,
    ngayHienTai,
    gioHienTai,
    loaiChamCong,
    shiftInfo.shiftCode,
    viDo,
    kinhDo,
    distance,
    trangThai,
    qrCheck.nonce,
    'QR_Web',
    ghiChu
  ]);

  ghiNhatKy(staff.MaNhanVien, 'CHAM_CONG_' + loaiChamCong, 'ThanhCong',
    'Ghi nhận thành công (' + trangThai + ')', deviceInfo, maBanGhi);

  return {
    status: 'success',
    message: 'Chấm công ' + (loaiChamCong === 'VaoCa' ? 'VÀO CA' : 'RA CA') + ' thành công!',
    record: {
      MaBanGhi: maBanGhi,
      MaNhanVien: staff.MaNhanVien,
      HoTen: staff.HoTen,
      PhongBan: staff.PhongBan,
      NgayChamCong: ngayHienTai,
      GioChamCong: gioHienTai,
      LoaiChamCong: loaiChamCong,
      CaLamViec: shiftInfo.shiftCode,
      ViDo: viDo,
      KinhDo: kinhDo,
      KhoangCachDenPhongKham: distance,
      TrangThai: trangThai,
      MaPhienQR: qrCheck.nonce,
      NguonGhiNhan: 'QR_Web',
      GhiChu: ghiChu
    }
  };
}

/* =========================================================================
 * 6. XÁC THỰC MÃ QR ĐỘNG (khớp src/services/crypto.ts)
 * Chuỗi QR: {"cid","ts","n","sig","v"}
 * sig = sha256(cid + '|' + ts + '|' + n + '|' + v + '|' + secret).substring(0,24)
 * ========================================================================= */
function verifyQRToken(qrString, secret) {
  try {
    var parsed = JSON.parse(qrString);
    var cid = parsed.cid;
    var ts = parsed.ts;
    var n = parsed.n;
    var sig = parsed.sig;
    var v = parsed.v || 45;

    if (cid !== CLINIC_ID) {
      return { valid: false, reason: 'Mã QR không thuộc Phòng khám Đa khoa Nhã Uyên Cà Mau' };
    }
    if (!ts || !n || !sig) {
      return { valid: false, reason: 'Mã QR thiếu tham số bảo mật hợp lệ' };
    }

    var now = new Date().getTime();
    var ageSec = (now - ts) / 1000;
    if (ageSec > (v + 15)) {
      return { valid: false, reason: 'Mã QR đã hết hạn sử dụng. Vui lòng quét mã mới trên màn hình' };
    }
    if ((ts - now) / 1000 > 10) {
      return { valid: false, reason: 'Thời gian thiết bị không đồng bộ với hệ thống' };
    }

    var expectedSig = hashSha256(cid + '|' + ts + '|' + n + '|' + v + '|' + secret).substring(0, 24);
    if (expectedSig !== sig) {
      return { valid: false, reason: 'Chữ ký số QR không hợp lệ hoặc đã bị chỉnh sửa' };
    }

    // Chống phát lại: mỗi nonce dùng 1 lần trong 5 phút
    var cache = CacheService.getScriptCache();
    var nonceKey = 'qrnonce_' + n;
    if (cache.get(nonceKey)) {
      return { valid: false, reason: 'Mã QR này đã được quét trước đó (chống phát lại mã)' };
    }
    cache.put(nonceKey, '1', 300);

    return { valid: true, nonce: n, timestamp: ts };
  } catch (e) {
    return { valid: false, reason: 'Mã QR không đúng định dạng: ' + e.message };
  }
}

/* =========================================================================
 * 7. QUẢN LÝ NHÂN SỰ
 * ========================================================================= */

// Web mong đợi: { status:'success', staff:[ ...PascalCase... ] }
function getStaffList() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NHAN_VIEN);
  var rows = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    list.push({
      MaNhanVien: String(rows[i][0]),
      HoTen: String(rows[i][1] || ''),
      PhongBan: String(rows[i][2] || ''),
      ChucVu: String(rows[i][3] || ''),
      TenDangNhap: String(rows[i][4] || ''),
      ThongTinXacThuc: String(rows[i][5] || ''),
      Salt: String(rows[i][6] || ''),
      VaiTro: String(rows[i][7] || 'NhanVien'),
      TrangThai: String(rows[i][8] || 'HoatDong'),
      NgayTao: rows[i][9] ? formatDateTimeValue(rows[i][9]) : ''
    });
  }
  return { status: 'success', staff: list };
}

// Web mong đợi: { status:'success', records:[ AttendanceRecord PascalCase ] }
function getAttendanceList() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CHAM_CONG);
  if (!sheet) return { status: 'error', message: 'Không tìm thấy sheet ChamCong' };

  var rows = sheet.getDataRange().getValues();
  var display = sheet.getDataRange().getDisplayValues();
  var records = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    var d = display[i] || rows[i];
    records.push({
      MaBanGhi: String(rows[i][0]),
      MaNhanVien: String(rows[i][1] || ''),
      HoTen: String(rows[i][2] || ''),
      PhongBan: String(rows[i][3] || ''),
      NgayChamCong: normalizeDateString(rows[i][4]),
      GioChamCong: normalizeClockString(d[5] !== undefined && d[5] !== '' ? d[5] : rows[i][5]),
      LoaiChamCong: String(rows[i][6] || 'VaoCa'),
      CaLamViec: String(rows[i][7] || 'CaSang'),
      ViDo: toNumber(rows[i][8], 0),
      KinhDo: toNumber(rows[i][9], 0),
      KhoangCachDenPhongKham: toNumber(rows[i][10], 0),
      TrangThai: String(rows[i][11] || 'HopLe'),
      MaPhienQR: String(rows[i][12] || ''),
      NguonGhiNhan: String(rows[i][13] || 'QR_Web'),
      GhiChu: String(rows[i][14] || '')
    });
  }
  return { status: 'success', records: records };
}

function addStaff(data) {
  var ma = String(data.MaNhanVien || '').trim().toUpperCase();
  var tenDN = String(data.TenDangNhap || '').trim().toLowerCase();
  var hoTen = String(data.HoTen || '').trim();
  var password = String(data.passwordPlain || '');

  if (!ma || !tenDN || !hoTen || !password) {
    return { status: 'error', message: 'Thiếu thông tin bắt buộc (mã NV, tên đăng nhập, họ tên, mật khẩu).' };
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NHAN_VIEN);
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toUpperCase() === ma) {
      return { status: 'error', message: 'Mã nhân viên đã tồn tại.' };
    }
    if (String(rows[i][4]).toLowerCase() === tenDN) {
      return { status: 'error', message: 'Tên đăng nhập đã tồn tại.' };
    }
  }

  var salt = 'salt_' + new Date().getTime();
  var hash = hashSha256(salt + ':' + password + ':' + salt);

  sheet.appendRow([
    ma, hoTen,
    String(data.PhongBan || ''),
    String(data.ChucVu || ''),
    tenDN, hash, salt,
    String(data.VaiTro || 'NhanVien'),
    String(data.TrangThai || 'HoatDong'),
    getFormattedNow()
  ]);

  ghiNhatKy('ADMIN', 'THEM_NHAN_VIEN', 'ThanhCong', 'Thêm ' + ma + ' (' + hoTen + ')', data.deviceInfo || '');
  return { status: 'success', message: 'Tạo tài khoản nhân viên thành công.' };
}

function updateStaff(data) {
  var ma = String(data.MaNhanVien || '').trim().toUpperCase();
  if (!ma) return { status: 'error', message: 'Thiếu mã nhân viên.' };

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NHAN_VIEN);
  var rows = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toUpperCase() === ma) { rowIndex = i + 1; break; }
  }
  if (rowIndex === -1) return { status: 'error', message: 'Không tìm thấy nhân viên.' };

  if (data.HoTen !== undefined)    sheet.getRange(rowIndex, 2).setValue(String(data.HoTen));
  if (data.PhongBan !== undefined) sheet.getRange(rowIndex, 3).setValue(String(data.PhongBan));
  if (data.ChucVu !== undefined)   sheet.getRange(rowIndex, 4).setValue(String(data.ChucVu));
  if (data.VaiTro !== undefined)   sheet.getRange(rowIndex, 8).setValue(String(data.VaiTro));
  if (data.TrangThai !== undefined) sheet.getRange(rowIndex, 9).setValue(String(data.TrangThai));

  if (data.newPasswordPlain) {
    var salt = 'salt_' + new Date().getTime();
    sheet.getRange(rowIndex, 6).setValue(hashSha256(salt + ':' + data.newPasswordPlain + ':' + salt));
    sheet.getRange(rowIndex, 7).setValue(salt);
  }

  ghiNhatKy('ADMIN', 'CAP_NHAT_NHAN_VIEN', 'ThanhCong', 'Cập nhật ' + ma, data.deviceInfo || '');
  return { status: 'success', message: 'Cập nhật tài khoản nhân viên thành công.' };
}

// Web mong đợi: { status:'success', statusStaff:'HoatDong'|'Khoa' }
function toggleStaffStatus(data) {
  var ma = String(data.MaNhanVien || '').trim().toUpperCase();
  if (!ma) return { status: 'error', message: 'Thiếu mã nhân viên.', statusStaff: 'Khoa' };

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NHAN_VIEN);
  var rows = sheet.getDataRange().getValues();
  var rowIndex = -1;
  var current = 'HoatDong';
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toUpperCase() === ma) {
      rowIndex = i + 1;
      current = String(rows[i][8] || 'HoatDong');
      break;
    }
  }
  if (rowIndex === -1) return { status: 'error', message: 'Không tìm thấy nhân viên.', statusStaff: 'Khoa' };

  var next = current === 'HoatDong' ? 'Khoa' : 'HoatDong';
  sheet.getRange(rowIndex, 9).setValue(next);
  ghiNhatKy('ADMIN', 'DOI_TRANG_THAI_NV', 'ThanhCong', ma + ' -> ' + next, data.deviceInfo || '');
  return { status: 'success', message: 'Đã cập nhật trạng thái.', statusStaff: next };
}

// Xóa hẳn một nhân viên khỏi sheet NhanVien
function deleteStaff(data) {
  var ma = String(data.MaNhanVien || '').trim().toUpperCase();
  if (!ma) return { status: 'error', message: 'Thiếu mã nhân viên.' };

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NHAN_VIEN);
  var rows = sheet.getDataRange().getValues();
  var rowIndex = -1;
  var vaiTro = '';
  var hoTen = '';
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toUpperCase() === ma) {
      rowIndex = i + 1;
      vaiTro = String(rows[i][7] || '');
      hoTen = String(rows[i][1] || '');
      break;
    }
  }
  if (rowIndex === -1) return { status: 'error', message: 'Không tìm thấy nhân viên.' };
  if (vaiTro === 'Admin') return { status: 'error', message: 'Không thể xóa tài khoản Quản trị viên.' };

  sheet.deleteRow(rowIndex);
  ghiNhatKy('ADMIN', 'XOA_NHAN_VIEN', 'ThanhCong', 'Xóa nhân viên ' + ma + ' (' + hoTen + ')', data.deviceInfo || '');
  return { status: 'success', message: 'Đã xóa nhân viên khỏi Google Sheets.' };
}

/* =========================================================================
 * 8. CA LÀM VIỆC
 * ========================================================================= */

// Web mong đợi: { status:'success', shifts:[ WorkShift PascalCase ] }
function getShiftList() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CA_LAM_VIEC);
  if (!sheet) return { status: 'error', message: 'Không thấy sheet ca làm việc' };

  var rows = sheet.getDataRange().getValues();
  var display = sheet.getDataRange().getDisplayValues();
  var list = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    list.push({
      MaCa: String(rows[i][0]),
      TenCa: String(rows[i][1] || ''),
      GioBatDau: normalizeTimeString(display[i] ? display[i][2] : rows[i][2]),
      GioKetThuc: normalizeTimeString(display[i] ? display[i][3] : rows[i][3]),
      ThoiGianChoPhepTre: toNumber(rows[i][4], 0),
      ThoiGianChoPhepSom: toNumber(rows[i][5], 0),
      TrangThai: String(rows[i][6] || 'HoatDong')
    });
  }
  return { status: 'success', shifts: list };
}

function updateShiftRow(data) {
  var maCa = data.MaCa || data.maCa || data.MaCa;
  if (!maCa) return { status: 'error', message: 'Thiếu mã ca làm việc.' };

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CA_LAM_VIEC);
  if (!sheet) return { status: 'error', message: 'Không tìm thấy sheet CaLamViec' };

  var rows = sheet.getDataRange().getValues();
  var foundRow = -1;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toLowerCase() === String(maCa).trim().toLowerCase()) {
      foundRow = i + 1;
      break;
    }
  }
  if (foundRow === -1) return { status: 'error', message: 'Không tìm thấy mã ca: ' + maCa };

  // Web gửi PascalCase: GioBatDau, GioKetThuc, ThoiGianChoPhepTre, ThoiGianChoPhepSom, TrangThai
  if (data.TenCa !== undefined)               sheet.getRange(foundRow, 2).setValue(String(data.TenCa));
  if (data.GioBatDau !== undefined)           sheet.getRange(foundRow, 3).setValue(String(data.GioBatDau));
  if (data.GioKetThuc !== undefined)          sheet.getRange(foundRow, 4).setValue(String(data.GioKetThuc));
  if (data.ThoiGianChoPhepTre !== undefined)  sheet.getRange(foundRow, 5).setValue(Number(data.ThoiGianChoPhepTre));
  if (data.ThoiGianChoPhepSom !== undefined)  sheet.getRange(foundRow, 6).setValue(Number(data.ThoiGianChoPhepSom));
  if (data.TrangThai !== undefined)           sheet.getRange(foundRow, 7).setValue(String(data.TrangThai));

  ghiNhatKy('ADMIN', 'UPDATE_SHIFT', 'ThanhCong', 'Cập nhật ca ' + maCa, data.deviceInfo || '');
  return { status: 'success', message: 'Đã lưu ca lên Sheets.' };
}

/* =========================================================================
 * 9. CẤU HÌNH HỆ THỐNG
 * ========================================================================= */

// Web mong đợi: { status:'success', config:[ {TenCauHinh,GiaTri,MoTa} ] }
function getConfigList() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CAU_HINH);
  if (!sheet) return { status: 'error', message: 'Không tìm thấy sheet CauHinh' };

  var rows = sheet.getDataRange().getValues();
  var config = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    config.push({
      TenCauHinh: String(rows[i][0]),
      GiaTri: String(rows[i][1] === null || rows[i][1] === undefined ? '' : rows[i][1]),
      MoTa: String(rows[i][2] || '')
    });
  }
  return { status: 'success', config: config };
}

// Web gửi: { action:'UPDATE_CONFIG', key, value, deviceInfo }
function updateConfig(data) {
  var key = data.key !== undefined ? data.key : (data.TenCauHinh !== undefined ? data.TenCauHinh : data.tenCauHinh);
  var value = data.value !== undefined ? data.value : (data.GiaTri !== undefined ? data.GiaTri : data.giaTri);

  if (key === undefined || key === null || String(key).trim() === '') {
    return { status: 'error', message: 'Thiếu tên cấu hình cần cập nhật.' };
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CAU_HINH);
  if (!sheet) return { status: 'error', message: 'Không tìm thấy sheet CauHinh' };

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(key).trim()) {
      sheet.getRange(i + 1, 2).setValue(value === undefined ? '' : value);
      ghiNhatKy('ADMIN', 'UPDATE_CONFIG', 'ThanhCong', key + ' = ' + value, data.deviceInfo || '');
      return { status: 'success', message: 'Đã lưu cấu hình lên Google Sheets.' };
    }
  }

  // Chưa có thì thêm mới
  sheet.appendRow([String(key), value === undefined ? '' : value, 'Cấu hình tùy chỉnh']);
  ghiNhatKy('ADMIN', 'THEM_CONFIG', 'ThanhCong', key + ' = ' + value, data.deviceInfo || '');
  return { status: 'success', message: 'Đã thêm cấu hình mới lên Google Sheets.' };
}

/* =========================================================================
 * 10. HÀM PHỤ TRỢ
 * ========================================================================= */

function parseRequestBody(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (err) {
      return e.parameter || {};
    }
  }
  return (e && e.parameter) || {};
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function styleHeaderRow(sheet, colorCode) {
  var range = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  range.setBackground(colorCode).setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

function hashSha256(input) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(input), Utilities.Charset.UTF_8);
  var output = '';
  for (var i = 0; i < rawHash.length; i++) {
    var v = rawHash[i];
    if (v < 0) v += 256;
    if (v < 16) output += '0';
    output += v.toString(16);
  }
  return output;
}

function getFormattedNow() {
  return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

function formatDateTimeValue(val) {
  if (val instanceof Date) return Utilities.formatDate(val, TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
  return String(val);
}

// Chuyển giá trị giờ của Sheets (Date hoặc chuỗi) -> "HH:mm"
function formatTimeString(val) {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, TIMEZONE, 'HH:mm');
  }
  var str = val.toString().trim();
  if (str.length >= 5 && str.indexOf(':') !== -1) return str.substring(0, 5);
  return str;
}

function pad2(n) {
  return (n < 10 ? '0' : '') + n;
}

/**
 * Chuẩn hóa giờ về "HH:mm" từ GIÁ TRỊ HIỂN THỊ của ô (getDisplayValues).
 * Tránh lỗi lệch phút khi ô là kiểu giờ (Date) do múi giờ lịch sử của Sheets,
 * hoặc khi ô hiển thị dạng 12 giờ (7:00 AM / 5:00 PM).
 */
function normalizeTimeString(val) {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date) {
    return pad2(val.getHours()) + ':' + pad2(val.getMinutes());
  }
  var s = String(val).trim();
  var m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return s;
  var h = parseInt(m[1], 10);
  if (/pm/i.test(s) && h < 12) h += 12;
  if (/am/i.test(s) && h === 12) h = 0;
  return pad2(h) + ':' + m[2];
}

// Chuẩn hóa về "HH:mm:ss"
function normalizeClockString(val) {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date) {
    return pad2(val.getHours()) + ':' + pad2(val.getMinutes()) + ':' + pad2(val.getSeconds());
  }
  var s = String(val).trim();
  var m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return s;
  var h = parseInt(m[1], 10);
  if (/pm/i.test(s) && h < 12) h += 12;
  if (/am/i.test(s) && h === 12) h = 0;
  return pad2(h) + ':' + m[2] + ':' + (m[3] || '00');
}

// Chuẩn hóa ngày về "yyyy-MM-dd"
function normalizeDateString(val) {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, TIMEZONE, 'yyyy-MM-dd');
  }
  var s = String(val).trim();
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + '-' + pad2(Number(m[2])) + '-' + pad2(Number(m[3]));
  return s;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function ghiNhatKy(maNV, hanhDong, ketQua, lyDo, thongTinThietBi, thamChieu) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NHAT_KY);
    if (!sheet) return;
    var maNK = 'LOG-' + Date.now() + '-' + Math.floor(Math.random() * 900 + 100);
    sheet.appendRow([
      maNK, getFormattedNow(), maNV || 'ANONYMOUS', hanhDong, ketQua,
      lyDo || '', thongTinThietBi || '', thamChieu || ''
    ]);
  } catch (e) {
    // Bỏ qua lỗi nhật ký để không ngắt luồng chính
  }
}

function getConfigMap() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CAU_HINH);
  var map = {};
  if (!sheet) return map;
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0]) map[String(rows[i][0])] = rows[i][1];
  }
  return map;
}

function findStaffById(sheet, maNhanVien) {
  if (!sheet) return null;
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(maNhanVien)) {
      return {
        MaNhanVien: rows[i][0],
        HoTen: rows[i][1],
        PhongBan: rows[i][2],
        ChucVu: rows[i][3],
        TrangThai: rows[i][8]
      };
    }
  }
  return null;
}

function getRecentPunches(sheet, maNhanVien, ngay) {
  var rows = sheet.getDataRange().getValues();
  var list = [];
  for (var i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][1]) === String(maNhanVien) && formatDateCell(rows[i][4]) === ngay) {
      list.push({ loai: rows[i][6], gio: formatTimeString(rows[i][5]) });
      if (list.length >= 5) break;
    }
  }
  return list;
}

function formatDateCell(val) {
  if (val instanceof Date) return Utilities.formatDate(val, TIMEZONE, 'yyyy-MM-dd');
  return String(val).substring(0, 10);
}

function getMinuteDifference(timeStr1, timeStr2) {
  try {
    var p1 = String(timeStr1).split(':');
    var p2 = String(timeStr2).split(':');
    var m1 = Number(p1[0]) * 60 + Number(p1[1]);
    var m2 = Number(p2[0]) * 60 + Number(p2[1]);
    return Math.abs(m2 - m1);
  } catch (e) {
    return 999;
  }
}

// Từ "HH:mm" -> số phút trong ngày
function minutesOfDay(hhmm) {
  var parts = String(hhmm).split(':');
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function toNumber(val, fallback) {
  var n = Number(val);
  return isFinite(n) ? n : fallback;
}

// Haversine -> mét
function calculateDistance(lat1, lon1, lat2, lon2) {
  var R = 6371e3;
  var toRad = function (x) { return x * Math.PI / 180; };
  var dLat = toRad(lat2 - lat1);
  var dLon = toRad(lon2 - lon1);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Đọc danh sách ca đang hoạt động từ sheet CaLamViec
function getShiftDefinitions() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CA_LAM_VIEC);
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  var display = sheet.getDataRange().getDisplayValues();
  var list = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    if (String(rows[i][6] || '') === 'TamDung') continue;
    list.push({
      MaCa: String(rows[i][0]),
      GioBatDau: normalizeTimeString(display[i] ? display[i][2] : rows[i][2]),
      GioKetThuc: normalizeTimeString(display[i] ? display[i][3] : rows[i][3]),
      Tre: toNumber(rows[i][4], 0),
      Som: toNumber(rows[i][5], 0)
    });
  }
  return list;
}

// Xác định ca & đi muộn/về sớm — đọc trực tiếp cấu hình ca từ sheet (giống web)
function determineShift(totalMinutes, loaiChamCong) {
  var shifts = getShiftDefinitions();
  if (!shifts.length) {
    return { shiftCode: 'CaSang', isLate: false, isEarlyLeave: false, diffMinutes: 0 };
  }

  var best = null;
  var bestDist = Infinity;
  for (var i = 0; i < shifts.length; i++) {
    var s = shifts[i];
    var anchor = hhmmToMinutes(loaiChamCong === 'VaoCa' ? s.GioBatDau : s.GioKetThuc);
    if (!isFinite(anchor)) continue;
    var d = circularDistance(totalMinutes, anchor);
    if (d < bestDist) { bestDist = d; best = s; }
  }
  if (!best) {
    return { shiftCode: 'CaSang', isLate: false, isEarlyLeave: false, diffMinutes: 0 };
  }

  var isLate = false;
  var isEarlyLeave = false;
  var diff = 0;

  if (loaiChamCong === 'VaoCa') {
    var start = hhmmToMinutes(best.GioBatDau);
    var off = signedOffset(totalMinutes, start); // dương = sau giờ bắt đầu
    if (off > (Number(best.Tre) || 0)) { isLate = true; diff = off; }
  } else {
    var end = hhmmToMinutes(best.GioKetThuc);
    var offE = signedOffset(end, totalMinutes); // dương = trước giờ kết thúc
    if (offE > (Number(best.Som) || 0)) { isEarlyLeave = true; diff = offE; }
  }

  return { shiftCode: best.MaCa, isLate: isLate, isEarlyLeave: isEarlyLeave, diffMinutes: diff };
}

// "HH:mm" -> số phút trong ngày
function hhmmToMinutes(hhmm) {
  var parts = String(hhmm || '').split(':');
  var h = Number(parts[0]);
  var m = Number(parts[1]);
  if (!isFinite(h) || !isFinite(m)) return NaN;
  return h * 60 + m;
}

function circularDistance(a, b) {
  var d = Math.abs(a - b) % 1440;
  return Math.min(d, 1440 - d);
}

// offset có dấu từ anchor -> time trong khoảng (-720, 720]; dương = time sau anchor
function signedOffset(time, anchor) {
  return ((time - anchor + 1440 + 720) % 1440) - 720;
}

/* =========================================================================
 * 11. TIỆN ÍCH: đặt lại mật khẩu Admin mặc định (dùng khi quên)
 * ========================================================================= */
function resetAdminPassword() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NHAN_VIEN);
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][4]).toString().toLowerCase() === 'admin') {
      var salt = 'nha_uyen_salt_admin';
      sheet.getRange(i + 1, 6).setValue(hashSha256(salt + ':Admin@123:' + salt));
      sheet.getRange(i + 1, 7).setValue(salt);
    }
  }
  return 'Đã đặt lại mật khẩu Admin = Admin@123';
}
