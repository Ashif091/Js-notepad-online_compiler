import { NextResponse } from "next/server";
import { Isolate, Reference } from "isolated-vm";
import * as acorn from "acorn"; // For syntax validation
import * as esprima from "esprima"; // For parsing into AST
import * as escodegen from "escodegen"; // For generating code from AST

// Define a custom AstNode type
type AstNode = {
  type: string;
  loc?: { start: { line: number; column: number }; end?: { line: number; column: number } };
  body?: AstNode[];
  expression?: AstNode;
  callee?: AstNode;
  name?: string;
  arguments?: AstNode[];
  declarations?: AstNode[];
  init?: AstNode;
  test?: AstNode;
  consequent?: AstNode;
  alternate?: AstNode;
  object?: AstNode;
  property?: AstNode;
  value?: AstNode;
  key?: AstNode;
  params?: AstNode[];
  id?: AstNode;
  superClass?: AstNode;
  instrumented?: boolean; // Custom property for instrumentation
  [key: string]: unknown;
};

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    // 1. Validate the syntax using acorn
    try {
      acorn.parse(code, { ecmaVersion: 2023 });
    } catch (syntaxError: unknown) {
      const { message, loc } = syntaxError as { message: string; loc?: { line: number; column: number } };
      const errorMessage = loc
        ? `Syntax Error at line ${loc.line}, column ${loc.column}: ${message}`
        : `Syntax Error: ${message}`;
      return NextResponse.json({ success: false, error: errorMessage, line: loc?.line || null });
    }

    // 2. Parse the code into an AST using esprima
    const ast = esprima.parseScript(code, { loc: true }) as unknown as AstNode;

    // 3. Instrument the AST (wrap statements in try/catch where needed)
    const instrumentAst = (node: AstNode): AstNode => {
      if (!node || typeof node !== "object") return node;
      // Skip instrumentation for several node types:
      if (
        node.type === "ClassDeclaration" ||
        node.type === "MethodDefinition" ||
        node.type === "FunctionDeclaration" ||
        node.type === "FunctionExpression" ||
        node.type === "ReturnStatement"
      ) {
        return node;
      }
      if (
        node.type === "ExpressionStatement" &&
        node.expression?.type === "CallExpression" &&
        node.expression.callee?.type === "Identifier" &&
        ["setTimeout", "setInterval"].includes(node.expression.callee.name ?? "")
      ) {
        return node;
      }
      if (node.type === "Program" && node.body) {
        node.body = node.body.map((stmt: AstNode) => {
          if (
            stmt.type === "ClassDeclaration" ||
            stmt.type === "FunctionDeclaration" ||
            stmt.type === "VariableDeclaration"
          ) {
            return stmt;
          }
          const originalCode = escodegen.generate(stmt);
          const lineNumber = stmt.loc?.start.line;
          const tryCatchNode: AstNode = esprima
            .parseScript(
              `
            try {
              ${originalCode};
            } catch (error) {
              throw new Error(\`Runtime Error at line ${lineNumber}: \${error.message}\`);
            }
          `,
              { loc: true }
            )
            .body[0] as unknown as AstNode;
          tryCatchNode.instrumented = true;
          return tryCatchNode;
        });
      }
      for (const key in node) {
        if (node[key] && typeof node[key] === "object") {
          node[key] = instrumentAst(node[key] as AstNode);
        }
      }
      return node;
    };

    const instrumentedAst = instrumentAst(ast);
    const instrumentedCode = escodegen.generate(instrumentedAst);

    // 4. Create a new isolate (sandbox) and a context
    const isolate = new Isolate({ memoryLimit: 128 });
    const context = await isolate.createContext();

    // 5. Prepare a logs array to capture output from the sandbox
    const logs: string[] = [];

    // 6. Create a log function reference that pushes logs into our logs array.
    //    This function runs outside the sandbox.
    const logFunction = new Reference((...args: unknown[]) => {
      logs.push(args.join(" "));
    });
    await context.global.set("log", logFunction);

    // 7. Override console.log inside the sandbox.
    //    We define the override entirely inside the sandbox so that it only
    //    uses sandbox values and calls our external log function with a string.
    await context.eval(`
      globalThis.console = {
        log: function() {
          var args = Array.from(arguments);
          var formatted = args.map(function(arg) {
            var tag = Object.prototype.toString.call(arg);
            if (tag === "[object Map]") {
              var entries = Array.from(arg.entries()).map(function(entry) {
                var key = (typeof entry[0] === "string") ? ("'" + entry[0] + "'") : String(entry[0]);
                var value = (typeof entry[1] === "string") ? ("'" + entry[1] + "'") : String(entry[1]);
                return key + " => " + value;
              }).join(", ");
              return "Map(" + arg.size + ") { " + entries + " }";
            }
            if (tag === "[object Set]") {
              var items = Array.from(arg).map(function(item) {
                return (typeof item === "string") ? ("'" + item + "'") : String(item);
              }).join(", ");
              return "Set(" + arg.size + ") { " + items + " }";
            }
            // For plain objects, pretty-print them
            if (tag === "[object Object]") {
              return JSON.stringify(arg, null, 2);
            }
            // For arrays, print them in a single line
            if (tag === "[object Array]") {
              return JSON.stringify(arg);
            }
            try {
              return JSON.stringify(arg);
            } catch(e) {
              return "[Unserializable Object]";
            }
          });
          globalThis.log.applySync(undefined, [formatted.join(" ")]);
        }
      };
    `);

    // 8. Expose some global functions (if needed) like setTimeout and setInterval.
    const setTimeoutRef = new Reference(setTimeout.bind(global));
    const setIntervalRef = new Reference(setInterval.bind(global));
    await context.global.set("setTimeout", setTimeoutRef);
    await context.global.set("setInterval", setIntervalRef);

    // 9. Wrap the instrumented user code in an IIFE and compile it.
    const script = await isolate.compileScript(`(function() {
      ${instrumentedCode}
    })();`);

    // 10. Run the script in the sandbox.
    try {
      await script.run(context, { timeout: 5000 });
    } catch (runtimeError: unknown) {
      const error = runtimeError as { message: string };
      const match = error.message.match(/Runtime Error at line (\\d+)/);
      const lineNumber = match ? parseInt(match[1], 10) : null;
      return NextResponse.json({ success: false, error: error.message, line: lineNumber || null });
    }

    return NextResponse.json({ success: true, output: logs.join("\n") });
  } catch (error: unknown) {
    const err = error as { message: string };
    return NextResponse.json({ success: false, error: err.message });
  }
}
