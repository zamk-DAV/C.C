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
                    <span className="material-symbols-outlined text-4xl text-primary">favorite</span>
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
