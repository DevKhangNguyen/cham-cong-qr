/**
 * Cryptography and security service for QR Attendance
 * Implements salted password hashing, dynamic QR token creation & validation,
 * nonce tracking to prevent replay attacks, and token expiry checking.
 */

import { QRTokenPayload } from '../types';

// Clinic secret key (in production, stored in Google Apps Script Properties)
export const DEFAULT_CLINIC_SECRET = 'NHA_UYEN_CLINIC_SECURE_TOKEN_SECRET_2026';
export const CLINIC_ID = 'PKDK_NHA_UYEN_CAMAU';

// Nonce storage to prevent replay attacks within expiry window
const usedNonces = new Set<string>();

/**
 * Computes SHA-256 hash using Web Crypto API
 */
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates salted password hash
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  return sha256(`${salt}:${password}:${salt}`);
}

/**
 * Generates random hexadecimal string
 */
export function generateRandomHex(bytes = 16): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a signed dynamic QR Token payload
 * Valid for `validitySeconds` (default 45s)
 */
export async function generateDynamicQRToken(
  secret = DEFAULT_CLINIC_SECRET,
  validitySeconds = 45
): Promise<{ tokenString: string; payload: QRTokenPayload; expiresAt: number }> {
  const timestamp = Date.now();
  const nonce = generateRandomHex(8);
  const rawData = `${CLINIC_ID}|${timestamp}|${nonce}|${validitySeconds}`;
  const signature = (await sha256(`${rawData}|${secret}`)).substring(0, 24);

  const payload: QRTokenPayload = {
    token: `NU-${timestamp}-${nonce.substring(0, 6)}`,
    clinicId: CLINIC_ID,
    timestamp,
    nonce,
    checkType: 'Any',
    signature,
  };

  const tokenString = JSON.stringify({
    cid: CLINIC_ID,
    ts: timestamp,
    n: nonce,
    sig: signature,
    v: validitySeconds,
  });

  return {
    tokenString,
    payload,
    expiresAt: timestamp + validitySeconds * 1000,
  };
}

/**
 * Validates a scanned QR token string against current time and secret
 */
export async function validateScannedQR(
  qrText: string,
  secret = DEFAULT_CLINIC_SECRET
): Promise<{ valid: boolean; reason?: string; timestamp?: number; nonce?: string }> {
  try {
    let parsed: any;
    try {
      parsed = JSON.parse(qrText);
    } catch {
      return { valid: false, reason: 'Mã QR không đúng định dạng của phòng khám Nhã Uyên' };
    }

    const { cid, ts, n, sig, v = 45 } = parsed;

    if (cid !== CLINIC_ID) {
      return { valid: false, reason: 'Mã QR không thuộc Phòng khám Đa khoa Nhã Uyên Cà Mau' };
    }

    if (!ts || !n || !sig) {
      return { valid: false, reason: 'Mã QR thiếu tham số bảo mật hợp lệ' };
    }

    const now = Date.now();
    const maxAgeMs = (v + 15) * 1000; // allow small 15s clock drift grace

    if (now - ts > maxAgeMs) {
      return { valid: false, reason: 'Mã QR đã hết hạn sử dụng. Vui lòng quét mã mới trên màn hình' };
    }

    if (ts - now > 10000) {
      return { valid: false, reason: 'Thời gian thiết bị không đồng bộ với hệ thống' };
    }

    // Check replay attack: each nonce can be used once
    if (usedNonces.has(n)) {
      return { valid: false, reason: 'Mã QR này đã được quét trước đó (chống phát lại mã)' };
    }

    // Verify cryptographic signature
    const expectedRaw = `${CLINIC_ID}|${ts}|${n}|${v}`;
    const expectedSig = (await sha256(`${expectedRaw}|${secret}`)).substring(0, 24);

    if (expectedSig !== sig) {
      return { valid: false, reason: 'Chữ ký số QR không hợp lệ hoặc đã bị chỉnh sửa' };
    }

    // Mark nonce as used
    usedNonces.add(n);
    // Cleanup old nonces after 5 minutes
    setTimeout(() => {
      usedNonces.delete(n);
    }, 5 * 60 * 1000);

    return { valid: true, timestamp: ts, nonce: n };
  } catch (err: any) {
    return { valid: false, reason: `Lỗi giải mã QR: ${err.message || 'Không xác định'}` };
  }
}

/**
 * Obtains device and browser info for audit log
 */
export function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';

  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  const platform = isMobile ? 'Mobile' : 'Desktop';
  return `${platform} (${browser}) - ${navigator.language || 'vi-VN'}`;
}
