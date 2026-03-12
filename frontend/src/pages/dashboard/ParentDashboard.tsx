import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, BookOpen, UserCheck, GraduationCap, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';

const linkSchema = z.object({
  dossierNumber: z.string().min(1, 'Numéro de dossier requis'),
  relationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'PARENT']),
});
type LinkForm = z.infer<typeof linkSchema>;

export default function ParentDashboard() {
  const { user, refreshUser } = useAuth();
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LinkForm>({
    resolver: zodResolver(linkSchema),
    defaultValues: { relationship: 'PARENT' },
  });

  const children = user?.parentProfile?.children ?? [];

  const onLink = async (data: LinkForm) => {
    setLinkError('');
    setLinkSuccess('');
    try {
      await api.post('/users/me/link-child', data);
      setLinkSuccess('Enfant lié avec succès !');
      reset();
      setShowLinkForm(false);
      await refreshUser();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erreur lors de la liaison';
      setLinkError(typeof msg === 'string' ? msg : (msg as string[])[0]);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, {user?.firstName} 👋
        </h1>
        <p className="text-gray-500 mt-1">Espace parent — Suivez la scolarité de vos enfants</p>
      </div>

      {/* Bannière si aucun enfant lié */}
      {children.length === 0 && !showLinkForm && (
        <div className="mb-6 rounded-xl border-2 border-dashed border-primary-300 bg-primary-50 p-6 text-center">
          <GraduationCap className="w-12 h-12 text-primary-400 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-800 mb-1">Aucun enfant lié</h3>
          <p className="text-sm text-gray-500 mb-4">
            Ajoutez vos enfants en entrant leur numéro de dossier scolaire
          </p>
          <button
            onClick={() => setShowLinkForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" /> Lier un enfant
          </button>
        </div>
      )}

      {/* Messages de feedback */}
      {linkSuccess && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {linkSuccess}
        </div>
      )}
      {linkError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {linkError}
        </div>
      )}

      {/* Formulaire de liaison */}
      {showLinkForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Lier un enfant</h3>
          <form onSubmit={handleSubmit(onLink)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro de dossier
              </label>
              <input
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.dossierNumber ? 'border-red-400' : 'border-gray-300'}`}
                placeholder="DOS-2024-001"
                {...register('dossierNumber')}
              />
              {errors.dossierNumber && (
                <p className="mt-1 text-xs text-red-500">{errors.dossierNumber.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lien</label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                {...register('relationship')}
              >
                <option value="FATHER">Père</option>
                <option value="MOTHER">Mère</option>
                <option value="GUARDIAN">Tuteur / Tutrice</option>
                <option value="PARENT">Parent</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {isSubmitting ? 'Liaison...' : 'Lier cet enfant'}
              </button>
              <button
                type="button"
                onClick={() => setShowLinkForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des enfants */}
      {children.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Mes enfants ({children.length})</h2>
            <button
              onClick={() => setShowLinkForm(true)}
              className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {children.map(({ student, relationship }) => (
              <div
                key={student.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {student.user.firstName} {student.user.lastName}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Dossier : {student.dossierNumber}
                    </p>
                  </div>
                  <span className="inline-flex rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                    {relationship}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {student.school.name}
                </div>

                <div className="flex gap-2">
                  <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                    <BookOpen className="w-3.5 h-3.5" /> Notes
                  </button>
                  <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                    <UserCheck className="w-3.5 h-3.5" /> Présences
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
