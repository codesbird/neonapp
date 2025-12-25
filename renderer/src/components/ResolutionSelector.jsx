import React, { useEffect, useState } from "react";

export default function ResolutionSelector({
  resolutions = [],
  id,
  onResultionSelect,
  mode
}) {
  const defaultValue = resolutions[2] ? `${resolutions[2]}p` : "";

  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    onResultionSelect(value);
  }, [value]);

  return (
    <select
      key={id}
      id={id}
      className="bg-[#0b1220] px-3 py-2 rounded text-sm text-white"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      disabled={mode == 'audio'}
    >
      {resolutions.length === 0 && <option value="">Auto</option>}

      {resolutions.map((r) => (
        <option key={r} value={`${r}p`}>
          {r}p
        </option>
      ))}
    </select>
  );
}
