import React, { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { FaCheckCircle, FaInfoCircle, FaExclamationTriangle, FaTimesCircle, FaTimes } from 'react-icons/fa';

const slideIn = keyframes`
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const slideOut = keyframes`
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(-100%); opacity: 0; }
`;

const ToastContainer = styled.div`
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 100000;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ToastWrapper = styled.div`
  background: white;
  min-width: 300px;
  max-width: 400px;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  animation: ${props => props.isClosing ? slideOut : slideIn} 0.3s ease-in-out forwards;
  border-left: 5px solid ${props => props.color};
  position: relative;
`;

const IconWrapper = styled.div`
  font-size: 24px;
  color: ${props => props.color};
  display: flex;
  align-items: center;
  height: 100%;
`;

const Content = styled.div`
  flex: 1;
`;

const Title = styled.h4`
  margin: 0 0 4px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
`;

const Message = styled.p`
  margin: 0;
  color: #666;
  font-size: 14px;
  line-height: 1.4;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 0;
  font-size: 14px;
  transition: color 0.2s;
  
  &:hover { color: #333; }
`;

const toastTypes = {
    success: { icon: FaCheckCircle, color: '#2ecc71', title: 'Success' },
    error: { icon: FaTimesCircle, color: '#e74c3c', title: 'Error' },
    warning: { icon: FaExclamationTriangle, color: '#f1c40f', title: 'Warning' },
    info: { icon: FaInfoCircle, color: '#3498db', title: 'Info' },
};

const Toast = ({ id, type = 'info', title, message, onClose, duration = 5000 }) => {
    const { icon: Icon, color, title: defaultTitle } = toastTypes[type];

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, duration);
        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    return (
        <ToastWrapper color={color}>
            <IconWrapper color={color}>
                <Icon />
            </IconWrapper>
            <Content>
                <Title>{title || defaultTitle}</Title>
                <Message>{message}</Message>
            </Content>
            <CloseButton onClick={() => onClose(id)}>
                <FaTimes />
            </CloseButton>
        </ToastWrapper>
    );
};

export { Toast, ToastContainer };
