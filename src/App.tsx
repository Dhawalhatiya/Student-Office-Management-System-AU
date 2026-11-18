import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { StaffGuard, StudentGuard } from './components/RouteGuards';
import { AuthProvider } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { StaffAccessDenied } from './pages/staff/StaffAccessDenied';
import { StaffDashboard } from './pages/staff/StaffDashboard';
import { StaffNotifications } from './pages/staff/StaffNotifications';
import {
  StaffAiAssistantPage,
  StaffDocumentsPage,
  StaffFeesPage,
  StaffReportsPage,
  StaffRequestsPage,
  StaffResultsPage,
  StaffScholarshipsPage,
  StaffStudentsPage,
} from './pages/staff/StaffPlannedSections';
import { StaffSettings } from './pages/staff/StaffSettings';
import { StaffStudentSearch } from './pages/staff/StaffStudentSearch';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentFaqs } from './pages/student/StudentFaqs';
import { StudentNotifications } from './pages/student/StudentNotifications';
import {
  StudentDocumentsPage,
  StudentFeesPage,
  StudentRequestsPage,
  StudentResultsPage,
  StudentScholarshipsPage,
} from './pages/student/StudentPlannedSections';
import { StudentProfile } from './pages/student/StudentProfile';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Student Portal Routes */}
          <Route path="/student" element={<StudentGuard />}>
            <Route index element={<StudentDashboard />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route path="fees" element={<StudentFeesPage />} />
            <Route path="results" element={<StudentResultsPage />} />
            <Route path="requests" element={<StudentRequestsPage />} />
            <Route path="documents" element={<StudentDocumentsPage />} />
            <Route path="scholarships" element={<StudentScholarshipsPage />} />
            <Route path="notifications" element={<StudentNotifications />} />
            <Route path="faqs" element={<StudentFaqs />} />
          </Route>

          {/* Administrative Staff Portal Routes */}
          <Route path="/staff" element={<StaffGuard />}>
            <Route index element={<StaffDashboard />} />
            <Route path="search" element={<StaffStudentSearch />} />
            <Route path="students" element={<StaffStudentsPage />} />
            <Route path="fees" element={<StaffFeesPage />} />
            <Route path="results" element={<StaffResultsPage />} />
            <Route path="requests" element={<StaffRequestsPage />} />
            <Route path="documents" element={<StaffDocumentsPage />} />
            <Route path="scholarships" element={<StaffScholarshipsPage />} />
            <Route path="reports" element={<StaffReportsPage />} />
            <Route path="ai-assistant" element={<StaffAiAssistantPage />} />
            <Route path="notifications" element={<StaffNotifications />} />
            <Route path="settings" element={<StaffSettings />} />
            <Route path="access-denied" element={<StaffAccessDenied />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
