import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Plus, X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const baseSchema = z.object({
  role: z.enum(['PARENT', 'TEACHER']),
  email: z.string().email('Email invalide'),
  password: z
    .string()
    .min(8, 'Au moins 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[a-z]/, 'Au moins une minuscule')
    .regex(/\d/, 'Au moins un chiffre'),
  firstName: z.string().min(2, 'Prénom requis'),
  lastName: z.string().min(2, 'Nom requis'),
  phone: z.string().optional(),
  // Teacher only
  specialization: z.string().optional(),
  // Parent only — dossiers des enfants
  childrenDossiers: z
    .array(z.object({ value: z.string().min(1, 'Numéro requis') }))
    .optional(),
});

type FormData = z.infer<typeof baseSchema>;

export default function Register() {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(baseSchema),
    defaultValues: { role: 'PARENT', childrenDossiers: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'childrenDossiers',
  });

  const role = watch('role');

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      await authRegister({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        specialization: data.specialization,
        childrenDossiers: data.childrenDossiers?.map((d) => d.value).filter(Boolean),
      });
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message ?? 'Erreur lors de la création du compte';
      setServerError(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-700 flex-col justify-center items-center px-16 text-white">
        <GraduationCap className="w-20 h-20 mb-6" />
        <h1 className="text-4xl font-bold mb-4">Edika²</h1>
        <p className="text-primary-100 text-lg text-center max-w-sm">
          Rejoignez la communauté scolaire numérique
        </p>
      </div>

      {/* Formulaire */}
      <div className="flex flex-1 flex-col justify-center px-8 sm:px-16 lg:px-24 py-12 overflow-y-auto">
        <div className="w-full max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Créer un compte</h2>
          <p className="text-gray-500 mb-6 text-sm">
            Réservé aux parents et professeurs
          </p>

          {serverError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Sélection du rôle */}
            <div className="grid grid-cols-2 gap-3">
              {(['PARENT', 'TEACHER'] as const).map((r) => (
                <label
                  key={r}
                  className={`flex flex-col items-center justify-center rounded-xl border-2 p-4 cursor-pointer transition-all ${
                    role === r
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    value={r}
                    className="sr-only"
                    {...register('role')}
                  />
                  <span className="text-2xl mb-1">{r === 'PARENT' ? '👨‍👩‍👧' : '👨‍🏫'}</span>
                  <span className="text-sm font-semibold">
                    {r === 'PARENT' ? 'Parent' : 'Professeur'}
                  </span>
                  <span className="text-xs text-center mt-0.5 opacity-70">
                    {r === 'PARENT' ? 'Suivez vos enfants' : 'Gérez vos classes'}
                  </span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.firstName ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="Ibrahima"
                  {...register('firstName')}
                />
                {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.lastName ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="Diallo"
                  {...register('lastName')}
                />
                {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.email ? 'border-red-400' : 'border-gray-300'}`}
                placeholder="vous@exemple.com"
                {...register('email')}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                type="tel"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="+221 7X XXX XX XX"
                {...register('phone')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.password ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="••••••••"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {/* Champ Spécialisation pour Professeur */}
            {role === 'TEACHER' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Spécialisation</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Mathématiques, Physique..."
                  {...register('specialization')}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Votre compte sera créé. Un directeur vous assignera à son école.
                </p>
              </div>
            )}

            {/* Numéros de dossier enfants pour Parent */}
            {role === 'PARENT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numéros de dossier de vos enfants
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  Facultatif — vous pourrez en ajouter plus tard depuis votre espace.
                </p>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 mb-2">
                    <input
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="DOS-2024-001"
                      {...register(`childrenDossiers.${index}.value`)}
                    />
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => append({ value: '' })}
                  className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  <Plus className="w-4 h-4" /> Ajouter un enfant
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 transition-colors mt-2"
            >
              {isSubmitting ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Déjà un compte ?{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
