import { motion } from 'framer-motion';

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
            const signupEmail = email.includes('@') ? email : `${email}@dear23.app`;
            const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: name,
                email: signupEmail,
                photoURL: null,
                coupleId: null,
                inviteCode: '',
                notionConfig: { apiKey: null, databaseId: null },
                bgImage: null
            });

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

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08,
                delayChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
    };

    return (
        <div className="min-h-[100dvh] bg-background text-primary font-display flex flex-col items-center w-full transition-colors duration-300">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative flex h-screen w-full flex-col overflow-x-hidden max-w-[480px] bg-background border-x border-border"
            >
                {/* Header */}
                <motion.header variants={itemVariants} className="flex items-center justify-between px-6 py-6">
                    <div className="flex items-center">
                        <span
                            onClick={() => navigate(-1)}
                            className="material-symbols-outlined text-primary text-2xl cursor-pointer hover:opacity-60 transition-opacity"
                        >
                            chevron_left
                        </span>
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.25em] font-bold opacity-30 text-text-secondary">Vol. 01 / Registration</div>
                    <div className="w-6"></div>
                </motion.header>

                <main className="flex-1 px-8 pt-8 pb-10 flex flex-col">
                    <motion.section variants={itemVariants} className="mb-14">
                        <h1 className="text-4xl font-bold tracking-tight leading-tight text-primary font-sans">시작하기</h1>
                    </motion.section>

                    <form className="flex-1 space-y-10" onSubmit={handleSignUp}>
                        {/* Name Input */}
                        <motion.div variants={itemVariants} className="group">
                            <label className="block text-[11px] font-bold mb-1 opacity-40 font-sans text-text-secondary">이름</label>
                            <input
                                className="w-full bg-transparent border-t-0 border-l-0 border-r-0 border-b border-primary/20 soft-input focus:border-primary focus:ring-0 px-0 py-3 text-[16px] placeholder:text-text-secondary/30 font-sans transition-all text-primary"
                                placeholder="이름을 입력하세요"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </motion.div>

                        {/* ID Input */}
                        <motion.div variants={itemVariants} className="group">
                            <label className="block text-[11px] font-bold mb-1 opacity-40 font-sans text-text-secondary">아이디</label>
                            <input
                                className="w-full bg-transparent border-t-0 border-l-0 border-r-0 border-b border-primary/20 soft-input focus:border-primary focus:ring-0 px-0 py-3 text-[16px] placeholder:text-text-secondary/30 font-sans transition-all text-primary"
                                placeholder="아이디를 입력하세요"
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </motion.div>

                        {/* Password Input */}
                        <motion.div variants={itemVariants} className="group relative">
                            <label className="block text-[11px] font-bold mb-1 opacity-40 font-sans text-text-secondary">비밀번호</label>
                            <div className="relative">
                                <input
                                    className="w-full bg-transparent border-t-0 border-l-0 border-r-0 border-b border-primary/20 soft-input focus:border-primary focus:ring-0 px-0 py-3 text-[16px] placeholder:text-text-secondary/30 font-sans transition-all text-primary"
                                    placeholder="비밀번호를 입력하세요"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-text-secondary cursor-pointer text-xl hover:text-primary transition-colors">visibility</span>
                            </div>
                        </motion.div>

                        {/* Password Confirm Input */}
                        <motion.div variants={itemVariants} className="group">
                            <label className="block text-[11px] font-bold mb-1 opacity-40 font-sans text-text-secondary">비밀번호 확인</label>
                            <input
                                className="w-full bg-transparent border-t-0 border-l-0 border-r-0 border-b border-primary/20 soft-input focus:border-primary focus:ring-0 px-0 py-3 text-[16px] placeholder:text-text-secondary/30 font-sans transition-all text-primary"
                                placeholder="비밀번호를 다시 입력하세요"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </motion.div>

                        <motion.div variants={itemVariants} className="mt-12 space-y-8">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary text-background py-5 rounded-[2rem] text-sm font-bold tracking-[0.05em] transition-all hover:opacity-90 active:scale-[0.98] shadow-lg shadow-black/5 font-sans disabled:opacity-50"
                            >
                                {loading ? '가입 중...' : '가입 완료'}
                            </button>
                            <div className="flex flex-col items-center">
                                <p className="text-[13px] text-text-secondary/50 font-sans">
                                    이미 계정이 있으신가요? <Link to="/login" className="text-primary font-bold underline underline-offset-4 decoration-1 decoration-primary/20 ml-1">로그인</Link>
                                </p>
                            </div>
                        </motion.div>
                    </form>
                </main>
                <div className="h-8 w-full"></div>
            </motion.div>
        </div>
    );
};
