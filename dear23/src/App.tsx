import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
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

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
