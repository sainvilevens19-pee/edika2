import { NavLink, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  Calendar,
  Bell,
  Settings,
  LogOut,
  School,
  UserCheck,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Tableau de bord',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['SUPER_ADMIN', 'DIRECTOR', 'CENSOR', 'SECRETARY', 'TEACHER', 'STUDENT', 'PARENT'],
  },
  {
    to: '/users',
    label: 'Utilisateurs',
    icon: <Users className="w-5 h-5" />,
    roles: ['SUPER_ADMIN', 'DIRECTOR', 'CENSOR', 'SECRETARY'],
  },
  {
    to: '/schools',
    label: 'Écoles',
    icon: <School className="w-5 h-5" />,
    roles: ['SUPER_ADMIN'],
  },
  {
    to: '/classes',
    label: 'Classes',
    icon: <BookOpen className="w-5 h-5" />,
    roles: ['SUPER_ADMIN', 'DIRECTOR', 'CENSOR', 'SECRETARY', 'TEACHER'],
  },
  {
    to: '/grades',
    label: 'Notes',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['SUPER_ADMIN', 'DIRECTOR', 'CENSOR', 'TEACHER', 'STUDENT', 'PARENT'],
  },
  {
    to: '/attendance',
    label: 'Présences',
    icon: <UserCheck className="w-5 h-5" />,
    roles: ['SUPER_ADMIN', 'DIRECTOR', 'CENSOR', 'SECRETARY', 'TEACHER', 'STUDENT', 'PARENT'],
  },
  {
    to: '/schedule',
    label: 'Emploi du temps',
    icon: <Calendar className="w-5 h-5" />,
    roles: ['SUPER_ADMIN', 'DIRECTOR', 'CENSOR', 'TEACHER', 'STUDENT', 'PARENT'],
  },
  {
    to: '/announcements',
    label: 'Annonces',
    icon: <Bell className="w-5 h-5" />,
    roles: ['SUPER_ADMIN', 'DIRECTOR', 'CENSOR', 'SECRETARY', 'TEACHER', 'STUDENT', 'PARENT'],
  },
  {
    to: '/settings',
    label: 'Paramètres',
    icon: <Settings className="w-5 h-5" />,
    roles: ['SUPER_ADMIN', 'DIRECTOR'],
  },
];

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  DIRECTOR: 'Directeur',
  CENSOR: 'Censeur',
  SECRETARY: 'Secrétaire',
  TEACHER: 'Professeur',
  STUDENT: 'Élève',
  PARENT: 'Parent',
};

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="flex flex-col h-full w-64 bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
        <GraduationCap className="w-8 h-8 text-primary-400" />
        <div>
          <p className="font-bold text-lg leading-tight">Edika²</p>
          {user.school && (
            <p className="text-xs text-gray-400 truncate max-w-[140px]">{user.school.name}</p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            <ChevronRight className="w-4 h-4 opacity-40" />
          </NavLink>
        ))}
      </nav>

      {/* Profil utilisateur */}
      <div className="border-t border-gray-700 px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-400">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
