import React from "react";
import Home from "./pages/Home";
import { DownloadProvider } from "./context/DownloadContext";
import { ErrorProvider, useError } from "./context/ErrorContext";
import ErrorModal from "./components/ErrorModal";
import RetryNotification from "./components/RetryNotification";
import { useState } from "react";


function AppContent() {
  const { error, setError } = useError();
  const [retryMessage, setRetryMessage] = useState(null);
  return (
    <>
      <Home setRetryMessage={setRetryMessage} />
      <ErrorModal error={error} onClose={() => setError(null)} />
      <RetryNotification message={retryMessage} onClear={() => setRetryMessage(null)} />
    </>
  );
}

export default function App() {
  return (
    <ErrorProvider>
      <DownloadProvider>
        <AppContent />
      </DownloadProvider>
    </ErrorProvider>
  );
}
