"use client";
import type React from "react";
import { useRef, useEffect, useState } from "react";
import { useSettingsStore } from "../store/settingsStore"
import dynamic from "next/dynamic"
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })
interface TextEditorProps {
  code: string;
  setCode: (code: string) => void;
  setOutput:(code: string) => void;
  setShowConsole:(value:boolean) => void;
  errorLine: number | null;
}

const TextEditor: React.FC<TextEditorProps> = ({ code, setCode, errorLine,setOutput,setShowConsole }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [undoStack, setUndoStack] = useState<{ value: string; cursorPos: number }[]>([]);
  const [redoStack, setRedoStack] = useState<{ value: string; cursorPos: number }[]>([]);
  
  const { tabFunction, formatFunction ,useCodeEditor,autoClosing,autoAdjust} = useSettingsStore()
  
  useEffect(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      textareaRef.current.style.height = "auto"; // Reset height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Expand height dynamically

      lineNumbersRef.current.style.height = textareaRef.current.style.height; // Match line numbers height
    }
  }, [code]);

  // const codeLines = code.split("\n");

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    if (event.ctrlKey && event.key === "Enter") {
      event.preventDefault() 
      return ;
    }
    // Handle formatting (Shift+Alt+F)
    if (formatFunction && event.shiftKey && event.altKey && event.key === "F") {
      event.preventDefault()
      formatCode();
      return
    }


    // Handle Tab key
    if (tabFunction && event.key === "Tab") {
      event.preventDefault();

      if (event.shiftKey) {
        // Shift + Tab: Remove 4 spaces (unindent)
        const startOfLine = value.lastIndexOf("\n", selectionStart - 1) + 1;

        if (value.substring(startOfLine, startOfLine + 4) === "    ") {
          const newCode =
            value.substring(0, startOfLine) + value.substring(startOfLine + 4);
          updateCode(newCode, selectionStart - 4);
        }
      } else {
        // Tab: Insert 4 spaces (indent)
        const newCode =
          value.substring(0, selectionStart) +
          "    " +
          value.substring(selectionEnd);
        updateCode(newCode, selectionStart + 4);
      }
    }

    // Handle Enter key
    if (autoAdjust&&event.key === "Enter") {
      event.preventDefault();

      const prevChar = value[selectionStart - 1];
      const nextChar = value[selectionStart];

      const pairs: { [key: string]: string } = {
        "{": "}",
        "[": "]",
        "(": ")",
      };

      if (pairs[prevChar] === nextChar) {
        // If cursor is between matching pairs, add two newlines and indent
        const indent = getIndent(value, selectionStart);
        const newCode =
          value.substring(0, selectionStart) +
          "\n" +
          indent +
          "    " +
          "\n" +
          indent +
          value.substring(selectionStart);
        updateCode(newCode, selectionStart + indent.length + 5);
      } else {
        // Normal Enter behavior
        const indent = getIndent(value, selectionStart);
        const newCode =
          value.substring(0, selectionStart) +
          "\n" +
          indent +
          value.substring(selectionEnd);
        updateCode(newCode, selectionStart + indent.length + 1);
      }
    }

    // Handle Backspace
    if (event.key === "Backspace") {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart, selectionEnd, value } = textarea;

      if (selectionStart === selectionEnd) {
        const prevChar = value[selectionStart - 1];
        const nextChar = value[selectionStart];

        const pairs: { [key: string]: string } = {
          '"': '"',
          "'": "'",
          "{": "}",
          "[": "]",
          "(": ")",
          "`": "`",
        };

        if (pairs[prevChar] === nextChar) {
          event.preventDefault();
          const newCode =
            value.substring(0, selectionStart - 1) +
            value.substring(selectionStart + 1);
          updateCode(newCode, selectionStart - 1);
        }
      }
    }
    

    // Handle Undo (Ctrl+Z or Cmd+Z)
    if ((event.ctrlKey || event.metaKey) && event.key === "z") {
      event.preventDefault();
      handleUndo();
    }

    // Handle Redo (Ctrl+Shift+Z or Cmd+Shift+Z)
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "Z") {
      event.preventDefault();
      handleRedo();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const { selectionStart } = e.target;
    if (!autoClosing) {
      updateCode(newValue, selectionStart);
      return;
    }
    const char = newValue[selectionStart - 1]; // The last typed character
    const pairs: { [key: string]: string } = {
      '"': '"',
      "'": "'",
      "{": "}",
      "[": "]",
      "(": ")",
      "`": "`",
    };

    if (pairs[char] && newValue[selectionStart] !== pairs[char]) {
      // Insert the closing character after the cursor
      const updatedCode =
        newValue.substring(0, selectionStart) +
        pairs[char] +
        newValue.substring(selectionStart);
      updateCode(updatedCode, selectionStart);
    } else {
      updateCode(newValue, selectionStart);
    }
  };

  const handleUndo = () => {
    if (undoStack.length > 0) {
      const currentState = {
        value: code,
        cursorPos: textareaRef.current?.selectionStart || 0,
      };
      setRedoStack([currentState, ...redoStack]);
      const prevState = undoStack[undoStack.length - 1];
      setUndoStack(undoStack.slice(0, -1));
      setCode(prevState.value);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart =
            textareaRef.current.selectionEnd = prevState.cursorPos;
        }
      }, 0);
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const currentState = {
        value: code,
        cursorPos: textareaRef.current?.selectionStart || 0,
      };
      setUndoStack([...undoStack, currentState]);
      const nextState = redoStack[0];
      setRedoStack(redoStack.slice(1));
      setCode(nextState.value);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart =
            textareaRef.current.selectionEnd = nextState.cursorPos;
        }
      }, 0);
    }
  };

  const updateCode = (newCode: string, cursorPos: number) => {
    setUndoStack([
      ...undoStack,
      { value: code, cursorPos: textareaRef.current?.selectionStart || 0 },
    ]);
    setRedoStack([]);
    setCode(newCode);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart =
          textareaRef.current.selectionEnd = cursorPos;
      }
    }, 0);
  };

  const getIndent = (value: string, position: number): string => {
    const lastNewLine = value.lastIndexOf("\n", position - 1);
    const lineStart = lastNewLine === -1 ? 0 : lastNewLine + 1;
    const line = value.slice(lineStart, position);
    const match = line.match(/^\s*/);
    return match ? match[0] : "";
  };

  const formatCode = async () => {
    try {
      // Dynamically import prettier and parser-babel
      const prettier = (await import("prettier")).default;
      const parserBabel = (await import("prettier/parser-babel")).default;


      if (typeof code !== "string") {
        console.log("Invalid code format: Expected a string.");
        return;
      }

      // Format the code using Prettier
      const formattedCode = prettier.format(code, {
        parser: "babel",
        plugins: [parserBabel],
        semi: true,
        singleQuote: true,
      });

      updateCode(formattedCode, 0);
    } catch (error) {
      setOutput(`Error formatting code: ${error}`)
      setShowConsole(true)
    } 
  }; 
  const handleMonacoChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value)
    }
  }

  return (
    <div className="w-full h-[calc(100vh-4rem)] relative font-mono text-sm ">
      {useCodeEditor ? (
        <MonacoEditor
          height="100%"
          defaultLanguage="javascript"
          theme="vs-dark"
          value={code}
          onChange={handleMonacoChange}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
          }}
        />
      ) : (
        <div className="flex w-full">
        {/* Line Numbers */}
        <div
          ref={lineNumbersRef}
          className="top-0 left-0 w-12 min-h-screen bg-[#1e1e1e] text-right pr-2 overflow-hidden"
          style={{
            paddingTop: "0.5rem",
          }}
        >
          {code.split("\n").map((_, index) => (
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
          className="w-full min-h-screen p-2 pl-6 bg-[#272727] text-white rounded-none resize-none outline-none"
          value={code}
          placeholder="Write your JavaScript code here..."
          style={{
            lineHeight: "1.5rem",
            overflowY: "hidden", 
            whiteSpace: "pre-wrap", 
            wordBreak: "break-word", 
          }}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          rows={1} 
          spellCheck={false}
        />
      </div>
      )}
    </div>
  )
};

export default TextEditor;