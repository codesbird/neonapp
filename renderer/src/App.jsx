import React from "react";
import Home from "./pages/Home";
import { DownloadProvider } from "./context/DownloadContext";

export default function App() {
  return (
    <DownloadProvider>
      <Home />
    </DownloadProvider>
  );
}
