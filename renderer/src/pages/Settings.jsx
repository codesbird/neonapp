import React, { useState, useEffect } from 'react';

const Settings = ({ isSettingsOpen, setIsSettingsOpen }) => {
  const [settings, setSettings] = useState({
    autoUpdate: true,
  });

  useEffect(() => {
    window.api.loadSettings().then((loadedSettings) => {
      if (loadedSettings) {
        setSettings(loadedSettings);
      }
    });
  }, []);

  const handleToggle = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    window.api.saveSettings(newSettings);
  };

  if (!isSettingsOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg w-1/3">
        <h2 className="text-2xl font-bold mb-4">Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-lg">Check for updates on startup</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.autoUpdate}
                onChange={() => handleToggle('autoUpdate')}
              />
              <div className="relative w-14 h-8 bg-gray-600 rounded-full">
                <div
                  className={`absolute left-1 top-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                    settings.autoUpdate ? "translate-x-6" : ""
                  }`}
                ></div>
              </div>
            </label>
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
