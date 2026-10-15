import React, { useState, useEffect } from 'react';
import { Staff } from './types';
import { gasService, INITIAL_STAFF_SEEDS } from './services/gasService';
import { Navbar, AppView } from './components/Navbar';
import { StaffAttendance } from './components/StaffAttendance';
import { QRKioskDisplay } from './components/QRKioskDisplay';
import { AttendanceHistory } from './components/AttendanceHistory';
import { AdminDashboard } from './components/AdminDashboard';
import { GoogleAppsScriptGuide } from './components/GoogleAppsScriptGuide';
import { LoginModal } from './components/LoginModal';
import { ClinicLogo } from './components/ClinicLogo';
import { MapPin, Shield, HeartPulse, HelpCircle } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('attendance');
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Initialize session: if no user is saved, default to Doctor BS.CKI Nguyễn Văn An for instant testability
  useEffect(() => {
    let saved = gasService.getCurrentUser();
    if (!saved) {
      // Default initial staff for immediate interactive evaluation
      const defaultDoctor = INITIAL_STAFF_SEEDS[1]; // BS.CKI Nguyễn Văn An
      gasService.setCurrentUser(defaultDoctor);
      saved = defaultDoctor;
    }
    setCurrentUser(saved);
  }, []);

  const handleLogout = () => {
    gasService.setCurrentUser(null);
    setCurrentUser(null);
    setIsLoginModalOpen(true);
  };

  const handleLoginSuccess = (user: Staff) => {
    setCurrentUser(user);
    if (user.VaiTro === 'Admin') {
      setCurrentView('admin');
    } else {
      setCurrentView('attendance');
    }
  };

  const handleNavigate = (view: AppView) => {
    if (view === 'admin' && currentUser?.VaiTro !== 'Admin') {
      window.alert('Bạn không có quyền quản trị.');
      return;
    }
    setCurrentView(view);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-sky-100 selection:text-sky-900">
      {/* Top Bar adhering to Top Bar Contract */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {currentUser ? (
          <>
            {currentView === 'attendance' && (
              <StaffAttendance
                currentUser={currentUser}
                onOpenKiosk={() => setCurrentView('kiosk')}
                onNavigateHistory={() => setCurrentView('history')}
              />
            )}

            {currentView === 'kiosk' && (
              <QRKioskDisplay onBackToAttendance={() => setCurrentView('attendance')} />
            )}

            {currentView === 'history' && (
              <AttendanceHistory currentUser={currentUser} />
            )}

            {currentView === 'admin' && (
              <AdminDashboard currentUser={currentUser} />
            )}

            {currentView === 'gasGuide' && (
              <GoogleAppsScriptGuide />
            )}
          </>
        ) : (
          <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 text-center shadow-sm space-y-4">
            <ClinicLogo size={70} className="justify-center" />
            <h2 className="text-lg font-bold text-slate-900">
              Vui lòng đăng nhập để chấm công
            </h2>
            <p className="text-xs text-slate-500">
              Hệ thống chấm công QR Code & Google Sheets Phòng khám Đa khoa Y Dược Nhã Uyên Cà Mau
            </p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg shadow-2xs"
            >
              Mở cửa sổ đăng nhập
            </button>
          </div>
        )}
      </main>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <ClinicLogo size={28} />
            <div>
              <span className="font-bold text-slate-800">
                Phòng khám Đa khoa Y Dược Nhã Uyên Cà Mau
              </span>
              <p className="text-[11px] text-slate-500">
                Ấp 5, xã Thới Bình, tỉnh Cà Mau · Múi giờ Asia/Ho_Chi_Minh (GMT+7)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Đồng bộ Google Sheets</span>
            <span aria-hidden="true">·</span>
            <span>QR Code động chống gian lận</span>
            <span aria-hidden="true">·</span>
            <span>Định vị GPS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
