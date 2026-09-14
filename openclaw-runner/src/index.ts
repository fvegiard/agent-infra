import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { writeFile, readFile, mkdir, readdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse, Server } from "node:http";

const OPENCLAW_BIN = process.env.OPENCLAW_BIN ?? "/home/francis-v/.local/share/openclaw-global/bin/openclaw";
const PORT = Number(process.env.OPENCLAW_RUNNER_PORT ?? 7890);
const BIND = process.env.OPENCLAW_RUNNER_BIND ?? "127.0.0.1";
const RUNS_DIR = process.env.OPENCLAW_RUNNER_RUNS_DIR ?? "/home/francis-v/.local/state/openclaw-runner-runs";
const GATEWAY_TOKEN_FILE = "/home/francis-v/.config/francis/openclaw-gateway.token";
const DEFAULT_MODEL = "ollama/gemma4-64k";
const RUN_TIMEOUT_MS = 600_000;

interface RagRequestBody {
  action?: "agent" | "rag";
  task?: string;
  question?: string;
  paths?: string[];
  model?: string;
}

interface RunRecord {
  id: string;
  action: string;
  task: string;
  status: "queued" | "running" | "done" | "error";
  created_at: string;
  completed_at?: string;
  reply?: string;
  stderr?: string;
  exit_code?: number;
  model?: string;
}

async function ensureRunsDir(): Promise<void> {
  await mkdir(RUNS_DIR, { recursive: true });
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function jsonResponse(res: ServerResponse, code: number, body: unknown): void {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function saveRun(r: RunRecord): Promise<void> {
  await ensureRunsDir();
  await writeFile(`${RUNS_DIR}/${r.id}.json`, JSON.stringify(r, null, 2));
}

async function invokeOpenClaw(
  task: string,
  model: string,
  run: RunRecord,
): Promise<RunRecord> {
  run.status = "running";
  await saveRun(run);

  const { promise, resolve } = Promise.withResolvers<RunRecord>();

  const proc = spawn(
    OPENCLAW_BIN,
    ["agent", "--json", "--model", model, "--message", task],
    {
      env: {
        ...process.env,
        OLLAMA_HOST: process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434",
        OLLAMA_API_KEY: process.env.OLLAMA_API_KEY ?? "ollama",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let stdout = "";
  let stderr = "";
  const timeout = setTimeout(() => {
    proc.kill("SIGTERM");
    run.status = "error";
    run.stderr = (run.stderr ?? "") + `\nTIMEOUT after ${RUN_TIMEOUT_MS}ms`;
  }, RUN_TIMEOUT_MS);

  proc.stdout.on("data", (d) => { stdout += d.toString("utf8"); });
  proc.stderr.on("data", (d) => { stderr += d.toString("utf8"); });

  proc.on("close", async (code) => {
    clearTimeout(timeout);
    run.exit_code = code ?? -1;
    run.completed_at = new Date().toISOString();
    run.stderr = stderr.slice(0, 2000);
    try {
      const data = JSON.parse(stdout);
      const texts: string[] = [];
      const walk = (o: unknown): void => {
        if (typeof o !== "object" || o === null) return;
        if (Array.isArray(o)) { o.forEach(walk); return; }
        const rec = o as Record<string, unknown>;
        if (typeof rec.text === "string" && rec.text.length > 0) texts.push(rec.text);
        Object.values(rec).forEach(walk);
      };
      walk(data);
      run.reply = texts.at(-1) ?? "";
      run.status = run.reply ? "done" : "error";
    } catch {
      run.reply = stdout.slice(0, 4000);
      run.status = code === 0 ? "done" : "error";
    }
    await saveRun(run);
    resolve(run);
  });

  proc.on("error", async (err) => {
    clearTimeout(timeout);
    run.status = "error";
    run.stderr = String(err);
    run.completed_at = new Date().toISOString();
    await saveRun(run);
    resolve(run);
  });

  return promise;
}

function buildRagTask(question: string, paths: string[]): string {
  const listed = paths.map((p) => `- ${p}`).join("\n");
  return [
    "You must answer the user's question by first READING the files listed below, then citing specific facts from them.",
    "If the files do not contain the answer, reply exactly: NOT_IN_CORPUS",
    "Files to read first:",
    listed,
    "",
    "Question: " + question,
  ].join("\n");
}

async function handleRun(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") return jsonResponse(res, 405, { error: "method_not_allowed" });
  let parsed: RagRequestBody;
  try { parsed = JSON.parse(await readBody(req)); } catch {
    return jsonResponse(res, 400, { error: "bad_json" });
  }
  const action = parsed.action ?? "agent";
  const model = parsed.model ?? DEFAULT_MODEL;

  let task: string | undefined;
  if (action === "agent") task = parsed.task?.trim();
  else if (action === "rag") {
    const q = parsed.question?.trim();
    if (!q) return jsonResponse(res, 400, { error: "missing question" });
    const paths = parsed.paths?.length
      ? parsed.paths
      : [
        "/home/francis-v/.config/francis/AGENTS.md",
        "/home/francis-v/.config/francis/toolchain.md",
        "/home/francis-v/code/vendor/adr-tools/doc/adr/0001-record-architecture-decisions.md",
        "/home/francis-v/cloudflare/AGENTS.md",
      ];
    task = buildRagTask(q, paths);
  } else {
    return jsonResponse(res, 400, { error: "unknown action" });
  }
  if (!task) return jsonResponse(res, 400, { error: "missing task" });

  const record: RunRecord = {
    id: randomBytes(6).toString("hex"),
    action, task, model,
    status: "queued",
    created_at: new Date().toISOString(),
  };
  const result = await invokeOpenClaw(task, model, record);
  jsonResponse(res, result.status === "done" ? 200 : 500, result);
}

async function handleGetRun(res: ServerResponse, id: string | undefined): Promise<void> {
  if (!id) return jsonResponse(res, 400, { error: "missing id" });
  try {
    const raw = await readFile(`${RUNS_DIR}/${id}.json`, "utf8");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(raw);
  } catch {
    jsonResponse(res, 404, { error: "not_found" });
  }
}

async function handleListRuns(res: ServerResponse): Promise<void> {
  const files = (await readdir(RUNS_DIR).catch(() => [] as string[]))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse()
    .slice(0, 20);
  const records: RunRecord[] = [];
  for (const f of files) {
    try { records.push(JSON.parse(await readFile(`${RUNS_DIR}/${f}`, "utf8"))); } catch { /* skip */ }
  }
  jsonResponse(res, 200, { records });
}

const server: Server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const path = url.pathname;
  if (path === "/health") return jsonResponse(res, 200, { ok: true, ts: new Date().toISOString() });
  if (path === "/v1/run") return handleRun(req, res);
  const runMatch = path.match(/^\/v1\/run\/([a-f0-9]+)$/);
  if (runMatch) {
    if (req.method === "GET") return handleGetRun(res, runMatch[1]);
    return jsonResponse(res, 405, { error: "method_not_allowed" });
  }
  if (path === "/v1/runs" && req.method === "GET") return handleListRuns(res);
  if (path === "/v1/token-check" && req.method === "GET") {
    const tok = (await readFile(GATEWAY_TOKEN_FILE, "utf8")).trim();
    return jsonResponse(res, 200, { has_token: tok.length > 0, model_default: DEFAULT_MODEL });
  }
  return jsonResponse(res, 404, { error: "not_found", path });
});

await ensureRunsDir();
server.listen(PORT, BIND, () => {
  process.stdout.write(`openclaw-runner listening on ${BIND}:${PORT}\n`);
});
