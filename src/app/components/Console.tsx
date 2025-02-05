"use client"

import type React from "react"
import { useRef, useState, useEffect } from "react"

interface ConsoleProps {
  output: string
  onClose: () => void
  executionTime?: number
}

const Console: React.FC<ConsoleProps> = ({ output, onClose, executionTime }) => {
  const consoleRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 600, y: 200 })
  const [size, setSize] = useState({ width: 500, height: 300 })
//   const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    // setIsDragging(true)
    const startX = e.clientX - position.x
    const startY = e.clientY - position.y

    const handleMouseMove = (moveEvent: MouseEvent) => {
      setPosition({
        x: moveEvent.clientX - startX,
        y: moveEvent.clientY - startY,
      })
    }

    const handleMouseUp = () => {
    //   setIsDragging(false)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  useEffect(() => {
    const style = document.createElement("style")
    style.textContent = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: #1a1a1a;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: #4a4a4a;
        border-radius: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background-color: #5a5a5a;
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <div
      ref={consoleRef}
      style={{
        position: "absolute",
        top: position.y,
        left: position.x,
        width: size.width,
        height: size.height,
        zIndex: 1000,
      }}
      className="bg-black text-green-400 rounded shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div onMouseDown={handleMouseDown} className="bg-gray-800 p-2 cursor-move flex justify-between items-center">
        <span>Console</span>
        <button onClick={onClose} className="text-red-500 hover:text-red-700">
          X
        </button>
      </div>
      {/* Output */}
      <pre
        className="p-4 overflow-auto custom-scrollbar"
        style={{
          height: size.height - 40,
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
        }}
      >
        {output}
        {executionTime !== undefined && (
          <div className="mt-4 text-gray-400">Execution completed in {executionTime.toFixed(2)} ms</div>
        )}
      </pre>
      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 bg-gray-700 cursor-se-resize"
        onMouseDown={(e) => {
          const startX = e.clientX
          const startY = e.clientY
          const startWidth = size.width
          const startHeight = size.height

          const handleMouseMove = (moveEvent: MouseEvent) => {
            setSize({
              width: startWidth + (moveEvent.clientX - startX),
              height: startHeight + (moveEvent.clientY - startY),
            })
          }

          const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove)
            document.removeEventListener("mouseup", handleMouseUp)
          }

          document.addEventListener("mousemove", handleMouseMove)
          document.addEventListener("mouseup", handleMouseUp)
        }}
      ></div>
    </div>
  )
}

export default Console

