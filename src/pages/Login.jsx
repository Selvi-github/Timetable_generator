import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, BookOpen, GraduationCap, Lock, Mail, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const [role, setRole] = useState('student');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const roles = [
        { id: 'student', label: 'Student', icon: GraduationCap },
        { id: 'teacher', label: 'Faculty', icon: BookOpen },
        { id: 'hod', label: 'Admin', icon: User },
    ];

    const { login, isAuthenticated } = useUser();

    React.useEffect(() => {
        if (isAuthenticated) navigate('/home');
    }, [isAuthenticated, navigate]);

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        setTimeout(() => {
            let isValid = false;
            let userData = null;

            if (role === 'student' && email === 'student@admin' && password === 'student@admin') {
                isValid = true; userData = { role: 'student', name: 'Student User', email };
            }
            if (role === 'teacher' && email === 'staff@admin' && password === 'staff@admin') {
                isValid = true; userData = { role: 'teacher', name: 'Staff Member', email };
            }
            if (role === 'hod' && email === 'hod@admin' && password === 'hod@admin') {
                isValid = true; userData = { role: 'hod', name: 'System Administrator', email };
            }

            if (isValid) {
                setSuccess(true);
                login(userData);
                setTimeout(() => navigate('/home'), 800);
            } else {
                setError('Invalid credentials supplied for this role.');
                setLoading(false);
            }
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4 relative overflow-hidden font-sans">
            
            {/* Ultra Modern Multicolor Mesh Background */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-[30%] -left-[10%] w-[120%] h-[120%] opacity-40 blur-[120px]"
                    style={{
                        background: 'conic-gradient(from 90deg at 50% 50%, #FF0080 -10%, #E83B81 10%, #7928CA 40%, #0070F3 70%, #00F0FF 100%)'
                    }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-full max-w-md bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.06)] relative z-10 border border-white p-8"
            >
                <div className="text-center mb-10">
                    <motion.div 
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                        className="w-16 h-16 mx-auto bg-gradient-to-tr from-violet-600 to-fuchsia-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-fuchsia-500/30"
                    >
                        <Sparkles className="w-8 h-8 text-white" />
                    </motion.div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Welcome Back</h2>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Kamaraj Access Portal</p>
                </div>

                <div className="mb-8 bg-slate-100/50 p-1.5 rounded-2xl flex items-center backdrop-blur-sm border border-white/50">
                    {roles.map((r) => (
                        <button
                            key={r.id}
                            onClick={() => { setRole(r.id); setError(''); setSuccess(false); }}
                            className={`flex-1 relative py-2.5 text-sm font-bold rounded-xl transition-all ${role === r.id ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {role === r.id && (
                                <motion.div layoutId="role-pill" className="absolute inset-0 bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-slate-200" transition={{ type: "spring", stiffness: 300, damping: 25 }} />
                            )}
                            <div className="relative z-10 flex items-center justify-center gap-2">
                                <r.icon className="w-4 h-4" />
                                {r.label}
                            </div>
                        </button>
                    ))}
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Identity</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-white/50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 hover:bg-white transition-all text-sm font-semibold shadow-sm"
                                placeholder={`${role}@admin`}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Security Key</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-white/50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 hover:bg-white transition-all text-sm font-semibold shadow-sm"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <AnimatePresence mode='wait'>
                        {error && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="text-red-500 text-xs bg-red-50 p-3 rounded-xl font-bold border border-red-100 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>{error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        type="submit"
                        disabled={loading || success}
                        className={`w-full mt-4 flex items-center justify-center py-4 px-4 rounded-2xl text-sm font-extrabold uppercase tracking-widest transition-all focus:outline-none relative overflow-hidden group
                            ${success ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-xl shadow-fuchsia-500/20 hover:scale-[1.02]'}
                            ${loading ? 'opacity-90 cursor-wait' : ''}
                        `}
                    >
                        {!success && !loading && (
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0"></div>
                        )}
                        <span className="relative z-10 flex items-center justify-center">
                            {loading ? (
                                <svg className="animate-spin h-5 w-5 text-white/70" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : success ? (
                                <><CheckCircle2 className="w-5 h-5 mr-2" /> Authorized</>
                            ) : (
                                <>Authenticate <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                            )}
                        </span>
                    </button>
                </form>

            </motion.div>
        </div>
    );
};

export default Login;
