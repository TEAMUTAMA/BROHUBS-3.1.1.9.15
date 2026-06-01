
import { Variants } from 'motion/react';

export interface AnimationConfig {
  inType: 'fade' | 'slide-right' | 'slide-left' | 'slide-up' | 'slide-down';
  outType: 'fade' | 'slide-right' | 'slide-left' | 'slide-up' | 'slide-down';
  duration: number;
  delay: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'backOut';
  useSpring: boolean;
  staggerChildren?: boolean;
  staggerDirection?: 'top-down' | 'bottom-up' | 'center-out';
  staggerDelay?: number;
  mode?: 'default' | 'preset' | 'custom';
  presetId?: string;
}

export const getAnimationVariants = (config: AnimationConfig): Variants => {
  const getInitial = (type: string) => {
    switch (type) {
      case 'slide-right': return { x: -1920, opacity: 0 };
      case 'slide-left': return { x: 1920, opacity: 0 };
      case 'slide-up': return { y: 1080, opacity: 0 };
      case 'slide-down': return { y: -1080, opacity: 0 };
      case 'fade': return { opacity: 0 };
      default: return { opacity: 0, scale: 0.95 };
    }
  };

  const getExit = (type: string) => {
    switch (type) {
      case 'slide-right': return { x: 1920, opacity: 0 };
      case 'slide-left': return { x: -1920, opacity: 0 };
      case 'slide-up': return { y: -1080, opacity: 0 };
      case 'slide-down': return { y: 1080, opacity: 0 };
      case 'fade': return { opacity: 0 };
      default: return { opacity: 0, scale: 0.95 };
    }
  };

  const transition: any = config.useSpring 
    ? { 
        type: 'spring', 
        stiffness: 100, 
        damping: 20, 
        mass: 1,
        delay: config.delay 
      }
    : {
        duration: config.duration,
        delay: config.delay,
        ease: config.easing === 'backOut' ? [0.34, 1.56, 0.64, 1] : config.easing
      };

  return {
    initial: getInitial(config.inType),
    animate: { 
      x: 0, 
      y: 0, 
      scale: 1, 
      opacity: 1,
      transition: {
        ...transition,
        when: "beforeChildren"
      }
    },
    exit: {
      ...getExit(config.outType),
      transition: {
        duration: config.duration * 0.8, // Slightly faster exit
        ease: 'easeInOut',
        when: "afterChildren"
      }
    }
  };
};
