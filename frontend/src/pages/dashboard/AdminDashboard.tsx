import { useEffect, useState } from 'react';
import { Users, GraduationCap, BookOpen, UserCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  DIRECTOR: 'Directeur',
  CENSOR: 'Censeur',
  SECRETARY: 'Secrétaire',
};

interface Stats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  // Stats seront chargées via les vrais endpoints dans les prochains modules
  const [stats] = useState<Stats>({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
  });

  const cards = [
    {
      label: 'Utilisateurs',
      value: stats.totalUsers,
      icon: <Users className="w-6 h-6 text-blue-600" />,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    },
    {
      label: 'Élèves',
      value: stats.totalStudents,
      icon: <GraduationCap className="w-6 h-6 text-green-600" />,
      bg: 'bg-green-50',
      border: 'border-green-200',
    },
    {
      label: 'Professeurs',
      value: stats.totalTeachers,
      icon: <BookOpen className="w-6 h-6 text-purple-600" />,
      bg: 'bg-purple-50',
      border: 'border-purple-200',
    },
    {
      label: 'Classes',
      value: stats.totalClasses,
      icon: <UserCheck className="w-6 h-6 text-orange-600" />,
      bg: 'bg-orange-50',
      border: 'border-orange-200',
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, {user?.firstName} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {ROLE_LABELS[user?.role ?? ''] ?? user?.role} —{' '}
          {user?.school?.name ?? 'Plateforme globale'}
        </p>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border ${card.border} ${card.bg} p-5`}
          >
            <div className="flex items-center justify-between mb-2">
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Accès rapides */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Accès rapides</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Gérer les utilisateurs', to: '/users', emoji: '👥' },
            { label: 'Gérer les classes', to: '/classes', emoji: '🏫' },
            { label: 'Saisir les notes', to: '/grades', emoji: '📊' },
            { label: 'Présences', to: '/attendance', emoji: '✅' },
            { label: 'Emploi du temps', to: '/schedule', emoji: '📅' },
            { label: 'Annonces', to: '/announcements', emoji: '📢' },
          ].map((item) => (
            <a
              key={item.to}
              href={item.to}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <span className="text-lg">{item.emoji}</span>
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
