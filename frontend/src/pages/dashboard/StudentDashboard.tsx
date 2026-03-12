import { BookOpen, UserCheck, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function StudentDashboard() {
  const { user } = useAuth();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, {user?.firstName} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Espace élève — {user?.school?.name}
        </p>
        {user?.studentProfile && (
          <span className="inline-flex items-center mt-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            Dossier : {user.studentProfile.dossierNumber}
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Mes notes', icon: <BookOpen className="w-7 h-7 text-blue-500" />, bg: 'bg-blue-50', href: '/grades' },
          { label: 'Mes présences', icon: <UserCheck className="w-7 h-7 text-green-500" />, bg: 'bg-green-50', href: '/attendance' },
          { label: 'Emploi du temps', icon: <Calendar className="w-7 h-7 text-purple-500" />, bg: 'bg-purple-50', href: '/schedule' },
        ].map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={`rounded-xl ${item.bg} border border-gray-100 p-6 flex flex-col items-center gap-3 hover:shadow-md transition-shadow`}
          >
            {item.icon}
            <span className="font-medium text-gray-800">{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
