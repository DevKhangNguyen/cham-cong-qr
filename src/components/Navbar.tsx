import React from 'react';
import { ClinicLogo } from './ClinicLogo';
import { Staff } from '../types';
import { LogOut, User, Shield, QrCode } from 'lucide-react';

export type AppView = 'attendance' | 'kiosk' | 'history' | 'admin' | 'gasGuide';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  currentUser: Staff | null;
  onLogout: () => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  currentUser,
  onLogout,
  onOpenLogin,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => onNavigate('attendance')}
          className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 rounded-md py-1"
        >
          <ClinicLogo size={40} />
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wider font-semibold text-sky-800 leading-none">
              Phòng khám Đa khoa
            </span>
            <span className="text-sm font-bold text-slate-900 tracking-tight leading-snug">
              Y Dược Nhã Uyên Cà Mau
            </span>
          </div>
        </button>

        {/* Zone 2: 4-5 Navigation Links (single-line whitespace-nowrap) */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onNavigate('attendance')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              currentView === 'attendance'
                ? 'text-sky-900 bg-sky-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Chấm công
          </button>

          <button
            onClick={() => onNavigate('kiosk')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              currentView === 'kiosk'
                ? 'text-sky-900 bg-sky-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <QrCode className="w-4 h-4 text-sky-600" />
            Màn hình QR
          </button>

          <button
            onClick={() => onNavigate('history')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              currentView === 'history'
                ? 'text-sky-900 bg-sky-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Lịch sử công
          </button>

          <button
            onClick={() => onNavigate('admin')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              currentView === 'admin'
                ? 'text-sky-900 bg-sky-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-4 h-4 text-slate-500" />
            Quản trị {currentUser?.VaiTro === 'Admin' ? '' : '(Admin)'}
          </button>

          <button
            onClick={() => onNavigate('gasGuide')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              currentView === 'gasGuide'
                ? 'text-sky-900 bg-sky-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Google Sheets
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action (User profile & Auth) */}
        <div className="flex items-center gap-3 shrink-0">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                  {currentUser.HoTen}
                </span>
                <span className="text-[11px] text-slate-500 whitespace-nowrap">
                  {currentUser.ChucVu} · {currentUser.PhongBan}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Đăng xuất"
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <LogOut className="w-4 h-4" />
                <span className="sr-only">Đăng xuất</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors whitespace-nowrap shadow-sm"
            >
              Đăng nhập nhân viên
            </button>
          )}
        </div>
      </div>

      {/* Mobile navigation tab strip (under 15% mobile viewport cap) */}
      <div className="md:hidden border-t border-slate-100 bg-slate-50/90 px-3 py-1.5 flex items-center justify-between text-xs overflow-x-auto gap-2">
        <button
          onClick={() => onNavigate('attendance')}
          className={`py-1 px-2.5 rounded whitespace-nowrap ${
            currentView === 'attendance' ? 'font-semibold text-sky-800 bg-sky-100' : 'text-slate-600'
          }`}
        >
          Chấm công
        </button>
        <button
          onClick={() => onNavigate('kiosk')}
          className={`py-1 px-2.5 rounded whitespace-nowrap ${
            currentView === 'kiosk' ? 'font-semibold text-sky-800 bg-sky-100' : 'text-slate-600'
          }`}
        >
          QR Kiosk
        </button>
        <button
          onClick={() => onNavigate('history')}
          className={`py-1 px-2.5 rounded whitespace-nowrap ${
            currentView === 'history' ? 'font-semibold text-sky-800 bg-sky-100' : 'text-slate-600'
          }`}
        >
          Lịch sử
        </button>
        <button
          onClick={() => onNavigate('admin')}
          className={`py-1 px-2.5 rounded whitespace-nowrap ${
            currentView === 'admin' ? 'font-semibold text-sky-800 bg-sky-100' : 'text-slate-600'
          }`}
        >
          Quản trị
        </button>
        <button
          onClick={() => onNavigate('gasGuide')}
          className={`py-1 px-2.5 rounded whitespace-nowrap ${
            currentView === 'gasGuide' ? 'font-semibold text-sky-800 bg-sky-100' : 'text-slate-600'
          }`}
        >
          Hướng dẫn Sheets
        </button>
      </div>
    </header>
  );
};
