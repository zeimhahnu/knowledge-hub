import {
  ANALYST_ERROR_CODES,
  type AnalystCitation,
  type AnalystErrorCode,
  type AnalystStreamEvent,
  type AnalystTurnRequest,
} from "./types.ts";

const MAX_TEXT = 20_000;
const MAX_SOURCES = 32;

export class AnalystStreamError extends Error {
  readonly code: AnalystErrorCode;
  readonly retryable: boolean;

  constructor(code: AnalystErrorCode, message: string, retryable: boolean) {
    super(message);
    this.name = "AnalystStreamError";
    this.code = code;
    this.retryable = retryable;
  }
}

function nonEmptyString(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function citation(value: unknown): value is AnalystCitation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const source = value as Record<string, unknown>;
  if (source.kind === "document") {
    return Object.keys(source).every((key) => ["kind", "ref", "label"].includes(key)) &&
      nonEmptyString(source.ref, 500) && nonEmptyString(source.label, 200);
  }
  if (source.kind === "url") {
    if (!Object.keys(source).every((key) => ["kind", "url", "label"].includes(key)) ||
      !nonEmptyString(source.url, 2_000) || !nonEmptyString(source.label, 200)) return false;
    try {
      return new URL(source.url).protocol === "https:";
    } catch {
      return false;
    }
  }
  return false;
}

function citations(value: unknown): value is AnalystCitation[] {
  return Array.isArray(value) && value.length <= MAX_SOURCES && value.every(citation);
}

/** Reject malformed or extended server events before they reach UI state. */
export function parseAnalystStreamEvent(value: unknown): AnalystStreamEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AnalystStreamError("service_unavailable", "Malformed analyst stream event.", true);
  }
  const event = value as Record<string, unknown>;
  if (event.type === "status" && Object.keys(event).every((key) => ["type", "stage"].includes(key)) &&
    (event.stage === "validating" || event.stage === "retrieving" || event.stage === "reasoning")) {
    return { type: "status", stage: event.stage };
  }
  if (event.type === "delta" && Object.keys(event).every((key) => ["type", "text"].includes(key)) && nonEmptyString(event.text, MAX_TEXT)) {
    return { type: "delta", text: event.text };
  }
  if (event.type === "sources" && Object.keys(event).every((key) => ["type", "sources"].includes(key)) && citations(event.sources)) {
    return { type: "sources", sources: event.sources };
  }
  if (event.type === "done" && Object.keys(event).every((key) => ["type", "answer", "sources", "modelTier"].includes(key)) &&
    typeof event.answer === "string" && event.answer.length <= MAX_TEXT && citations(event.sources) &&
    (event.modelTier === "flash" || event.modelTier === "pro")) {
    return { type: "done", answer: event.answer, sources: event.sources, modelTier: event.modelTier };
  }
  if (event.type === "error" && Object.keys(event).every((key) => ["type", "code", "message", "retryable"].includes(key)) &&
    typeof event.code === "string" && (ANALYST_ERROR_CODES as readonly string[]).includes(event.code) &&
    nonEmptyString(event.message, 300) && typeof event.retryable === "boolean") {
    return { type: "error", code: event.code as AnalystErrorCode, message: event.message, retryable: event.retryable };
  }
  throw new AnalystStreamError("service_unavailable", "Malformed analyst stream event.", true);
}

function responseError(body: unknown, status: number): AnalystStreamError {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const event = body as Record<string, unknown>;
    if (event.type === "error" && typeof event.code === "string" &&
      (ANALYST_ERROR_CODES as readonly string[]).includes(event.code) &&
      nonEmptyString(event.message, 300) && typeof event.retryable === "boolean") {
      return new AnalystStreamError(event.code as AnalystErrorCode, event.message, event.retryable);
    }
  }
  return new AnalystStreamError(
    status === 403 ? "access_required" : "service_unavailable",
    status === 403 ? "Access identity required." : "Analyst service unavailable.",
    status !== 403,
  );
}

/** Read one strictly framed `data: <JSON>` SSE response. */
export async function readAnalystSse(
  response: Response,
  onEvent: (event: AnalystStreamEvent) => void,
): Promise<void> {
  if (!response.body) throw new AnalystStreamError("service_unavailable", "Analyst stream was empty.", true);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let dataLines: string[] = [];
  let terminal = false;

  const dispatch = () => {
    if (dataLines.length === 0) return;
    if (terminal) throw new AnalystStreamError("service_unavailable", "Analyst stream continued after completion.", true);
    let parsed: unknown;
    try {
      parsed = JSON.parse(dataLines.join("\n"));
    } catch {
      throw new AnalystStreamError("service_unavailable", "Malformed analyst stream event.", true);
    }
    dataLines = [];
    const event = parseAnalystStreamEvent(parsed);
    onEvent(event);
    if (event.type === "done" || event.type === "error") terminal = true;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      const lines = pending.split(/\r?\n/);
      pending = done ? "" : lines.pop() ?? "";
      for (const line of lines) {
        if (line === "") {
          dispatch();
        } else if (line.startsWith(":")) {
          continue;
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).replace(/^ /, ""));
        } else {
          throw new AnalystStreamError("service_unavailable", "Malformed analyst stream framing.", true);
        }
      }
      if (done) break;
    }
    if (pending) throw new AnalystStreamError("service_unavailable", "Incomplete analyst stream framing.", true);
    dispatch();
    if (!terminal) throw new AnalystStreamError("service_unavailable", "Analyst stream ended without completion.", true);
  } finally {
    reader.releaseLock();
  }
}

export async function streamAnalystTurn(
  request: AnalystTurnRequest,
  onEvent: (event: AnalystStreamEvent) => void,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  try {
    const response = await fetchImpl("/api/ca-analyst/turn", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "text/event-stream" },
      body: JSON.stringify(request),
      signal,
      cache: "no-store",
    });
    if (!response.ok) {
      let body: unknown = null;
      try { body = await response.json(); } catch { /* Map non-JSON safely. */ }
      throw responseError(body, response.status);
    }
    if (!/^text\/event-stream(?:;|$)/i.test(response.headers.get("content-type") ?? "")) {
      throw new AnalystStreamError("service_unavailable", "Analyst service returned an invalid response.", true);
    }
    await readAnalystSse(response, onEvent);
  } catch (error) {
    if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
      throw new AnalystStreamError("cancelled", "Analyst request cancelled.", false);
    }
    throw error;
  }
}
