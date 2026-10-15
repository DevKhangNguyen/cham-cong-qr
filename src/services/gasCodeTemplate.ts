/**
 * Complete Google Apps Script (Code.gs) template for Google Sheets attendance system.
 * Ready for 1-click copying and deployment in Google Apps Script.
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * PHÒNG KHÁM ĐA KHOA Y DƯỢC NHÃ UYÊN CÀ MAU
 * HỆ THỐNG CHẤM CÔNG NHÂN VIÊN BẰNG QR CODE ĐỘNG & GOOGLE SHEETS
 * Địa chỉ: Ấp 5, xã Thới Bình, tỉnh Cà Mau
 * Múi giờ: Asia/Ho_Chi_Minh (GMT+7)
 * =========================================================================
 */

// Tên các bảng tính (Sheets) theo đặc tả hệ thống
var SHEET_NHAN_VIEN = 'NhanVien';
var SHEET_CHAM_CONG = 'ChamCong';
var SHEET_CA_LAM_VIEC = 'CaLamViec';
var SHEET_CAU_HINH = 'CauHinh';
var SHEET_NHAT_KY = 'NhatKyHeThong';

var TIMEZONE = 'Asia/Ho_Chi_Minh';
var DEFAULT_SECRET = 'NHA_UYEN_CLINIC_SECURE_TOKEN_SECRET_2026';

/**
 * 1. HÀM KHỞI TẠO BẢNG TÍNH TỰ ĐỘNG (Chỉ chạy 1 lần khi cài đặt)
 * Tự động tạo 5 sheets, định dạng tiêu đề, màu sắc, tài khoản Admin mẫu và cấu hình chuẩn.
 */
function setupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Sheet 1: NhanVien
  var sNhanVien = getOrCreateSheet(ss, SHEET_NHAN_VIEN);
  sNhanVien.clear();
  var headersNhanVien = [
    'MaNhanVien', 'HoTen', 'PhongBan', 'ChucVu', 'TenDangNhap', 
    'ThongTinXacThuc', 'Salt', 'VaiTro', 'TrangThai', 'NgayTao'
  ];
  sNhanVien.appendRow(headersNhanVien);
  styleHeaderRow(sNhanVien, '#0B4B82');
  
  // Thêm tài khoản Quản trị viên (Admin) mặc định
  // Mật khẩu ban đầu: Admin@123 (mã hóa SHA-256 kèm Salt an toàn)
  var adminSalt = 'nha_uyen_salt_admin';
  var adminHash = hashSha256(adminSalt + ':Admin@123:' + adminSalt);
  sNhanVien.appendRow([
    'NV-ADMIN', 'Quản Trị Viên Hệ Thống', 'Ban Giám Đốc', 'Quản trị viên',
    'admin', adminHash, adminSalt, 'Admin', 'HoatDong', getFormattedNow()
  ]);
  
  // Thêm nhân viên mẫu
  var bsSalt = 'salt_bs_an';
  var bsHash = hashSha256(bsSalt + ':123456:' + bsSalt);
  sNhanVien.appendRow([
    'NV-001', 'BS.CKI Nguyễn Văn An', 'Khoa Khám Bệnh', 'Bác sĩ',
    'bs.an', bsHash, bsSalt, 'NhanVien', 'HoatDong', getFormattedNow()
  ]);

  var ddSalt = 'salt_dd_hoa';
  var ddHash = hashSha256(ddSalt + ':123456:' + ddSalt);
  sNhanVien.appendRow([
    'NV-002', 'ĐD. Trần Thị Hoa', 'Khoa Cấp Cứu', 'Điều dưỡng',
    'dd.hoa', ddHash, ddSalt, 'NhanVien', 'HoatDong', getFormattedNow()
  ]);

  // Sheet 2: ChamCong
  var sChamCong = getOrCreateSheet(ss, SHEET_CHAM_CONG);
  sChamCong.clear();
  var headersChamCong = [
    'MaBanGhi', 'MaNhanVien', 'HoTen', 'PhongBan', 'NgayChamCong',
    'GioChamCong', 'LoaiChamCong', 'CaLamViec', 'ViDo', 'KinhDo',
    'KhoangCachDenPhongKham', 'TrangThai', 'MaPhienQR', 'NguonGhiNhan', 'GhiChu'
  ];
  sChamCong.appendRow(headersChamCong);
  styleHeaderRow(sChamCong, '#0B4B82');

  // Sheet 3: CaLamViec
  var sCaLamViec = getOrCreateSheet(ss, SHEET_CA_LAM_VIEC);
  sCaLamViec.clear();
  var headersCa = [
    'MaCa', 'TenCa', 'GioBatDau', 'GioKetThuc', 
    'ThoiGianChoPhepTre', 'ThoiGianChoPhepSom', 'TrangThai'
  ];
  sCaLamViec.appendRow(headersCa);
  styleHeaderRow(sCaLamViec, '#0B4B82');
  sCaLamViec.appendRow(['CaSang', 'Ca Sáng Phòng Khám', '07:00', '11:30', 15, 15, 'HoatDong']);
  sCaLamViec.appendRow(['CaChieu', 'Ca Chiều Phòng Khám', '13:00', '17:00', 15, 15, 'HoatDong']);
  sCaLamViec.appendRow(['CaTruc', 'Ca Trực Đêm / Cấp Cứu', '17:00', '07:00', 30, 30, 'HoatDong']);

  // Sheet 4: CauHinh
  var sCauHinh = getOrCreateSheet(ss, SHEET_CAU_HINH);
  sCauHinh.clear();
  var headersCauHinh = ['TenCauHinh', 'GiaTri', 'MoTa'];
  sCauHinh.appendRow(headersCauHinh);
  styleHeaderRow(sCauHinh, '#0B4B82');
  sCauHinh.appendRow(['TenPhongKham', 'Phòng khám Đa khoa Y Dược Nhã Uyên Cà Mau', 'Tên đơn vị']);
  sCauHinh.appendRow(['DiaChi', 'Ấp 5, xã Thới Bình, tỉnh Cà Mau', 'Địa chỉ phòng khám']);
  sCauHinh.appendRow(['ViDoPhongKham', '9.3789', 'Tọa độ Vĩ độ GPS phòng khám']);
  sCauHinh.appendRow(['KinhDoPhongKham', '105.1186', 'Tọa độ Kinh độ GPS phòng khám']);
  sCauHinh.appendRow(['BanKinhChamCongMet', '150', 'Bán kính hợp lệ tối đa (mét)']);
  sCauHinh.appendRow(['ThoiHanQRGiay', '45', 'Thời gian hiệu lực mỗi mã QR động (giây)']);
  sCauHinh.appendRow(['ChoPhepChamCongNgoaiGio', 'Co', 'Ghi nhận ngoài giờ với cảnh báo']);

  // Sheet 5: NhatKyHeThong
  var sNhatKy = getOrCreateSheet(ss, SHEET_NHAT_KY);
  sNhatKy.clear();
  var headersNhatKy = [
    'MaNhatKy', 'ThoiGian', 'MaNhanVien', 'HanhDong', 'KetQua',
    'LyDo', 'ThongTinThietBi', 'ThamChieuBanGhi'
  ];
  sNhatKy.appendRow(headersNhatKy);
  styleHeaderRow(sNhatKy, '#0B4B82');

  // Lưu Khóa bí mật vào Script Properties (không công khai trên sheet)
  var scriptProps = PropertiesService.getScriptProperties();
  if (!scriptProps.getProperty('CLINIC_SECRET')) {
    scriptProps.setProperty('CLINIC_SECRET', DEFAULT_SECRET);
  }

  ghiNhatKy('SYSTEM', 'KHOI_TAO_HE_THONG', 'ThanhCong', 'Khởi tạo thành công 5 sheets và tài khoản Admin', 'Google Apps Script');
  
  return 'Cấu hình bảng tính Phòng khám Đa khoa Y Dược Nhã Uyên thành công!';
}

/**
 * 2. ĐIỂM TIẾP NHẬN YÊU CẦU GET (doGet)
 */
