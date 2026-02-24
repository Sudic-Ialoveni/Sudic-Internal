import Anthropic from '@anthropic-ai/sdk'
import { createContext, Script } from 'node:vm'
import type { ToolContext, ToolResult } from './index.js'

export const codeExecTools: Anthropic.Tool[] = [
  {
    name: 'run_code',
    description: 'Execute JavaScript code in a sandboxed environment. Useful for data calculations, transformations, formatting, or analysis. No filesystem or network access. Has access to Math, JSON, Date, Array, Object, and console.log (output is captured). Returns the value of the last expression or all console.log output.',
    input_schema: {
      type: 'object' as const,
      properties: {
        code: {
          type: 'string',
          description: 'JavaScript code to execute. Use console.log() for output or end with an expression to return its value.',
        },
        description: {
          type: 'string',
          description: 'Brief description of what this code does (shown to user)',
        },
      },
      required: ['code'],
    },
  },
]

export async function handleRunCode(
  input: { code: string; description?: string },
  _ctx: ToolContext,
): Promise<ToolResult> {
  const logs: string[] = []
  let result: unknown

  const sandbox = {
    Math,
    JSON,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    console: {
      log: (...args: unknown[]) => logs.push(args.map(a => JSON.stringify(a)).join(' ')),
      error: (...args: unknown[]) => logs.push('[error] ' + args.map(a => JSON.stringify(a)).join(' ')),
    },
    undefined,
    null: null,
  }

  createContext(sandbox)

  try {
    const script = new Script(`(function() { ${input.code} })()`, {
      timeout: 5000,
    })

    result = script.runInContext(sandbox, { timeout: 5000 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      error: `Code execution error: ${message}`,
      data: { logs },
    }
  }

  const output = {
    logs,
    result: result !== undefined ? result : undefined,
  }

  return { success: true, data: output }
}
