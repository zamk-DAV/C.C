import { useState, useEffect } from 'react';

/**
 * 화면 크기를 기준으로 모바일 여부를 판단하는 훅
 * Tailwind의 'md' 브레이크포인트(768px)를 기준으로 함.
 */
export function useDeviceType() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkDevice = () => {
            // 정확한 포인터(마우스)가 있고 호버가 가능한 경우를 데스크톱으로 간주
            const hasMouse = window.matchMedia('(pointer: fine)').matches;
            const canHover = window.matchMedia('(hover: hover)').matches;

            // 마우스/호버가 없거나, 화면이 768px 미만이면 모바일로 처리 (하이브리드 장치 고려)
            // 다만 사용자의 요구사항: "창이 작아도 마우스가 있으면 PC UI여야 함"
            // 따라서 마우스가 있으면 무조건 데스크톱 UI를 유지하도록 설정
            if (hasMouse && canHover) {
                setIsMobile(false);
            } else {
                setIsMobile(window.innerWidth < 768);
            }
        };

        checkDevice();

        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    return { isMobile, isDesktop: !isMobile };
}
