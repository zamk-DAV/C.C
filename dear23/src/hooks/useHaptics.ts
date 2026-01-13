import { useCallback } from 'react';

/**
 * 모바일 기기에서 햅틱 피드백(진동)을 발생시키는 훅
 * iOS Safari는 진동 API를 제한적으로 지원하거나 지원하지 않을 수 있음.
 * Android Chrome 등에서는 정상 작동.
 */
export function useHaptics() {
    const triggerHaptic = useCallback((pattern: number | number[] = 10) => {
        // navigator.vibrate가 존재하고, 사용자 인터랙션 등에 의해 호출될 때 작동
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
                navigator.vibrate(pattern);
            } catch (e) {
                console.warn('Haptic feedback failed', e);
            }
        }
    }, []);

    const simpleClick = useCallback(() => triggerHaptic(10), [triggerHaptic]);
    const light = useCallback(() => triggerHaptic(5), [triggerHaptic]); // Light haptic
    const medium = useCallback(() => triggerHaptic(25), [triggerHaptic]);
    const success = useCallback(() => triggerHaptic([10, 30, 10]), [triggerHaptic]);
    const warning = useCallback(() => triggerHaptic([50, 50, 50]), [triggerHaptic]);
    const heavy = useCallback(() => triggerHaptic(50), [triggerHaptic]);
    const selection = useCallback(() => triggerHaptic(10), [triggerHaptic]);

    return {
        trigger: triggerHaptic,
        simpleClick,
        selection,
        light,
        medium,
        success,
        warning,
        heavy,
    };
}

