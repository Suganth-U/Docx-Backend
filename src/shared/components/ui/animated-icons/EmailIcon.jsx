import { forwardRef, useImperativeHandle, useCallback } from "react";
import { motion, useAnimate } from "motion/react";

const EmailIcon = forwardRef(
    (
        { size = 24, color = "currentColor", strokeWidth = 2, className = "" },
        ref,
    ) => {
        const [scope, animate] = useAnimate();

        const start = useCallback(async () => {
            animate(
                ".mail-flap",
                {
                    d: "M3 7l9 6l9 -6", // Open or change shape? Just slight bounce
                    y: -2
                },
                {
                    duration: 0.25,
                    ease: "easeOut",
                },
            );
        }, [animate]);

        const stop = useCallback(async () => {
            animate(
                ".mail-flap",
                {
                    d: "M3 7l9 6l9 -6",
                    y: 0
                },
                {
                    duration: 0.2,
                    ease: "easeInOut",
                },
            );
        }, [animate]);

        useImperativeHandle(ref, () => ({
            startAnimation: start,
            stopAnimation: stop,
        }));

        return (
            <motion.svg
                ref={scope}
                xmlns="http://www.w3.org/2000/svg"
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`cursor-pointer ${className}`}
                onMouseEnter={start}
                onMouseLeave={stop}
            >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <motion.path
                    className="mail-flap"
                    d="M3 7l9 6l9 -6"
                />
            </motion.svg>
        );
    },
);

EmailIcon.displayName = "EmailIcon";
export default EmailIcon;
