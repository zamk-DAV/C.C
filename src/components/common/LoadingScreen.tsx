import React from 'react';
import { motion } from 'framer-motion';

export const LoadingScreen: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background overflow-hidden relative transition-colors duration-300">

            {/* Background Decoration (Subtle glow) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-secondary/50 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center">
                {/* Pulsing Heart Animation */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        filter: [
                            "drop-shadow(0 0 0px rgba(0,0,0,0))",
                            "drop-shadow(0 0 10px rgba(0,0,0,0.1))",
                            "drop-shadow(0 0 0px rgba(0,0,0,0))"
                        ]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="flex items-center justify-center"
                >
                    {/* Using text char for heart to ensure style match, or Material Icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" className="w-10 h-10 text-primary">
                        <path d="m720-600-32 28q-14 13-33 13t-33-11q-14-11-19-28t1-36l16-50-34-20q-16-9-22.5-26t-1.5-34q5-17 20-26.5t34-9.5h40l12-38q6-19 20.5-30.5T720-880q17 0 31.5 11.5T772-838l12 38h40q19 0 33.5 9.5T878-764q7 18 0 35t-22 25l-36 20 16 50q6 19 1 36.5T818-570q-15 11-33.5 11T752-572l-32-28Zm0-80q17 0 28.5-11.5T760-720q0-17-11.5-28.5T720-760q-17 0-28.5 11.5T680-720q0 17 11.5 28.5T720-680ZM552-244q23 60-15 112T430-80q-33 0-62.5-17T324-142q-83 12-137.5-42.5T142-324q-30-17-46-46.5T80-438q0-61 55.5-98.5T244-552l62 26q20-31 53-50.5t71-21.5v-82h60v90q37 11 61 34.5t41 65.5h88v60h-82q-2 38-20.5 71T528-306l24 62Zm-248 24q0-27 4.5-52.5T322-322q-23 11-49.5 15.5T220-304q0 39 22.5 61.5T304-220Zm-74-164q32 0 56.5-8t63.5-32l-120-50q-29-12-49.5.5T160-434q0 26 17 38t53 12Zm200 224q25 0 40.5-17.5T478-214l-54-136q-19 32-29.5 64T384-228q0 33 11.5 50.5T430-160Zm66-222q10-10 16-26.5t6-34.5q0-32-21-54t-52-22q-18 0-34 6t-27 17l78 36 34 78Zm-174 60Z" />
                    </svg>
                </motion.div>

                {/* Loading Text */}
                <motion.div
                    className="mt-6 flex flex-col items-center space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                >
                    <h2 className="text-xl font-bold font-display tracking-[0.2em] text-primary">
                        DEAR23
                    </h2>
                    <p className="text-[10px] text-text-secondary font-sans tracking-widest uppercase animate-pulse">
                        Connecting...
                    </p>
                </motion.div>
            </div>
        </div>
    );
};
