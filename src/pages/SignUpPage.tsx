import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export const SignUpPage: React.FC = () => {
    const navigate = useNavigate();
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !password || !confirmPassword) {
            alert("모든 필드를 입력해주세요.");
            return;
        }
        if (password !== confirmPassword) {
            alert("비밀번호가 일치하지 않습니다.");
            return;
        }

        setLoading(true);
        try {
            // ID as Email logic
            const signupEmail = email.includes('@') ? email : `${email}@dear23.app`;

            // 1. Create User
            const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, password);
            const user = userCredential.user;

            // 2. Add to Firestore 'users' collection with minimal data
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                displayName: name,
                email: signupEmail,
                photoURL: null,
                coupleId: null,
                notionConfig: { apiKey: null, databaseId: null },
                bgImage: null
            });

            console.log("Signup successful", user.uid);
            // Default redirect to home/connect
            navigate('/');
        } catch (error: any) {
            console.error("Signup failed", error);
            if (error.code === 'auth/email-already-in-use') {
                alert("이미 사용 중인 아이디입니다.");
            } else {
                alert(`가입 실패: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-background-light dark:bg-background-dark text-primary dark:text-white font-display flex flex-col items-center w-full">
            <div className="relative flex h-screen w-full flex-col overflow-x-hidden max-w-[480px] bg-white border-x border-gray-100 dark:border-zinc-800">
                {/* Header */}
                <header className="flex items-center justify-between px-6 py-6">
                    <div className="flex items-center">
                        <span
                            onClick={() => navigate(-1)}
                            className="material-symbols-outlined text-primary dark:text-white text-2xl cursor-pointer opacity-80"
                        >
                            chevron_left
                        </span>
                    </div>
                    <div className="hidden text-[10px] uppercase tracking-[0.25em] font-bold opacity-30">Vol. 01 / Registration</div>
                    <div className="w-6"></div>
                </header>

                <main className="flex-1 px-8 pt-8 pb-10 flex flex-col">
                    <section className="mb-14">
                        <span className="hidden text-[10px] font-bold uppercase tracking-[0.3em] block mb-3 opacity-40">The Beginning</span>
                        <h1 className="text-4xl font-bold tracking-tight leading-tight text-primary dark:text-white font-sans">시작하기</h1>
                    </section>

                    <form className="flex-1 space-y-10" onSubmit={handleSignUp}>
                        {/* Name Input */}
                        <div className="group">
                            <label className="block text-[11px] font-bold mb-1 opacity-40 font-sans">이름</label>
                            <input
                                className="w-full bg-transparent border-t-0 border-l-0 border-r-0 border-b border-primary/10 dark:border-white/10 soft-input focus:border-primary dark:focus:border-white focus:ring-0 px-0 py-3 text-[16px] placeholder:text-gray-300 dark:placeholder:text-gray-700 font-sans transition-all"
                                placeholder="이름을 입력하세요"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        {/* ID Input */}
                        <div className="group">
                            <label className="block text-[11px] font-bold mb-1 opacity-40 font-sans">아이디</label>
                            <input
                                className="w-full bg-transparent border-t-0 border-l-0 border-r-0 border-b border-primary/10 dark:border-white/10 soft-input focus:border-primary dark:focus:border-white focus:ring-0 px-0 py-3 text-[16px] placeholder:text-gray-300 dark:placeholder:text-gray-700 font-sans transition-all"
                                placeholder="아이디를 입력하세요"
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        {/* Password Input */}
                        <div className="group relative">
                            <label className="block text-[11px] font-bold mb-1 opacity-40 font-sans">비밀번호</label>
                            <div className="relative">
                                <input
                                    className="w-full bg-transparent border-t-0 border-l-0 border-r-0 border-b border-primary/10 dark:border-white/10 soft-input focus:border-primary dark:focus:border-white focus:ring-0 px-0 py-3 text-[16px] placeholder:text-gray-300 dark:placeholder:text-gray-700 font-sans transition-all"
                                    placeholder="비밀번호를 입력하세요"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-primary/20 dark:text-white/20 cursor-pointer text-xl">visibility</span>
                            </div>
                        </div>

                        {/* Password Confirm Input */}
                        <div className="group">
                            <label className="block text-[11px] font-bold mb-1 opacity-40 font-sans">비밀번호 확인</label>
                            <input
                                className="w-full bg-transparent border-t-0 border-l-0 border-r-0 border-b border-primary/10 dark:border-white/10 soft-input focus:border-primary dark:focus:border-white focus:ring-0 px-0 py-3 text-[16px] placeholder:text-gray-300 dark:placeholder:text-gray-700 font-sans transition-all"
                                placeholder="비밀번호를 다시 입력하세요"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <div className="mt-12 space-y-8">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#1a1a1a] dark:bg-white text-white dark:text-primary py-5 rounded-[2rem] text-sm font-bold tracking-[0.05em] transition-all active:scale-[0.98] shadow-lg shadow-black/5 font-sans disabled:opacity-50"
                            >
                                {loading ? '가입 중...' : '가입 완료'}
                            </button>
                            <div className="flex flex-col items-center">
                                <p className="text-[13px] text-primary/50 dark:text-white/50 font-sans">
                                    이미 계정이 있으신가요? <Link to="/login" className="text-primary dark:text-white font-bold underline underline-offset-4 decoration-1 decoration-primary/20 ml-1">로그인</Link>
                                </p>
                            </div>
                        </div>
                    </form>
                </main>
                <div className="h-8 w-full"></div>
            </div>
        </div>
    );
};
