import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Toast, ToastContainer } from "@/shared/components/ui/Toast";

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', title = '', duration = 5000) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type, title, duration }]);
        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    // Helper functions for common types
    const success = useCallback((message, title) => addToast(message, 'success', title), [addToast]);
    const error = useCallback((message, title) => addToast(message, 'error', title), [addToast]);
    const warning = useCallback((message, title) => addToast(message, 'warning', title), [addToast]);
    const info = useCallback((message, title) => addToast(message, 'info', title), [addToast]);

    const value = useMemo(() => ({
        addToast,
        removeToast,
        success,
        error,
        warning,
        info
    }), [addToast, removeToast, success, error, warning, info]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastContainer>
                {toasts.map(toast => (
                    <Toast
                        key={toast.id}
                        {...toast}
                        onClose={removeToast}
                    />
                ))}
            </ToastContainer>
        </ToastContext.Provider>
    );
};