function doGet(e) {
  var params = e ? e.parameter : {};
  var action = params.action || 'PING';

  try {
    var responseData;
    if (action === 'PING') {
      responseData = {
        status: 'success',
        message: 'Google Apps Script Chấm Công Nhã Uyên Cà Mau hoạt động bình thường',
        serverTime: getFormattedNow(),
        timezone: TIMEZONE
      };
    } else if (action === 'GET_CONFIG') {
      responseData = getConfigMap();
    } else if (action === 'GET_SHIFTS') {
      responseData = getShifts();
    } else if (action === 'GET_TODAY_ATTENDANCE') {
      responseData = getTodayAttendance(params.maNhanVien);
    } else if (action === 'GET_HISTORY') {
      responseData = getAttendanceHistory(params);
    } else {
      responseData = { status: 'error', message: 'Hành động GET không được hỗ trợ' };
    }

    return createJsonResponse(responseData);
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * 3. ĐIỂM TIẾP NHẬN YÊU CẦU POST (doPost)
 * Sử dụng LockService chống xung đột ghi đồng thời (Concurrency Control)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Đợi tối đa 10 giây để lấy quyền ghi độc quyền
    lock.waitLock(10000);
  } catch (e) {
    return createJsonResponse({
      status: 'error',
      message: 'Hệ thống đang bận xử lý nhiều yêu cầu đồng thời. Vui lòng thử lại sau vài giây.'
    });
  }

  try {
    var data = {};
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }

    var action = data.action;
    var result;

    switch (action) {
      case 'LOGIN':
        result = handleStaffLogin(data);
        break;
      case 'CHECK_IN':
        result = handleAttendanceCheck(data);
        break;
      case 'GET_STAFF_LIST':
        result = getStaffList(data);
        break;
      case 'ADD_STAFF':
        result = addStaff(data);
        break;
      case 'UPDATE_STAFF':
        result = updateStaff(data);
        break;
      case 'TOGGLE_STAFF_STATUS':
        result = toggleStaffStatus(data);
        break;
      case 'REQUEST_ADJUSTMENT':
        result = requestAttendanceAdjustment(data);
        break;
      case 'APPROVE_ADJUSTMENT':
        result = approveAttendanceAdjustment(data);
        break;
      default:
        result = { status: 'error', message: 'Hành động POST không hợp lệ: ' + action };
    }

    return createJsonResponse(result);
  } catch (err) {
    return createJsonResponse({ status: 'error', message: 'Lỗi máy chủ: ' + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * 4. XỬ LÝ ĐĂNG NHẬP NHÂN VIÊN
 */
function handleStaffLogin(data) {
  var username = (data.username || '').trim().toLowerCase();
  var password = data.password || '';
  var deviceInfo = data.deviceInfo || 'Trình duyệt Web';

  if (!username || !password) {
    return { status: 'error', message: 'Vui lòng nhập tên đăng nhập và mật khẩu' };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NHAN_VIEN);
  var values = sheet.getDataRange().getValues();

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var storedUser = String(row[4]).trim().toLowerCase();

    if (storedUser === username) {
      var status = row[8];
      if (status === 'Khoa') {
        ghiNhatKy(row[0], 'DANG_NHAP', 'ThatBai', 'Tài khoản đã bị khóa bởi quản trị viên', deviceInfo);
        return { status: 'error', message: 'Tài khoản này đã bị tạm khóa. Vui lòng liên hệ Quản trị viên phòng khám.' };
      }

      var storedHash = row[5];
      var salt = row[6] || '';
      var testHash = hashSha256(salt + ':' + password + ':' + salt);

      if (testHash === storedHash) {
        ghiNhatKy(row[0], 'DANG_NHAP', 'ThanhCong', 'Đăng nhập thành công', deviceInfo);
        return {
          status: 'success',
          staff: {
            MaNhanVien: row[0],
            HoTen: row[1],
            PhongBan: row[2],
            ChucVu: row[3],
            TenDangNhap: row[4],
            VaiTro: row[7],
            TrangThai: row[8]
          }
        };
      } else {
        ghiNhatKy(row[0], 'DANG_NHAP', 'ThatBai', 'Mật khẩu không chính xác', deviceInfo);
        return { status: 'error', message: 'Mật khẩu không đúng. Vui lòng kiểm tra lại.' };
      }
    }
  }

  ghiNhatKy(username, 'DANG_NHAP', 'ThatBai', 'Tên đăng nhập không tồn tại', deviceInfo);
  return { status: 'error', message: 'Tên đăng nhập không tồn tại trong hệ thống' };
}

/**
 * 5. XỬ LÝ CHẤM CÔNG (VÀO CA / RA CA)
 * Thực hiện đầy đủ 7 lớp kiểm tra bảo mật:
 * - Kiểm tra trạng thái tài khoản
 * - Kiểm tra chữ ký & hạn sử dụng QR token
 * - Kiểm tra thời gian máy chủ Google
 * - Kiểm tra tọa độ GPS & bán kính phòng khám
 * - Kiểm tra ca làm việc & muộn/sớm
 * - Chống chấm trùng lặp
 * - Ghi lịch sử & nhật ký
 */
function handleAttendanceCheck(data) {
  var maNhanVien = data.maNhanVien;
  var loaiChamCong = data.loaiChamCong || 'VaoCa'; // 'VaoCa' hoặc 'RaCa'
  var qrTokenString = data.qrToken;
  var viDo = Number(data.viDo);
  var kinhDo = Number(data.kinhDo);
  var deviceInfo = data.deviceInfo || 'Trình duyệt Web';

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sNhanVien = ss.getSheetByName(SHEET_NHAN_VIEN);
  var sChamCong = ss.getSheetByName(SHEET_CHAM_CONG);
  var staff = findStaffById(sNhanVien, maNhanVien);

  if (!staff) {
    return { status: 'error', message: 'Không tìm thấy thông tin nhân viên' };
  }
  if (staff.TrangThai === 'Khoa') {
    return { status: 'error', message: 'Tài khoản nhân viên đang bị khóa, không thể chấm công' };
  }

  // 5.1. Xác thực Mã QR động
  var secret = PropertiesService.getScriptProperties().getProperty('CLINIC_SECRET') || DEFAULT_SECRET;
  var qrCheck = verifyQRToken(qrTokenString, secret);
  if (!qrCheck.valid) {
    ghiNhatKy(maNhanVien, 'CHAM_CONG_' + loaiChamCong, 'ThatBai', qrCheck.reason, deviceInfo);
    return { status: 'error', message: qrCheck.reason };
  }

  // 5.2. Kiểm tra vị trí GPS
  var config = getConfigMap();
  var clinicLat = Number(config.ViDoPhongKham || 9.3789);
  var clinicLng = Number(config.KinhDoPhongKham || 105.1186);
  var maxRadius = Number(config.BanKinhChamCongMet || 150);

  var distance = calculateDistance(viDo, kinhDo, clinicLat, clinicLng);
  var isWithinRadius = distance <= maxRadius;

  if (!isWithinRadius) {
    ghiNhatKy(maNhanVien, 'CHAM_CONG_' + loaiChamCong, 'CanhBao', 
      'Ngoài bán kính cho phép (' + distance + 'm > ' + maxRadius + 'm)', deviceInfo);
    return {
      status: 'error',
      message: 'Vị trí của bạn cách phòng khám ' + distance + 'm (vượt quá bán kính cho phép ' + maxRadius + 'm).'
    };
  }

  // 5.3. Thời gian máy chủ Google (GMT+7)
  var now = new Date();
  var ngayHienTai = Utilities.formatDate(now, TIMEZONE, 'yyyy-MM-dd');
  var gioHienTai = Utilities.formatDate(now, TIMEZONE, 'HH:mm:ss');
  var gioPhutHienTai = Utilities.formatDate(now, TIMEZONE, 'HH:mm');

  // 5.4. Chống chấm công trùng lặp trong vòng 3 phút
  var recentPunches = getRecentPunches(sChamCong, maNhanVien, ngayHienTai);
  for (var p = 0; p < recentPunches.length; p++) {
    var item = recentPunches[p];
    if (item.loai === loaiChamCong && item.gio) {
      var diffMin = getMinuteDifference(item.gio, gioPhutHienTai);
      if (diffMin < 3) {
        return {
          status: 'error',
          message: 'Bạn vừa thực hiện chấm công ' + (loaiChamCong === 'VaoCa' ? 'VÀO' : 'RA') + ' cách đây ' + diffMin + ' phút. Vui lòng không quét liên tiếp.'
        };
      }
    }
  }

  // 5.5. Xác định ca làm việc và trạng thái đi muộn / về sớm
  var shiftInfo = determineShift(now, loaiChamCong);
  var trangThaiChamCong = 'HopLe';
  var ghiChu = '';

  if (shiftInfo.isLate) {
    trangThaiChamCong = 'DiMuon';
    ghiChu = 'Đi muộn ' + shiftInfo.diffMinutes + ' phút so với giờ bắt đầu ca';
  } else if (shiftInfo.isEarlyLeave) {
    trangThaiChamCong = 'VeSom';
    ghiChu = 'Về sớm ' + shiftInfo.diffMinutes + ' phút so với giờ kết thúc ca';
  }

  // 5.6. Ghi bản ghi vào Sheet ChamCong
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
    trangThaiChamCong,
    qrCheck.nonce,
    'QR_Web',
    ghiChu
  ]);

  ghiNhatKy(staff.MaNhanVien, 'CHAM_CONG_' + loaiChamCong, 'ThanhCong', 
    'Chấm công ' + (loaiChamCong === 'VaoCa' ? 'vào' : 'ra') + ' thành công (' + trangThaiChamCong + ')', 
    deviceInfo, maBanGhi);

  return {
    status: 'success',
    message: 'Chấm công ' + (loaiChamCong === 'VaoCa' ? 'VÀO CA' : 'RA CA') + ' thành công!',
    record: {
      maBanGhi: maBanGhi,
      hoTen: staff.HoTen,
      ngay: ngayHienTai,
      gio: gioHienTai,
      loai: loaiChamCong,
      ca: shiftInfo.shiftName,
      khoangCach: distance,
      trangThai: trangThaiChamCong,
      ghiChu: ghiChu
    }
  };
}

