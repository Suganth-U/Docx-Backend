import React, { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheck, FaTimes, FaInfo, FaExclamation } from 'react-icons/fa';

const slideIn = {
    hidden: { x: 100, opacity: 0 },
    visible: { x: 0, opacity: 1 },
    exit: { x: 100, opacity: 0 }
};

const ToastWrapper = styled(motion.div)`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10005;
  background: #fff;
  border-radius: 16px; // Slightly less rounded for a cleaner look with more text
  padding: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
  display: flex;
  align-items: flex-start; // Align top for long text
  gap: 16px;
  width: 100%; // Responsive
  max-width: 450px; // Prevent filling browser width
  border: 1px solid #f0f0f0;
`;

const Message = styled.p`
  margin: 0;
  color: #4a5568;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  word-wrap: break-word; // Handle long words
`;

const IconCircle = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
  color: white;
  background: ${({ $type }) =>
        $type === 'success' ? '#48BB78' :
            $type === 'error' ? '#F56565' :
                $type === 'warning' ? '#ED8936' :
                    '#4299E1'};
`;

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-top: 2px; // Align with icon
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #a0aec0;
  cursor: pointer;
  padding: 4px;
  display: flex;
  transition: color 0.2s;

  &:hover {
    color: #4a5568;
  }
`;

const ProgressBar = styled(motion.div)`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  background: ${({ $type }) =>
        $type === 'success' ? '#48BB78' :
            $type === 'error' ? '#F56565' :
                $type === 'warning' ? '#ED8936' :
                    '#4299E1'};
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px; // Match container border radius if needed, or just be straight
`;

const StatusModal = ({ isOpen, onClose, type = 'info', message, duration = 6000, actionText, onAction }) => { // Increased to 6000ms
    useEffect(() => {
        if (isOpen && duration) {
            const timer = setTimeout(() => {
                handleClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isOpen, duration]);

    const handleClose = () => {
        if (onAction && type === 'success') {
            onAction();
        }
        onClose();
    };

    const getIcon = () => {
        switch (type) {
            case 'success': return <FaCheck />;
            case 'error': return <FaTimes />;
            case 'warning': return <FaExclamation />;
            default: return <FaInfo />;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <ToastWrapper
                    variants={slideIn}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                    <IconCircle $type={type}>
                        {getIcon()}
                    </IconCircle>

                    <Content>
                        <Message>{message}</Message>
                    </Content>

                    <CloseButton onClick={handleClose}>
                        <FaTimes />
                    </CloseButton>

                    {duration && (
                        <ProgressBar
                            $type={type}
                            initial={{ width: "100%" }}
                            animate={{ width: "0%" }}
                            transition={{ duration: duration / 1000, ease: "linear" }}
                        />
                    )}
                </ToastWrapper>
            )}
        </AnimatePresence>
    );
};

export default StatusModal;
