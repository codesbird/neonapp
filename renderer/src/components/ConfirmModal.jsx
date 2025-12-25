import React from "react";
import { X } from "lucide-react";

export default function ConfirmModal({
    open,
    title = "Are you sure?",
    description = "This action cannot be undone.",
    icon = null,
    headerColor = "from-red-500 to-orange-500",
    callback,
    comfirmText,
    actions = null
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-[#07112a] wk-[420px] p-0 rounded-xl border border-[#0b1220] shadow-xl animate-scaleIn">

                {/* HEADER */}
                <div className={`px-5 py-2 rounded-t-xl bg-gradient-to-r ${headerColor} flex items-center justify-between`}>
                    <div className="flex items-center gap-2 text-white font-semibold text-lg">
                        {icon && <span className="text-white">{icon}</span>}
                        {title}
                    </div>

                    <button onClick={() => callback(0)}>
                        <X size={22} className="text-white hover:text-gray-200" />
                    </button>
                </div>

                {/* BODY */}
                <div className="p-5 text-gray-300 text-sm leading-6">
                    {description}
                </div>

                {/* FOOTER */}
                <div className="flex justify-end gap-3 px-5 pb-5">
                    <button
                        onClick={() => callback(0)}
                        className="px-4 py-2 rounded-3xl bg-[#0b1220] border border-[#122036] text-white hover:bg-[#0e1a33]"
                    >
                        Cancel
                    </button>
                    {actions &&
                        <>
                            {actions.map((action) => (
                                <button
                                    onClick={() => callback(action.return)}
                                    className="px-4 py-2 rounded-3xl bg-[#0b1220] border border-[#122036] text-white hover:bg-[#0e1a33]"
                                >
                                    {action.name}
                                </button>
                            ))}
                        </>
                    }

                    <button
                        onClick={() => callback(1)}
                        className="px-5 py-2 rounded-3xl bg-gradient-to-r from-pink-500 to-orange-400 text-white hover:opacity-90"
                    >
                        {comfirmText ? comfirmText : "Comfirm"}
                    </button>
                </div>
            </div>

            {/* Animations */}
            <style>{`
        @keyframes fadeIn {
          from { opacity: 0 }
          to { opacity: 1 }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }

        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0 }
          to { transform: scale(1); opacity: 1 }
        }
        .animate-scaleIn { animation: scaleIn 0.25s ease-out; }
      `}</style>
        </div>
    );
}
