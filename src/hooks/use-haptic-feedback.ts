
'use client';

import { useCallback } from 'react';

type FeedbackType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
type HapticPattern = 'light' | 'heavy' | 'double';

const hapticPatterns: Record<HapticPattern, number | number[]> = {
    light: 10,
    heavy: 30,
    double: [20, 100, 20],
};

export const useHapticFeedback = () => {
    const triggerHapticFeedback = useCallback((type: FeedbackType | HapticPattern, pattern?: HapticPattern) => {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            try {
                if (pattern) {
                    navigator.vibrate(hapticPatterns[pattern]);
                } else if (type in hapticPatterns) {
                    navigator.vibrate(hapticPatterns[type as HapticPattern]);
                } else {
                    switch (type) {
                        case 'success':
                            navigator.vibrate([10, 50, 10]);
                            break;
                        case 'warning':
                            navigator.vibrate([20, 50, 20]);
                            break;
                        case 'error':
                            navigator.vibrate([50, 100, 50]);
                            break;
                        case 'light':
                            navigator.vibrate(10);
                            break;
                        case 'medium':
                            navigator.vibrate(20);
                            break;
                        case 'heavy':
                            navigator.vibrate(30);
                            break;
                        default:
                            break;
                    }
                }
            } catch (error) {
                // Vibration not supported or failed
                // console.warn("Haptic feedback failed:", error);
            }
        }
    }, []);

    return { triggerHapticFeedback };
};

    