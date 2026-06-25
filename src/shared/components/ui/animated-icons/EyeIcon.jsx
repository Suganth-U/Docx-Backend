import { motion } from "motion/react";

const EyeIcon = ({ isVisible, size = 24, color = "currentColor", className = "" }) => {
    return (
        <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            initial={false}
            animate={isVisible ? "visible" : "hidden"}
        >
            {/* Eye Outline */}
            <motion.path
                d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"
                transition={{ duration: 0.3 }}
            />
            <motion.path
                d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6"
                transition={{ duration: 0.3 }}
            />

            {/* Slash Line for Hidden State */}
            <motion.path
                d="M3 3l18 18"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                    pathLength: isVisible ? 0 : 1,
                    opacity: isVisible ? 0 : 1
                }}
                transition={{ duration: 0.3 }}
            />
        </motion.svg>
    );
};

export default EyeIcon;
