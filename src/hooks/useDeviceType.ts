import { useState, useEffect } from 'react';

export type DeviceType = 'desktop' | 'mobile';

/**
 * Custom hook to detect device type based on hover capability, touch support, and screen size.
 * - Desktop: hover supported + no touch + large screen
 * - Mobile: touch device or small screen
 */
export const useDeviceType = (): DeviceType => {
    const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

    useEffect(() => {
        const checkDevice = () => {
            // Check if device supports hover (true hover, not emulated)
            const hasHover = window.matchMedia('(hover: hover)').matches;

            // Check if device supports touch
            const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            // Check screen size (< 1024px = tablet/mobile)
            const isSmallScreen = window.innerWidth < 1024;

            // Desktop: has hover + not primarily touch + large screen
            // Mobile: touch device OR small screen
            if (hasHover && !isTouch && !isSmallScreen) {
                setDeviceType('desktop');
            } else {
                setDeviceType('mobile');
            }
        };

        // Initial check
        checkDevice();

        // Listen for resize events
        window.addEventListener('resize', checkDevice);

        // Listen for media query changes
        const hoverQuery = window.matchMedia('(hover: hover)');
        hoverQuery.addEventListener('change', checkDevice);

        return () => {
            window.removeEventListener('resize', checkDevice);
            hoverQuery.removeEventListener('change', checkDevice);
        };
    }, []);

    return deviceType;
};

export default useDeviceType;
