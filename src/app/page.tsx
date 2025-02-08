"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import TextEditor from "./components/TextEditor"
import Console from "./components/Console"
import { Play, RotateCcw, FileText, Info } from "lucide-react" // Import icons
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip"
import Settings from "./components/Settings"

export default function Home() {
  const [code, setCode] = useState<string>("// Write your JavaScript code here\nconsole.log('Hello, World!');")
  const [output, setOutput] = useState<string>("")
  const [errorLine, setErrorLine] = useState<number | null>(null)
  const [showConsole, setShowConsole] = useState<boolean>(false)
  const [showSettings, setShowSettings] = useState<boolean>(false)

  // Load code from localStorage on initial client-side render
  useEffect(() => {
    const savedCode = localStorage.getItem("savedCode")
    if (savedCode) {
      setCode(savedCode)
    }
  }, [])

  // Save code to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("savedCode", code)
  }, [code])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "Enter") {
        event.preventDefault() // Prevent any default behavior
        runCode() // Trigger the runCode function
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [code])

  // Function to send the code to the backend API using Axios
  const runCode = async () => {
    try {
      const response = await axios.post("/api/run-code", { code })
      if (response.data.success) {
        setOutput(response.data.output)
        console.log("out",response.data.output)
        setErrorLine(null) // Clear error line if successful
      } else {
        setOutput(`Error: ${response.data.error}`)
        setErrorLine(response.data.line) // Highlight the error line
      }
      setShowConsole(true) // Show the console after running the code
    } catch (error) {
      setOutput("Error: Failed to execute code.")
      console.log(error)
      setErrorLine(null) // Clear error line on network errors
    }
  }

  // Function to clear the code and localStorage
  const clearCode = () => {
    setCode("")
    localStorage.removeItem("savedCode")
    setOutput("")
    setErrorLine(null)
    setShowConsole(false)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="py-2 px-4 bg-[#12142d] flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <FileText className="w-6 h-6 text-blue-500" />
          <h1 className="text-lg font-bold">JS Notepad</h1>
        </div>
        <div className="space-x-2">
        <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={runCode}
                  className="p-2  text-white rounded transition duration-200"
                  aria-label="Run Code"
                >
                  <Play className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ctrl + Enter</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <button
            onClick={clearCode}
            className="p-2  text-white rounded  transition duration-200"
            aria-label="Clear Code"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-white rounded transition duration-200"
            aria-label="Settings"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 space-x-4">
        {/* Text Editor */}
        <TextEditor code={code} setCode={setCode} errorLine={errorLine} />

        {/* Console Output */}
        {showConsole && <Console output={output} onClose={() => setShowConsole(false)} />}
        <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </main>
    </div>
  )
}

 