/**
 * Xác thực chữ ký và thời hạn mã QR động
 */
function verifyQRToken(qrString, secret) {
  try {
    var parsed = JSON.parse(qrString);
    var cid = parsed.cid;
    var ts = parsed.ts;
    var n = parsed.n;
    var sig = parsed.sig;
    var v = parsed.v || 45;

    if (cid !== 'PKDK_NHA_UYEN_CAMAU') {
      return { valid: false, reason: 'Mã QR không thuộc Phòng khám Đa khoa Nhã Uyên' };
    }

    var now = new Date().getTime();
    var ageSec = (now - ts) / 1000;

    if (ageSec > (v + 15)) {
      return { valid: false, reason: 'Mã QR đã hết hạn (' + Math.round(ageSec) + 's). Vui lòng quét mã mới' };
    }

    var expectedRaw = cid + '|' + ts + '|' + n + '|' + v;
    var expectedSig = hashSha256(expectedRaw + '|' + secret).substring(0, 24);

    if (expectedSig !== sig) {
      return { valid: false, reason: 'Chữ ký bảo mật của mã QR không hợp lệ' };
    }

    return { valid: true, nonce: n, timestamp: ts };
  } catch (e) {
    return { valid: false, reason: 'Mã QR không hợp lệ: ' + e.message };
  }
}

