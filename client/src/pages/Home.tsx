import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Shield, ScrollText, Fingerprint } from "lucide-react";

function GeometricBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Deep base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#040d21] via-[#0a1628] to-[#071230]" />

      {/* Shape 1 — large back chevron */}
      <div
        className="animate-geo-drift absolute inset-0 bg-gradient-to-br from-primary-700/50 to-primary-900/30"
        style={{ clipPath: "polygon(0 0, 55% 0, 30% 100%, 0 100%)" }}
      />

      {/* Shape 2 — bright mid chevron */}
      <div
        className="animate-geo-drift-alt absolute inset-0 bg-gradient-to-br from-primary-600/45 to-primary-800/20"
        style={{ clipPath: "polygon(15% 0, 75% 0, 48% 100%, 0 100%)" }}
      />

      {/* Shape 3 — accent, brighter */}
      <div
        className="animate-geo-drift absolute inset-0 bg-gradient-to-b from-primary-500/30 to-primary-700/10"
        style={{ clipPath: "polygon(35% 0, 100% 0, 68% 100%, 12% 100%)" }}
      />

      {/* Shape 4 — lightest, front */}
      <div
        className="animate-geo-drift-alt absolute inset-0 bg-gradient-to-br from-primary-400/15 to-transparent"
        style={{ clipPath: "polygon(55% 0, 100% 0, 100% 45%, 80% 100%, 32% 100%)" }}
      />

      {/* Glowing edge line */}
      <div
        className="animate-glow-pulse absolute inset-0"
        style={{
          clipPath: "polygon(48% 0, 50% 0, 30% 100%, 28% 100%)",
          background: "linear-gradient(to bottom, rgba(96,165,250,0.3), rgba(59,130,246,0.05))",
        }}
      />

      {/* Top light leak */}
      <div className="absolute -top-20 left-1/4 h-[300px] w-[400px] rotate-12 rounded-full bg-primary-500/[0.08] blur-[80px]" />

      {/* Bottom vignette */}
      <div className="absolute bottom-0 left-0 h-1/2 w-full bg-gradient-to-t from-[#040d21]/80 to-transparent" />

      {/* Right edge gradient — bridge to white panel */}
      <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-white/[0.04] to-transparent" />
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-white/[0.04] p-3.5 ring-1 ring-white/[0.06] backdrop-blur-sm transition-colors hover:bg-white/[0.07]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 ring-1 ring-primary-400/10">
        <Icon size={16} className="text-primary-400" />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{desc}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<"login" | "register">("login");

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Panel */}
      <div className="relative hidden w-[48%] flex-col justify-between lg:flex">
        <GeometricBackground />

        <div className="relative z-10 flex flex-1 flex-col justify-center px-12 xl:px-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[420px]"
          >
            {/* Logo */}
            <div className="mb-10 flex items-center gap-4">
              <div className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 text-lg font-extrabold text-white shadow-xl shadow-primary-500/25 ring-1 ring-white/20">
                CC
              </div>
              <div>
                <h1 className="text-[20px] font-extrabold tracking-tight text-white">
                  Secretaría de Cultura
                </h1>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-400/70">
                  Gobierno Municipal
                </p>
              </div>
            </div>

            {/* Hero text */}
            <h2 className="text-[28px] font-extrabold leading-[1.15] tracking-tight text-white xl:text-[34px]">
              Gestión digital de{" "}
              <span className="text-primary-400">servidores públicos</span>
            </h2>

            <p className="mt-4 max-w-[340px] text-[14px] leading-relaxed text-slate-400">
              Registra, consulta y da seguimiento con transparencia y trazabilidad completa.
            </p>

            {/* Feature cards */}
            <div className="mt-8 space-y-2.5">
              <FeatureCard
                icon={Shield}
                title="Seguridad institucional"
                desc="Cifrado de datos y autenticación robusta"
              />
              <FeatureCard
                icon={ScrollText}
                title="Auditoría automática"
                desc="Cada cambio queda registrado con fecha y autor"
              />
              <FeatureCard
                icon={Fingerprint}
                title="Control por roles"
                desc="Permisos granulares según nivel de acceso"
              />
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="relative z-10 px-12 pb-5 xl:px-16">
          <div className="h-px w-full bg-white/[0.06]" />
          <p className="mt-3 text-[10px] font-medium tracking-wide text-slate-600">
            © 2026 Secretaría de Cultura · Plataforma Institucional
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex flex-1 flex-col overflow-y-auto bg-slate-50">
        <div className="flex flex-1 flex-col items-center justify-center px-6 sm:px-12">
          <div className="w-full max-w-[440px]">
            {/* Mobile header */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 lg:hidden"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-extrabold text-white shadow-md shadow-primary-500/20">
                  CC
                </div>
                <div>
                  <h1 className="text-base font-extrabold text-slate-900">Secretaría de Cultura</h1>
                  <p className="text-[11px] font-medium text-slate-400">Sistema de Registro</p>
                </div>
              </div>
            </motion.div>

            {/* Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/50 sm:p-10"
            >
              {/* Title */}
              <h2 className="text-[24px] font-extrabold tracking-tight text-slate-900">
                {tab === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </h2>
              <p className="mt-1 text-[13px] text-slate-400">
                {tab === "login"
                  ? "Accede al sistema con tus credenciales"
                  : "Registra una nueva cuenta de acceso"}
              </p>

              {/* Tabs */}
              <div className="mt-6 mb-6 flex gap-1 rounded-xl bg-slate-100 p-1">
                {(["login", "register"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`relative flex-1 rounded-[10px] py-2.5 text-[13px] font-semibold transition-all duration-300 ${
                      tab === t
                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {t === "login" ? "Iniciar sesión" : "Registrarse"}
                  </button>
                ))}
              </div>

              {/* Forms */}
              <div className="min-h-[380px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  {tab === "login" ? (
                    <LoginForm onSwitchTab={() => setTab("register")} />
                  ) : (
                    <RegisterForm onSuccess={() => setTab("login")} />
                  )}
                </motion.div>
              </AnimatePresence>
              </div>
            </motion.div>

            {/* Mobile footer */}
            <p className="mt-6 text-center text-[10px] text-slate-300 lg:hidden">
              © 2026 Secretaría de Cultura
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormInput({
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  required = true,
  minLength,
}: {
  label: string;
  icon: React.ElementType;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
  minLength?: number;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">
        {label}
      </label>
      <div className={`group relative overflow-hidden rounded-xl border transition-all duration-200 ${
        focused
          ? "border-primary-400 bg-white shadow-md shadow-primary-500/5 ring-[3px] ring-primary-500/10"
          : "border-slate-200 bg-slate-50/80 hover:border-slate-300"
      }`}>
        {/* Colored accent bar on focus */}
        <div className={`absolute left-0 top-0 h-full w-[3px] rounded-l-xl bg-primary-500 transition-opacity duration-200 ${
          focused ? "opacity-100" : "opacity-0"
        }`} />
        <Icon
          size={16}
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
            focused ? "text-primary-500" : "text-slate-300"
          }`}
        />
        <input
          type={inputType}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-transparent py-3 pl-10 pr-10 text-[13px] text-slate-800 placeholder:text-slate-300 focus:outline-none"
          placeholder={placeholder}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 py-3.5 text-[14px] font-bold text-white shadow-lg shadow-primary-500/25 transition-all hover:shadow-xl hover:shadow-primary-500/30 hover:brightness-[1.08] disabled:opacity-50 active:scale-[0.98]"
    >
      {/* Shimmer */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.12] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
      <span className="relative flex items-center gap-2">
        {loading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          children
        )}
      </span>
    </button>
  );
}

function LoginForm({ onSwitchTab }: { onSwitchTab: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email, password, rememberMe });
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message ?? "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-600"
        >
          {error}
        </motion.div>
      )}

      <FormInput
        label="Correo electrónico"
        icon={Mail}
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="correo@ejemplo.com"
      />

      <FormInput
        label="Contraseña"
        icon={Lock}
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="Ingresa tu contraseña"
      />

      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-[12px] text-slate-400">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500/20"
          />
          Recordarme
        </label>
        <Link
          href="/recuperar-contrasena"
          className="text-[12px] font-semibold text-primary-500 hover:text-primary-600 transition-colors"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <SubmitButton loading={loading}>
        Iniciar sesión
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </SubmitButton>

      <p className="text-center text-[12px] text-slate-400">
        ¿No tienes cuenta?{" "}
        <button type="button" onClick={onSwitchTab} className="font-bold text-primary-500 hover:text-primary-600">
          Regístrate
        </button>
      </p>
    </form>
  );
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const { register } = useAuth();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      await register({ nombre, email, password });
      onSuccess();
    } catch (err: any) {
      setError(err.message ?? "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-600"
        >
          {error}
        </motion.div>
      )}

      <FormInput
        label="Nombre completo"
        icon={User}
        value={nombre}
        onChange={setNombre}
        placeholder="Juan Pérez"
      />

      <FormInput
        label="Correo electrónico"
        icon={Mail}
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="correo@ejemplo.com"
      />

      <FormInput
        label="Contraseña"
        icon={Lock}
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="Mínimo 8 caracteres"
        minLength={8}
      />

      <FormInput
        label="Confirmar contraseña"
        icon={Lock}
        type="password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        placeholder="Repetir contraseña"
      />

      <SubmitButton loading={loading}>
        Crear cuenta
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </SubmitButton>

      <p className="text-center text-[12px] text-slate-400">
        ¿Ya tienes cuenta?{" "}
        <button type="button" onClick={onSuccess} className="font-bold text-primary-500 hover:text-primary-600">
          Inicia sesión
        </button>
      </p>
    </form>
  );
}
