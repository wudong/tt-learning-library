/**
 * Agent runner — wraps pi SDK sessions.
 *
 * One shared AuthStorage + ModelRegistry. The first session bootstraps the
 * resource loader, which loads the pi-ollama-cloud package and registers the
 * ollama-cloud models into the registry. After that, `modelRegistry.find()`
 * resolves every step's model.
 */
import {
  AuthStorage,
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  ModelRegistry,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import type { ModelSpec } from "./config.ts";

const authStorage = AuthStorage.create();
const modelRegistry = ModelRegistry.create(authStorage);

let warmedUp = false;

/** Warm up the registry so package-registered models (ollama-cloud/*) resolve. */
async function warmup(): Promise<void> {
  if (warmedUp) return;
  const { session } = await createAgentSession({
    sessionManager: SessionManager.inMemory(),
    authStorage,
    modelRegistry,
  });
  session.dispose();
  warmedUp = true;
}

export async function resolveModel(spec: ModelSpec) {
  const m = modelRegistry.find(spec.provider, spec.id);
  if (!m) {
    const avail = (await modelRegistry.getAvailable()).map((x: any) => `${x.provider}/${x.id}`);
    throw new Error(
      `Model ${spec.provider}/${spec.id} not found. Available: ${avail.join(", ") || "(none)"}`,
    );
  }
  return m;
}

export interface RunAgentOpts {
  spec: ModelSpec;
  cwd: string;
  prompt: string;
  systemAppend?: string;
  tools?: string[]; // default read/bash/edit/write
  label?: string;
  /** Cap how long a single agent run may take (ms). */
  timeoutMs?: number;
}

export interface AgentResult {
  text: string; // last assistant message
  toolErrors: { tool: string; message: string }[];
}

function lastAssistantText(messages: any[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "assistant" && Array.isArray(m.content)) {
      const text = m.content
        .filter((c: any) => c.type === "text" && typeof c.text === "string")
        .map((c: any) => c.text)
        .join("\n")
        .trim();
      if (text.length) return text;
    }
  }
  return "";
}

export async function runAgent(opts: RunAgentOpts): Promise<AgentResult> {
  await warmup();
  const model = await resolveModel(opts.spec);

  const settingsManager = SettingsManager.inMemory({
    compaction: { enabled: false },
    retry: { enabled: true, maxRetries: 2 },
  });

  const resourceLoader = new DefaultResourceLoader({
    cwd: opts.cwd,
    agentDir: getAgentDir(),
    appendSystemPrompt: opts.systemAppend ? [opts.systemAppend] : undefined,
    settingsManager,
  });
  await resourceLoader.reload();

  const { session } = await createAgentSession({
    cwd: opts.cwd,
    model,
    thinkingLevel: opts.spec.thinking,
    authStorage,
    modelRegistry,
    settingsManager,
    resourceLoader,
    tools: opts.tools ?? ["read", "bash", "edit", "write"],
    sessionManager: SessionManager.inMemory(opts.cwd),
  });

  const tag = opts.label ?? `${opts.spec.provider}/${opts.spec.id}`;
  const toolErrors: { tool: string; message: string }[] = [];
  let chars = 0;

  const unsub = session.subscribe((event: any) => {
    switch (event.type) {
      case "message_update": {
        const e: any = event.assistantMessageEvent;
        if (e.type === "text_delta") {
          if (chars === 0) process.stdout.write(`[${tag}] `);
          process.stdout.write(e.delta);
          chars += e.delta.length;
        }
        break;
      }
      case "tool_execution_start":
        process.stdout.write(`\n[${tag}] ⚒ ${event.toolName}\n`);
        break;
      case "tool_execution_end":
        if (event.isError) {
          const msg = typeof event.result === "string" ? event.result.slice(0, 200) : "(error)";
          toolErrors.push({ tool: event.toolName, message: msg });
          process.stdout.write(`[${tag}] ⚒ ${event.toolName} ERROR: ${msg}\n`);
        }
        break;
      case "agent_end":
        if (chars > 0) process.stdout.write("\n");
        break;
    }
  });

  try {
    const runPromise = session.prompt(opts.prompt);
    if (opts.timeoutMs) {
      await Promise.race([
        runPromise,
        new Promise<void>((_, rej) =>
          setTimeout(() => rej(new Error(`agent timed out after ${opts.timeoutMs}ms`)), opts.timeoutMs),
        ),
      ]);
    } else {
      await runPromise;
    }
    const text = lastAssistantText(session.messages as any[]) || "(no output)";
    return { text, toolErrors };
  } finally {
    unsub();
    session.dispose();
  }
}

/** Extract the first fenced or header-delimited section from agent text. */
export function extractSection(text: string, header: string): string {
  const re = new RegExp(`^###\\s+${header}\\s*$([\\s\\S]*?)(?=^###\\s|\\s*$)`, "m");
  const m = text.match(re);
  if (m) return m[1].trim();
  return "";
}

export function extractFence(text: string, lang: string): string {
  const re = new RegExp("```" + lang + "\\s*\\n([\\s\\S]*?)```");
  const m = text.match(re);
  return m ? m[1].trim() : "";
}