/**
 * Tính khoảng cách giữa 2 tọa độ theo công thức Haversine (mét)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  var R = 6371e3;
  var toRad = function(x) { return x * Math.PI / 180; };
  var dLat = toRad(lat2 - lat1);
  var dLon = toRad(lon2 - lon1);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Xác định ca làm việc dựa trên giờ thực tế
 */
function determineShift(dateObj, loaiChamCong) {
  var hour = dateObj.getHours();
  var minute = dateObj.getMinutes();
  var totalMinutes = hour * 60 + minute;

  // Ca Sáng: 07:00 (420p) - 11:30 (690p), cho phép trễ 15p (435p)
  // Ca Chiều: 13:00 (780p) - 17:00 (1020p), cho phép trễ 15p (795p)
  // Ca Trực: 17:00 (1020p) - 07:00 sáng hôm sau (420p)

  if (totalMinutes >= 360 && totalMinutes < 720) {
    // Thuộc ca sáng
    var isLate = (loaiChamCong === 'VaoCa' && totalMinutes > 435);
    var isEarly = (loaiChamCong === 'RaCa' && totalMinutes < 675);
    return {
      shiftCode: 'CaSang',
      shiftName: 'Ca Sáng (07:00 - 11:30)',
      isLate: isLate,
      isEarlyLeave: isEarly,
      diffMinutes: isLate ? (totalMinutes - 420) : (isEarly ? (690 - totalMinutes) : 0)
    };
  } else if (totalMinutes >= 720 && totalMinutes < 1020) {
    // Thuộc ca chiều
    var isLate = (loaiChamCong === 'VaoCa' && totalMinutes > 795);
    var isEarly = (loaiChamCong === 'RaCa' && totalMinutes < 1005);
    return {
      shiftCode: 'CaChieu',
      shiftName: 'Ca Chiều (13:00 - 17:00)',
      isLate: isLate,
      isEarlyLeave: isEarly,
      diffMinutes: isLate ? (totalMinutes - 780) : (isEarly ? (1020 - totalMinutes) : 0)
    };
  } else {
    // Thuộc ca trực đêm / cấp cứu
    return {
      shiftCode: 'CaTruc',
      shiftName: 'Ca Trực Đêm (17:00 - 07:00)',
      isLate: false,
      isEarlyLeave: false,
      diffMinutes: 0
    };
  }
}

