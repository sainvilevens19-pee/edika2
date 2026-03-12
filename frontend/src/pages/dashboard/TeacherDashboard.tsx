import { Clock, School, BookOpen, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const assignments = user?.teacherProfile?.assignments ?? [];
  const activeAssignments = assignments.filter((a) => a.isActive);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, {user?.firstName} 👋
        </h1>
        <p className="text-gray-500 mt-1">Espace professeur</p>
      </div>

      {/* Alerte si pas encore assigné */}
      {activeAssignments.length === 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-4">
          <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800 mb-1">En attente d'assignation</h3>
            <p className="text-sm text-amber-700">
              Votre compte est créé. Pour accéder aux données d'une école, un directeur doit vous
              assigner à son établissement et à vos classes/matières.
            </p>
          </div>
        </div>
      )}

      {/* Spécialisation */}
      {user?.teacherProfile?.specialization && (
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-50 border border-primary-200 px-4 py-1.5 text-sm text-primary-700 font-medium">
          <BookOpen className="w-4 h-4" />
          {user.teacherProfile.specialization}
        </div>
      )}

      {/* Assignations actives */}
      {activeAssignments.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Mes assignations ({activeAssignments.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeAssignments.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                    <School className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{a.school.name}</h3>
                    <p className="text-xs text-gray-400">{a.school.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  Année {a.academicYear.label}
                  {a.academicYear.isCurrent && (
                    <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      En cours
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
