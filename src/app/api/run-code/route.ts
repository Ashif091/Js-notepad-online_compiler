import { NextResponse } from 'next/server';
import { Isolate, Reference } from 'isolated-vm';
import * as acorn from 'acorn'; // For syntax validation
import * as esprima from 'esprima'; // Correctly import esprima
import * as escodegen from 'escodegen'; // For generating code from AST

type AstNode = {
  type: string;
  [key: string]: any; // Allow other properties
};

export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    // Validate the syntax of the user-provided code using acorn
    try {
      acorn.parse(code, { ecmaVersion: 2023 }); // Parse the code
    } catch (syntaxError: unknown) {
      const { message, loc } = syntaxError as { message: string; loc?: { line: number; column: number } };
      const errorMessage = loc
        ? `Syntax Error at line ${loc.line}, column ${loc.column}: ${message}`
        : `Syntax Error: ${message}`;
      return NextResponse.json({
        success: false,
        error: errorMessage,
        line: loc?.line || null, // Include the line number in the response
      });
    }
    // Parse the code into an Abstract Syntax Tree (AST)
    const ast = esprima.parseScript(code, { loc: true });
    // Helper function to recursively traverse and instrument the AST
    const instrumentAst = (node: AstNode): AstNode => {
      if (!node || typeof node !== 'object') {
        return node; // Base case: If the node is not an object, return it as-is
      }
      // Skip instrumentation for class declarations and their methods
      if (node.type === 'ClassDeclaration' || node.type === 'MethodDefinition') {
        return node;
      }
      // Skip instrumentation for function declarations and expressions
      if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
        return node;
      }
      // Skip instrumentation for `return` statements
      if (node.type === 'ReturnStatement') {
        return node;
      }
      // Skip instrumentation for global function calls like setTimeout, setInterval
      if (
        node.type === 'ExpressionStatement' &&
        node.expression?.type === 'CallExpression' &&
        node.expression.callee?.type === 'Identifier' &&
        ['setTimeout', 'setInterval'].includes(node.expression.callee.name)
      ) {
        return node;
      }
      if (node.type === 'Program') {
        // Wrap each top-level statement in a try-catch, except for skipped nodes
        node.body = node.body.map((stmt: AstNode) => {
          if (
            stmt.type === 'ClassDeclaration' ||
            stmt.type === 'FunctionDeclaration' ||
            stmt.type === 'VariableDeclaration'
          ) {
            // Skip wrapping class declarations, function declarations, and variable declarations
            return stmt;
          }
          const originalCode = escodegen.generate(stmt); // Generate code for the statement
          const lineNumber = stmt.loc?.start.line; // Get the starting line number of the statement
          const tryCatchNode: AstNode = esprima.parseScript(
            `
            try {
              ${originalCode};
            } catch (error) {
              throw new Error(\`Runtime Error at line ${lineNumber}: \${error.message}\`);
            }
          `,
            { loc: true }
          ).body[0]; // Parse the try-catch block back into an AST node
          // Mark the try-catch node as instrumented to prevent reprocessing
          tryCatchNode.instrumented = true;
          return tryCatchNode;
        });
      }
      // Recursively traverse child nodes
      for (const key in node) {
        if (node[key] && typeof node[key] === 'object') {
          node[key] = instrumentAst(node[key]); // Recurse into child nodes
        }
      }
      return node;
    };
    // Instrument the AST
    const instrumentedAst = instrumentAst(ast);
    // Generate the instrumented code from the modified AST
    const instrumentedCode = escodegen.generate(instrumentedAst);
    // Create a new isolate (sandbox)
    const isolate = new Isolate({ memoryLimit: 128 });
    const context = await isolate.createContext();
    const logs: string[] = [];
    const logFunction = new Reference((...args: unknown[]) => {
      logs.push(
        args
          .map(arg => {
            try {
              return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
            } catch {
              return '[Unserializable Object]';
            }
          })
          .join(' ')
      );
    });
    await context.global.set('log', logFunction);
    await context.evalClosure(
      `
      globalThis.console = {
        log: (...args) => log.applySync(undefined, args.map(arg => {
          try {
            return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
          } catch {
            return '[Unserializable Object]';
          }
        }))
      };
    `,
      [logFunction],
      { arguments: { reference: true } }
    );
    // Expose global functions like setTimeout and setInterval
    const setTimeoutRef = new Reference(setTimeout.bind(global));
    const setIntervalRef = new Reference(setInterval.bind(global));

    await context.global.set('setTimeout', setTimeoutRef);
    await context.global.set('setInterval', setIntervalRef);
    // Wrap the instrumented code in an IIFE to avoid syntax issues
    const script = await isolate.compileScript(`(function() {
      ${instrumentedCode}
    })();`);
    try {
      await script.run(context, { timeout: 5000 });
    } catch (runtimeError: unknown) {
      const error = runtimeError as { message: string };
      // Extract line number from the runtime error message
      const match = error.message.match(/Runtime Error at line (\d+)/);
      const lineNumber = match ? parseInt(match[1], 10) : null;
      return NextResponse.json({
        success: false,
        error: error.message,
        line: lineNumber || null, // Include the line number in the response
      });
    }
    return NextResponse.json({ success: true, output: logs.join('\n') });
  } catch (error: unknown) {
    const err = error as { message: string };
    return NextResponse.json({ success: false, error: err.message });
  }
}