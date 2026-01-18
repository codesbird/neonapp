import React, { useState, useEffect } from 'react';

const RetryNotification = ({ message, onClear }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onClear();
      }, 5000); // Hide after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [message, onClear]);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-500 text-white p-4 rounded-lg shadow-lg animate-fadeIn">
      <p>{message}</p>
    </div>
  );
};

export default RetryNotification;
