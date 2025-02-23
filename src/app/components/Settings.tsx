"use client"
import {useState, useRef} from "react"
import {X} from "lucide-react"
import {useSettingsStore} from "../store/settingsStore"

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
}

const Settings: React.FC<SettingsProps> = ({isOpen, onClose}) => {
  const [position, setPosition] = useState({x: 200, y: 100})
  const dragRef = useRef<HTMLDivElement>(null)
  const {
    tabFunction,
    formatFunction,
    setTabFunction,
    autoAdjust,
    setAutoAdjust,
    setFormatFunction,
    useCodeEditor,
    setUseCodeEditor,
    autoClosing,
    setAutoClosing,
  } = useSettingsStore()

  const handleMouseDown = (e: React.MouseEvent) => {
    const startX = e.clientX - position.x
    const startY = e.clientY - position.y

    const handleMouseMove = (moveEvent: MouseEvent) => {
      setPosition({
        x: moveEvent.clientX - startX,
        y: moveEvent.clientY - startY,
      })
    }

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  if (!isOpen) return null

  return (
    <div
      ref={dragRef}
      style={{
        position: "absolute",
        top: position.y,
        left: position.x,
        minWidth: "300px",
        zIndex: 1000,
      }}
      className="bg-gray-900 text-white rounded-lg shadow-lg border border-gray-700 overflow-hidden"
    >
      {/* Header for Dragging */}
      <div
        onMouseDown={handleMouseDown}
        className="bg-gray-800 p-2 cursor-move flex justify-between items-center"
      >
        <h2 className="text-sm font-bold font-mono">Settings</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <div
          className={`${
            useCodeEditor
              ? "opacity-50 pointer-events-none space-y-4"
              : "space-y-4"
          }`}
        >
          {/* Toggle for Tab Function */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium font-mono">Tab Function</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tabFunction}
                onChange={(e) => setTabFunction(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className="w-8 h-4 bg-gray-700 
                           peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-blue-500 
                           rounded-full 
                           peer peer-checked:after:translate-x-3 peer-checked:after:border-white 
                           after:content-[''] after:absolute after:top-[0.12rem] after:left-[0.25rem] 
                           after:bg-white after:border-gray-300 after:border after:rounded-full 
                           after:h-3 after:w-3 after:transition-all 
                           peer-checked:bg-blue-600"
              ></div>
            </label>
          </div>
          {/* Toggle for Auto Adjust */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium font-mono">Auto Adjust</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoAdjust}
                onChange={(e) => setAutoAdjust(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className="w-8 h-4 bg-gray-700 
                           peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-blue-500 
                           rounded-full 
                           peer peer-checked:after:translate-x-3 peer-checked:after:border-white 
                           after:content-[''] after:absolute after:top-[0.12rem] after:left-[0.25rem] 
                           after:bg-white after:border-gray-300 after:border after:rounded-full 
                           after:h-3 after:w-3 after:transition-all 
                           peer-checked:bg-blue-600"
              ></div>
            </label>
          </div>
          {/* Toggle for Auto Closing Brackets */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium font-mono">
              Auto Closing Brackets
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoClosing}
                onChange={(e) => setAutoClosing(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className="w-8 h-4 bg-gray-700 
                           peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-blue-500 
                           rounded-full 
                           peer peer-checked:after:translate-x-3 peer-checked:after:border-white 
                           after:content-[''] after:absolute after:top-[0.12rem] after:left-[0.25rem] 
                           after:bg-white after:border-gray-300 after:border after:rounded-full 
                           after:h-3 after:w-3 after:transition-all 
                           peer-checked:bg-blue-600"
              ></div>
            </label>
          </div>
          {/* Toggle for Format Function */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium font-mono">
              Format Function (Shift + Alt + F)
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formatFunction}
                onChange={(e) => setFormatFunction(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className="w-8 h-4 bg-gray-700 
                           peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-blue-500 
                           rounded-full 
                           peer peer-checked:after:translate-x-3 peer-checked:after:border-white 
                           after:content-[''] after:absolute after:top-[0.12rem] after:left-[0.25rem] 
                           after:bg-white after:border-gray-300 after:border after:rounded-full 
                           after:h-3 after:w-3 after:transition-all 
                           peer-checked:bg-blue-600"
              ></div>
            </label>
          </div>
        </div>

        {/* Toggle for Use Code Editor */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium font-mono">VS Code Editor</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={useCodeEditor}
              onChange={(e) => setUseCodeEditor(e.target.checked)}
              className="sr-only peer"
            />
            <div
              className="w-8 h-4 bg-gray-700 
                         peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-blue-500 
                         rounded-full 
                         peer peer-checked:after:translate-x-3 peer-checked:after:border-white 
                         after:content-[''] after:absolute after:top-[0.12rem] after:left-[0.25rem] 
                         after:bg-white after:border-gray-300 after:border after:rounded-full 
                         after:h-3 after:w-3 after:transition-all 
                         peer-checked:bg-blue-600"
            ></div>
          </label>
        </div>
      </div>
    </div>
  )
}

export default Settings
