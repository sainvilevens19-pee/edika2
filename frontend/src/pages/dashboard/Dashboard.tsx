import { useAuth } from '../../contexts/AuthContext';
import ParentDashboard from './ParentDashboard';
import TeacherDashboard from './TeacherDashboard';
import AdminDashboard from './AdminDashboard';
import StudentDashboard from './StudentDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;

  switch (user.role) {
    case 'PARENT':    return <ParentDashboard />;
    case 'TEACHER':   return <TeacherDashboard />;
    case 'STUDENT':   return <StudentDashboard />;
    case 'DIRECTOR':
    case 'CENSOR':
    case 'SECRETARY':
    case 'SUPER_ADMIN':
      return <AdminDashboard />;
    default:
      return null;
  }
}
