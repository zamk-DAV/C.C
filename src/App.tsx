import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';

import { DataProvider } from './context/DataContext';
import { HomePage } from './pages/HomePage';
import { ChatPage } from './pages/ChatPage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { ConnectPage } from './pages/ConnectPage';
import { SettingsPage } from './pages/SettingsPage';
import { MailboxPage } from './pages/MailboxPage';
import { DiaryPage } from './pages/DiaryPage';
import { CalendarPage } from './pages/CalendarPage';
import './index.css';

import { useAuth } from './context/AuthContext';
import { LockScreen } from './components/common/LockScreen';

function AppContent() {
  const { isLocked, loading } = useAuth();

  if (loading) return null;

  if (isLocked) {
    return <LockScreen />;
  }

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        {/* Future routes */}
        <Route path="/diary" element={<DiaryPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/mailbox" element={<MailboxPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/connect" element={<ConnectPage />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <DataProvider>
            <AppContent />
          </DataProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

// Placeholder for other pages
// const PlaceholderPage = ({ title }: { title: string }) => (
//   <div className="flex items-center justify-center min-h-[60vh]">
//     <p className="text-2xl font-bold opacity-20">{title}</p>
//   </div>
// );

export default App;
