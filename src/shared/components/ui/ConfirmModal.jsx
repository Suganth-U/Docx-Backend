import React from 'react';
import styled, { keyframes } from 'styled-components';
import { AlertTriangle, Trash2, CheckCircle, Info, X } from 'lucide-react';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: ${fadeIn} 0.15s ease;
`;

const Modal = styled.div`
  background: white;
  border-radius: 16px;
  width: 420px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: ${slideUp} 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
`;

const IconBox = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$bg || '#FEF3C7'};
  color: ${props => props.$color || '#F59E0B'};
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: #9CA3AF;
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  display: flex;
  &:hover { background: #F3F4F6; color: #111827; }
`;

const Body = styled.div`
  padding: 16px 24px 24px;
  h3 {
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 700;
    color: #111827;
  }
  p {
    margin: 0;
    font-size: 14px;
    color: #6B7280;
    line-height: 1.5;
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: #F9FAFB;
  border-top: 1px solid #F3F4F6;
`;

const Btn = styled.button`
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const CancelBtn = styled(Btn)`
  background: white;
  color: #374151;
  border: 1px solid #D1D5DB;
  &:hover { background: #F3F4F6; }
`;

const ConfirmBtn = styled(Btn)`
  background: ${props => props.$bg || '#683B93'};
  color: white;
  border: none;
  &:hover { opacity: 0.9; transform: translateY(-1px); }
`;

const VARIANTS = {
  danger: {
    icon: Trash2,
    iconBg: '#FEE2E2',
    iconColor: '#EF4444',
    btnBg: '#EF4444',
    btnText: 'Delete',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: '#FEF3C7',
    iconColor: '#F59E0B',
    btnBg: '#F59E0B',
    btnText: 'Confirm',
  },
  info: {
    icon: Info,
    iconBg: '#F3E8FF',
    iconColor: '#683B93',
    btnBg: '#683B93',
    btnText: 'Confirm',
  },
  success: {
    icon: CheckCircle,
    iconBg: '#D1FAE5',
    iconColor: '#059669',
    btnBg: '#059669',
    btnText: 'Confirm',
  },
};

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText,
  cancelText = 'Cancel',
  variant = 'danger',
}) => {
  if (!isOpen) return null;

  const v = VARIANTS[variant] || VARIANTS.danger;
  const Icon = v.icon;

  return (
    <Backdrop onClick={onClose}>
      <Modal onClick={e => e.stopPropagation()}>
        <Header>
          <IconBox $bg={v.iconBg} $color={v.iconColor}>
            <Icon size={24} />
          </IconBox>
          <CloseBtn onClick={onClose}><X size={18} /></CloseBtn>
        </Header>
        <Body>
          <h3>{title}</h3>
          <p>{message}</p>
        </Body>
        <Footer>
          <CancelBtn onClick={onClose}>{cancelText}</CancelBtn>
          <ConfirmBtn $bg={v.btnBg} onClick={() => { onConfirm(); onClose(); }}>
            {confirmText || v.btnText}
          </ConfirmBtn>
        </Footer>
      </Modal>
    </Backdrop>
  );
};

export default ConfirmModal;