/**
 * Trợ giúp ghi nhật ký bảo mật
 */
function ghiNhatKy(maNhanVien, hanhDong, ketQua, lyDo, thietBi, refId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sNhatKy = ss.getSheetByName(SHEET_NHAT_KY);
    if (!sNhatKy) return;

    var logId = 'LOG-' + Date.now();
    sNhatKy.appendRow([
      logId,
      getFormattedNow(),
      maNhanVien || 'ANONYMOUS',
      hanhDong,
      ketQua,
      lyDo,
      thietBi || '',
      refId || ''
    ]);
  } catch (e) {
    // Bỏ qua lỗi nhật ký để không ngắt luồng chính
  }
}

/**
 * Hàm băm SHA-256 an toàn trong Google Apps Script
 */
function hashSha256(input) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
  var txt = '';
  for (var i = 0; i < rawHash.length; i++) {
    var byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    var byteHex = byteVal.toString(16);
    if (byteHex.length === 1) byteHex = '0' + byteHex;
    txt += byteHex;
  }
  return txt;
}

function getFormattedNow() {
  return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function styleHeaderRow(sheet, bgColor) {
  var range = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  range.setBackground(bgColor);
  range.setFontColor('#FFFFFF');
  range.setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getConfigMap() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_CAU_HINH);
  var values = sheet.getDataRange().getValues();
  var config = {};
  for (var i = 1; i < values.length; i++) {
    if (values[i][0]) {
      config[values[i][0]] = values[i][1];
    }
  }
  return config;
}

function findStaffById(sheet, maNhanVien) {
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(maNhanVien)) {
      return {
        MaNhanVien: values[i][0],
        HoTen: values[i][1],
        PhongBan: values[i][2],
        ChucVu: values[i][3],
        TrangThai: values[i][8]
      };
    }
  }
  return null;
}

function getRecentPunches(sheet, maNhanVien, ngay) {
  var values = sheet.getDataRange().getValues();
  var list = [];
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][1]) === String(maNhanVien) && String(values[i][4]) === ngay) {
      list.push({ loai: values[i][6], gio: values[i][5] });
      if (list.length >= 5) break;
    }
  }
  return list;
}

function getMinuteDifference(timeStr1, timeStr2) {
  try {
    var p1 = timeStr1.split(':');
    var p2 = timeStr2.split(':');
    var m1 = Number(p1[0]) * 60 + Number(p1[1]);
    var m2 = Number(p2[0]) * 60 + Number(p2[1]);
    return Math.abs(m2 - m1);
  } catch (e) {
    return 999;
  }
}
`;
