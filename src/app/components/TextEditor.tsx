"use client"

import type React from "react"
import { useRef, useEffect } from "react"

interface TextEditorProps {
  code: string
  setCode: (code: string) => void
  errorLine: number | null
}

const TextEditor: React.FC<TextEditorProps> = ({ code, setCode, errorLine }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const syncScroll = () => {
      if (textareaRef.current && lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
      }
    }

    textareaRef.current?.addEventListener("scroll", syncScroll)
    return () => textareaRef.current?.removeEventListener("scroll", syncScroll)
  }, [])

  const codeLines = code.split("\n")

  return (
    <div className="w-full h-[calc(100vh-4rem)] relative font-mono text-sm">
      {/* Line Numbers */}
      <div
        ref={lineNumbersRef}
        className="absolute top-0 left-0 w-12 h-full bg-[#1e1e1e] text-right pr-2 overflow-hidden"
        style={{ paddingTop: "0.5rem" }}
      >
        {codeLines.map((_, index) => (
          <div
            key={index}
            className={`leading-6 ${errorLine === index + 1 ? "text-red-500 font-bold" : "text-gray-500"}`}
          >
            {index + 1}
          </div>
        ))}
      </div>
      {/* Code Editor */}
      <textarea
        ref={textareaRef}
        className="w-full h-full p-2 pl-14 bg-[#272727] text-white rounded-none resize-none outline-none"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Write your JavaScript code here..."
        style={{ lineHeight: "1.5rem" }}
      ></textarea>
    </div>
  )
}

export default TextEditor

