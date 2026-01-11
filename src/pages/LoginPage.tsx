import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const navigate = useNavigate();

    const handleLogin = async () => {
        if (!email || !password) return;
        setLoading(true);
        try {
            // ID as Email logic
            const loginEmail = email.includes('@') ? email : `${email}@dear23.app`;

            // Explicitly set persistence to LOCAL
            await setPersistence(auth, browserLocalPersistence);

            await signInWithEmailAndPassword(auth, loginEmail, password);
            navigate('/');
        } catch (error) {
            console.error("Login failed", error);
            alert("로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-background text-primary font-display flex justify-center w-full transition-colors duration-300">
            <div className="relative flex h-screen w-full flex-col overflow-x-hidden max-w-[480px] border-x border-border bg-background">
                <div className="flex items-center p-6 pb-2 justify-end">
                    {/* Placeholder for top actions if needed */}
                </div>

                <div className="px-8 pt-16 pb-20">
                    <h1 className="text-[64px] font-extrabold leading-none tracking-tighter uppercase whitespace-nowrap text-primary">
                        DEAR23
                    </h1>
                </div>

                <div className="flex flex-col px-8 space-y-12">
                    {/* ID Input */}
                    <div className="flex flex-col">
                        <label className="text-[10px] uppercase tracking-[0.2em] font-bold mb-1 opacity-40 font-sans text-text-secondary">
                            아이디
                        </label>
                        <input
                            className="w-full bg-transparent border-t-0 border-x-0 border-b border-primary py-4 px-0 text-lg font-medium placeholder:text-text-secondary/30 focus:outline-none focus:border-b-2 focus:ring-0 transition-all font-sans text-primary"
                            placeholder="ID"
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    {/* Password Input */}
                    <div className="flex flex-col relative">
                        <label className="text-[10px] uppercase tracking-[0.2em] font-bold mb-1 opacity-40 font-sans text-text-secondary">
                            비밀번호
                        </label>
                        <div className="relative">
                            <input
                                className="w-full bg-transparent border-t-0 border-x-0 border-b border-primary py-4 pr-10 px-0 text-lg font-medium placeholder:text-text-secondary/30 focus:outline-none focus:border-b-2 focus:ring-0 transition-all font-sans text-primary"
                                placeholder="••••••••"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            />
                            <button className="absolute right-0 bottom-4 text-text-secondary hover:text-primary transition-colors">
                                <span className="material-symbols-outlined text-[20px]">visibility</span>
                            </button>
                        </div>
                    </div>

                    {/* Login Button */}
                    <div className="pt-8">
                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full bg-primary text-background py-5 text-lg font-bold tracking-[0.4em] uppercase hover:opacity-90 rounded-xl transition-opacity font-sans disabled:opacity-50"
                        >
                            {loading ? '로그인 중...' : '로 그 인'}
                        </button>
                    </div>
                </div>

                <div className="flex-grow"></div>

                {/* Signup Link */}
                <div className="flex justify-center px-8 pb-12 pt-8 border-t border-border mt-20">
                    <Link
                        to="/signup"
                        className="text-[11px] uppercase tracking-[0.15em] font-medium border-b border-transparent hover:border-primary pb-0.5 font-sans text-text-secondary hover:text-primary"
                    >
                        회원가입
                    </Link>
                </div>

                {/* Decoration */}
                <div className="absolute top-0 right-0 -z-10 opacity-5 pointer-events-none">
                    <div className="w-64 h-64 bg-primary rounded-full blur-[120px]"></div>
                </div>
            </div>
        </div>
    );
};
