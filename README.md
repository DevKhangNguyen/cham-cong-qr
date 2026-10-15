# Chấm Công QR - PKĐK Y Dược Nhã Uyên Cà Mau

Hệ thống chấm công nhân viên bằng **QR Code động** chống gian lận, xác thực GPS và đồng bộ Google Sheets.

## Yêu cầu

- **Node.js** 18 trở lên (khuyến nghị 20+)
- **VS Code** (hoặc bất kỳ editor nào)
- Trình duyệt Chrome / Edge / Firefox

## Cách chạy trên VS Code (máy tính của bạn)

### 1. Giải nén project
Giải nén file ZIP vào thư mục bất kỳ, ví dụ: `D:\cham-cong-qr`

### 2. Mở bằng VS Code
- Mở VS Code → **File → Open Folder** → chọn thư mục vừa giải nén

### 3. Cài đặt dependencies
Mở Terminal trong VS Code (`Ctrl + `` ` hoặc menu Terminal → New Terminal) rồi chạy:

```bash
npm install
```

> Nếu gặp lỗi peer dependency, dùng:
> ```bash
> npm install --legacy-peer-deps
> ```

### 4. Chạy ứng dụng

```bash
npm run dev
```

Sau đó mở trình duyệt vào địa chỉ hiện ra (thường là):

**http://localhost:3000**

### 5. Tài khoản mặc định để test

| Vai trò       | Tên đăng nhập | Mật khẩu   |
|---------------|---------------|------------|
| Admin         | `admin`       | `Admin@123`|
| Bác sĩ        | `bs.an`       | `123456`   |
| Bác sĩ        | `bs.minh`     | `123456`   |
| Điều dưỡng    | `dd.hoa`      | `123456`   |
| Kỹ thuật viên | `ktv.tu`      | `123456`   |
| Lễ tân        | `lt.nga`      | `123456`   |

Ứng dụng sẽ tự đăng nhập bằng tài khoản bác sĩ mặc định khi mở lần đầu.

## Các lệnh hữu ích

| Lệnh              | Mô tả                          |
|-------------------|--------------------------------|
| `npm run dev`     | Chạy môi trường development    |
| `npm run build`   | Build production               |
| `npm run preview` | Xem bản build production       |
| `npm run lint`    | Kiểm tra TypeScript            |

## Tính năng chính

- Quét QR Code động để chấm công (Vào ca / Ra ca)
- Xác thực vị trí GPS so với tọa độ phòng khám
- Chế độ Kiosk hiển thị QR trên màn hình lớn
- Dashboard quản trị (Admin)
- Lịch sử chấm công
- Hướng dẫn tích hợp Google Apps Script + Google Sheets
- Dữ liệu được lưu localStorage (simulator) — có thể kết nối GAS thật

## Cấu trúc thư mục

```
├── src/
│   ├── components/     # Các component UI
│   ├── services/       # Logic gasService, crypto, geo
│   ├── types/          # TypeScript types
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Ghi chú

- Không cần API key Gemini (đã loại bỏ dependency không dùng).
- Ứng dụng chạy hoàn toàn offline với dữ liệu giả lập.
- Để kết nối Google Sheets thật, vào tab **Hướng dẫn GAS** trong app và làm theo.
