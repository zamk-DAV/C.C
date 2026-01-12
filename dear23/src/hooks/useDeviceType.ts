import { useState, useEffect } from 'react';

/**
 * 화면 크기를 기준으로 모바일 여부를 판단하는 훅
 * Tailwind의 'md' 브레이크포인트(768px)를 기준으로 함.
 */
export function useDeviceType() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // 초기 실행
        checkMobile();

        // 리사이즈 이벤트 감지
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return { isMobile, isDesktop: !isMobile };
}
