"use client";

import { useEffect, useRef } from "react";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";

export function useHandleSessionHistory() {
  const {
    transcriptItems,
    addTranscriptBreadcrumb,
    addTranscriptToolNote,
    addTranscriptMessage,
    updateTranscriptMessage,
    updateTranscriptItem,
  } = useTranscript();

  const { logServerEvent } = useEvent();

  const transcriptItemsRef = useRef(transcriptItems);
  const shouldLogServerSide = process.env.NEXT_PUBLIC_LOG_TRANSCRIPTS === 'true';
  const showDebugTranscript = process.env.NEXT_PUBLIC_DEBUG_TRANSCRIPT === 'true';
  const transcriptionDebugEnabled = showDebugTranscript;
  const messageLogStateRef = useRef(new Map<string, string>());
  const toolLogSetRef = useRef(new Set<string>());
  const toolNoteIdMapRef = useRef(new Map<string, string>());
  const transcriptionLogSetRef = useRef(new Set<string>());

  useEffect(() => {
    transcriptItemsRef.current = transcriptItems;
  }, [transcriptItems]);

  const postToServerLog = (payload: Record<string, unknown>) => {
    if (!shouldLogServerSide || typeof window === 'undefined') return;
    try {
      const body = JSON.stringify({
        ...payload,
        ts: new Date().toISOString(),
      });

      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon('/api/transcript-log', blob);
      } else {
        fetch('/api/transcript-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch (error) {
      console.warn('Failed to forward transcript log:', error);
    }
  };

  const logMessageToServer = (itemId: string | undefined, role: string, text: string) => {
    if (!itemId) return;
    const trimmed = text?.trim();
    if (!trimmed) return;

    const previous = messageLogStateRef.current.get(itemId);
    if (previous === trimmed) return;

    messageLogStateRef.current.set(itemId, trimmed);
    postToServerLog({ kind: 'message', itemId, role, text: trimmed });
  };

  const logToolToServer = (toolId: string | undefined, entry: Record<string, unknown>) => {
    if (!toolId) return;
    if (toolLogSetRef.current.has(toolId)) return;
    toolLogSetRef.current.add(toolId);
    postToServerLog({ kind: 'tool', toolId, ...entry });
  };

  const hasRenderableContent = (value: any) => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }
    return true;
  };

  const ensureToolNote = (
    rawToolId: string | undefined,
    toolName: string,
    status: 'IN_PROGRESS' | 'DONE',
    partialData?: Record<string, any>,
  ) => {
    const toolId = typeof rawToolId === 'string' && rawToolId.trim().length > 0
      ? rawToolId.trim()
      : undefined;

    if (!toolId) {
      // Without a stable tool identifier we can't safely track the note lifecycle.
      return undefined;
    }

    let synthesizedId = toolNoteIdMapRef.current.get(toolId);

    if (!synthesizedId) {
      synthesizedId = `tool-${toolId}`;
      toolNoteIdMapRef.current.set(toolId, synthesizedId);
    }

    const existing = transcriptItemsRef.current.find((item) => item.itemId === synthesizedId);
    const existingData = (existing?.data ?? {}) as Record<string, any>;
    const incomingData = partialData && Object.keys(partialData).length > 0 ? partialData : undefined;
    const mergedData = incomingData ? { ...existingData, ...incomingData } : existingData;
    const normalizedData = Object.keys(mergedData).length > 0 ? mergedData : undefined;

    if (!existing) {
      addTranscriptToolNote(toolName, normalizedData, { itemId: synthesizedId, status });
    } else {
      updateTranscriptItem(synthesizedId, {
        status,
        data: normalizedData,
        title: toolName || existing.title,
      });
    }

    return synthesizedId;
  };

  const ensureTranscriptMessage = (
    itemId: string,
    role: "user" | "assistant",
    initialText = "",
  ) => {
    const existing = transcriptItemsRef.current.find(
      (item) =>
        item.itemId === itemId &&
        item.type === "MESSAGE" &&
        item.role === role,
    );

    if (!existing) {
      addTranscriptMessage(itemId, role, initialText);
    }
  };

  const ensureUserTranscriptMessage = (itemId: string, initialText = "") => {
    ensureTranscriptMessage(itemId, "user", initialText);
  };

  const resolveTranscriptRole = (
    itemId: string | null | undefined,
  ): "user" | "assistant" | undefined => {
    if (!itemId) return undefined;
    const entry = transcriptItemsRef.current.find(
      (item) => item.itemId === itemId && item.type === "MESSAGE",
    );
    if (entry?.role === "user" || entry?.role === "assistant") {
      return entry.role;
    }
    return undefined;
  };

  /* ----------------------- helpers ------------------------- */

  const extractMessageText = (content: any[] = []): string => {
    if (!Array.isArray(content)) return "";

    const parts = content
      .map((c) => {
        if (!c || typeof c !== "object") return "";
        if (c.type === "input_text") return c.text ?? "";
        if (c.type === "audio") return c.transcript ?? "";
        if (c.type === "input_audio") return c.transcript ?? "";
        if (c.type === "input_image") return "[Image attachment]";
        return "";
      })
      .filter(Boolean)
      .join("\n");

    return parts;
  };

  const extractFunctionCallByName = (name: string, content: any[] = []): any => {
    if (!Array.isArray(content)) return undefined;
    return content.find((c: any) => c.type === 'function_call' && c.name === name);
  };

  const maybeParseJson = (val: any) => {
    if (typeof val !== 'string') return val;

    const trimmed = val.trim();
    if (!trimmed) {
      return undefined;
    }

    const looksJsonLike = trimmed.startsWith('{') || trimmed.startsWith('[');
    if (!looksJsonLike) {
      return val;
    }

    try {
      return JSON.parse(trimmed);
    } catch (error) {
      const preview = trimmed.length > 160 ? `${trimmed.slice(0, 157)}…` : trimmed;
      console.warn('Failed to parse JSON payload', { preview, error: error instanceof Error ? error.message : String(error) });
      return val;
    }
  };

  const extractLastAssistantMessage = (history: any[] = []): any => {
    if (!Array.isArray(history)) return undefined;
    return history.reverse().find((c: any) => c.type === 'message' && c.role === 'assistant');
  };

  const extractModeration = (obj: any) => {
    if ('moderationCategory' in obj) return obj;
    if ('outputInfo' in obj) return extractModeration(obj.outputInfo);
    if ('output' in obj) return extractModeration(obj.output);
    if ('result' in obj) return extractModeration(obj.result);
  };

  // Temporary helper until the guardrail_tripped event includes the itemId in the next version of the SDK
  const sketchilyDetectGuardrailMessage = (text: string) => {
    return text.match(/Failure Details: (\{.*?\})/)?.[1];
  };

  /* ----------------------- event handlers ------------------------- */

  function handleAgentToolStart(details: any, _agent: any, functionCall: any) {
    const lastFunctionCall = extractFunctionCallByName(functionCall.name, details?.context?.history);
    const function_name = lastFunctionCall?.name;
    const function_args = lastFunctionCall?.arguments;

    if (showDebugTranscript) {
      addTranscriptBreadcrumb(
        `function call: ${function_name}`,
        function_args
      );
    }
    const displayName = function_name ?? functionCall?.name ?? 'tool_call';
    const parsedArgs = maybeParseJson(function_args ?? functionCall?.arguments ?? {});
    // Start a TOOL_NOTE in progress so UI shows a live "processing" chip
    const toolItemId = `tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    addTranscriptToolNote(displayName, parsedArgs, { itemId: toolItemId, status: 'IN_PROGRESS' });
    // Stash the synthetic tool item id on the functionCall so end can resolve it
    (functionCall as any).__transcript_tool_item_id = toolItemId;
  }
  function handleAgentToolEnd(details: any, _agent: any, _functionCall: any, result: any) {
    const lastFunctionCall = extractFunctionCallByName(_functionCall.name, details?.context?.history);
    if (showDebugTranscript) {
      addTranscriptBreadcrumb(
        `function call result: ${lastFunctionCall?.name}`,
        maybeParseJson(result)
      );
    }
    // Finalize the in-progress TOOL_NOTE if we created one at start
    const noteId = (_functionCall as any).__transcript_tool_item_id as string | undefined;
    if (noteId && typeof noteId === 'string') {
      try {
        updateTranscriptItem(noteId, { status: 'DONE' });
      } catch {}
    }
  }

  function handleHistoryAdded(item: any) {
    if (!item || item.type !== 'message') return;

    const { itemId, role, content = [] } = item;
    if (itemId && role) {
      const isUser = role === "user";
      let text = extractMessageText(content);

      if (isUser && !text) {
        text = "[Transcribing...]";
      }

      emitTranscriptionDebug('history_added', {
        itemId,
        role,
        text,
        rawContent: content,
      });

      // If the guardrail has been tripped, this message is a message that gets sent to the 
      // assistant to correct it, so we add it as a breadcrumb instead of a message.
      const guardrailMessage = sketchilyDetectGuardrailMessage(text);
      if (guardrailMessage) {
        const failureDetails = JSON.parse(guardrailMessage);
        addTranscriptBreadcrumb('Output Guardrail Active', { details: failureDetails });
      } else {
        addTranscriptMessage(itemId, role, text);
        logMessageToServer(itemId, role, text);
      }
    }
  }

  function handleHistoryUpdated(items: any[]) {
    items.forEach((item: any) => {
      if (!item || item.type !== 'message') return;

      const { itemId, content = [] } = item;

      const text = extractMessageText(content);

      if (process.env.NODE_ENV !== 'production') {
        console.info('[dexter transcript] history_updated', {
          itemId,
          role: item.role,
          content,
          text,
        });
      }

      emitTranscriptionDebug('history_updated', {
        itemId,
        role: item.role ?? 'assistant',
        text,
        content,
      });

      if (text) {
        updateTranscriptMessage(itemId, text, false);
        logMessageToServer(itemId, item.role ?? 'assistant', text);
      }
    });
  }

  const emitTranscriptionDebug = (() => {
    let sent = 0;
    const MAX_EVENTS = 40;
    return (tag: string, payload: Record<string, any>) => {
      if (!transcriptionDebugEnabled) return;
      if (typeof window === 'undefined') return;
      if (sent >= MAX_EVENTS) return;
      sent += 1;
      const body = JSON.stringify({ tag, payload, ts: Date.now() });
      try {
        if (navigator?.sendBeacon) {
          const blob = new Blob([body], { type: 'application/json' });
          navigator.sendBeacon('/api/transcription-debug', blob);
        } else {
          void fetch('/api/transcription-debug', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body,
            keepalive: true,
          });
        }
      } catch (err) {
        console.debug('transcription debug beacon failed', err);
      }
    };
  })();

  const findLatestUserTranscriptItem = (statuses: Array<'IN_PROGRESS' | 'DONE'> = ['IN_PROGRESS']) => {
    for (let i = transcriptItemsRef.current.length - 1; i >= 0; i--) {
      const entry = transcriptItemsRef.current[i];
      if (
        entry.type === 'MESSAGE' &&
        entry.role === 'user' &&
        statuses.includes(entry.status as 'IN_PROGRESS' | 'DONE')
      ) {
        return entry;
      }
    }
    return undefined;
  };

  function handleTranscriptionDelta(
    item: any,
    roleHint: 'user' | 'assistant' | 'auto' = 'assistant',
  ) {
    const itemId =
      item?.item_id ??
      item?.item?.id ??
      item?.id ??
      item?.message_id ??
      item?.response_id ??
      null;

    const deltaText = (() => {
      if (typeof item?.delta === 'string') return item.delta;
      if (typeof item?.transcript === 'string') return item.transcript;
      if (typeof item?.item?.delta === 'string') return item.item.delta;
      if (typeof item?.item?.transcript === 'string') return item.item.transcript;

      const content = Array.isArray(item?.content) ? item.content : [];
      for (const c of content) {
        if (c && typeof c === 'object') {
          if (typeof c.delta === 'string') return c.delta;
          if (typeof c.text === 'string') return c.text;
          if (typeof c.transcript === 'string') return c.transcript;
        }
      }
      return '';
    })();

    let targetItemId = itemId;
    if (!targetItemId) {
      const fallback = findLatestUserTranscriptItem(['IN_PROGRESS']);
      targetItemId = fallback?.itemId ?? null;
      if (transcriptionDebugEnabled) {
        logServerEvent(
          {
            type: 'transcription.delta_unmatched_item',
            role: roleHint,
            receivedKeys: Object.keys(item || {}),
            fallbackItemId: targetItemId,
          },
          '(voice streaming)'
        );
      }
      emitTranscriptionDebug('delta_unmatched_item', {
        role: roleHint,
        keys: Object.keys(item || {}),
        item,
        fallbackItemId: targetItemId,
      });
    }

    if (!targetItemId) {
      emitTranscriptionDebug('delta_no_target', {
        role: roleHint,
        item,
      });
      return;
    }

    const autoFallback =
      typeof item?.response_id === 'string' || typeof item?.output_index === 'number'
        ? 'assistant'
        : 'user';
    const resolvedRole =
      roleHint === 'auto'
        ? item?.role === 'user' || item?.role === 'assistant'
          ? item.role
          : resolveTranscriptRole(targetItemId) ?? autoFallback
        : roleHint;

    if (resolvedRole === 'user') {
      ensureUserTranscriptMessage(targetItemId);
    } else {
      ensureTranscriptMessage(targetItemId, 'assistant');
    }

    if (!deltaText) {
      emitTranscriptionDebug('delta_empty', {
        role: resolvedRole,
        itemId: targetItemId,
        item,
      });
      return;
    }

    updateTranscriptMessage(targetItemId, deltaText, true);
    emitTranscriptionDebug('delta_update', {
      role: resolvedRole,
      itemId: targetItemId,
      deltaText,
    });

    const logKey = `${resolvedRole}:${targetItemId}`;
    if (transcriptionDebugEnabled && !transcriptionLogSetRef.current.has(logKey)) {
      transcriptionLogSetRef.current.add(logKey);
      logServerEvent(
        {
          type: 'transcription.delta',
          role: resolvedRole,
          itemId: targetItemId,
          preview: deltaText.slice(0, 80),
        },
        '(voice streaming)'
      );
    }
  }

  function handleTranscriptionCompleted(
    item: any,
    roleHint: 'user' | 'assistant' | 'auto' = 'assistant',
  ) {
    // History updates don't reliably end in a completed item, 
    // so we need to handle finishing up when the transcription is completed.
    let itemId = item.item_id || item.id || item?.message_id;
    const finalTranscript =
      typeof item.transcript === 'string' && item.transcript.trim().length > 0
        ? item.transcript
        : (() => {
            // Some transports tuck the transcript inside a content array
            const content = Array.isArray(item?.content) ? item.content : [];
            for (const c of content) {
              if (c && typeof c === 'object' && (c.type === 'input_audio' || c.type === 'audio')) {
                const t = (c as any).transcript;
                if (typeof t === 'string' && t.trim().length > 0) return t;
              }
            }
            return "[inaudible]";
          })();
    if (!itemId) {
      const fallback = findLatestUserTranscriptItem(['IN_PROGRESS', 'DONE']);
      itemId = fallback?.itemId;
      if (transcriptionDebugEnabled) {
        logServerEvent(
          {
            type: 'transcription.completed_unmatched_item',
            role: roleHint,
            receivedKeys: Object.keys(item || {}),
            fallbackItemId: itemId,
          },
          '(voice streaming)'
        );
      }
      emitTranscriptionDebug('completed_unmatched_item', {
        role: roleHint,
        keys: Object.keys(item || {}),
        item,
        fallbackItemId: itemId,
      });
    }
    if (itemId) {
      const autoFallback =
        typeof item?.response_id === 'string' || typeof item?.output_index === 'number'
          ? 'assistant'
          : 'user';
      const resolvedRole =
        roleHint === 'auto'
          ? item?.role === 'user' || item?.role === 'assistant'
            ? item.role
            : resolveTranscriptRole(itemId) ?? autoFallback
          : roleHint;

      if (resolvedRole === 'user') {
        ensureUserTranscriptMessage(itemId);
      } else {
        ensureTranscriptMessage(itemId, 'assistant');
      }
      updateTranscriptMessage(itemId, finalTranscript, false);
      emitTranscriptionDebug('completed_update', {
        role: resolvedRole,
        itemId,
        finalTranscript,
      });
      const transcriptItem = transcriptItemsRef.current.find((i) => i.itemId === itemId);
      updateTranscriptItem(itemId, { status: 'DONE' });

      logMessageToServer(itemId, resolvedRole, finalTranscript);
      if (transcriptionDebugEnabled) {
        logServerEvent(
          {
            type: 'transcription.completed',
            role: resolvedRole,
            itemId,
            text: finalTranscript,
          },
          '(voice streaming)'
        );
      }

      // If guardrailResult still pending, mark PASS.
      if (transcriptItem?.guardrailResult?.status === 'IN_PROGRESS') {
        updateTranscriptItem(itemId, {
          guardrailResult: {
            status: 'DONE',
            category: 'NONE',
            rationale: '',
          },
        });
      }
    }
  }

  function handleGuardrailTripped(details: any, _agent: any, guardrail: any) {
    const moderation = extractModeration(guardrail.result.output.outputInfo);
    logServerEvent({ type: 'guardrail_tripped', payload: moderation });

    // find the last assistant message in details.context.history
    const lastAssistant = extractLastAssistantMessage(details?.context?.history);

    if (lastAssistant && moderation) {
      const category = moderation.moderationCategory ?? 'NONE';
      const rationale = moderation.moderationRationale ?? '';
      const offendingText: string | undefined = moderation?.testText;

      updateTranscriptItem(lastAssistant.itemId, {
        guardrailResult: {
          status: 'DONE',
          category,
          rationale,
          testText: offendingText,
        },
      });
    }
  }

  function handleMcpToolCallStarted(toolCall: any) {
    if (!toolCall) return;
    const toolName = toolCall?.name ?? 'mcp_tool';
    const toolId = typeof toolCall?.id === 'string' ? toolCall.id : undefined;
    const parsedArgs = maybeParseJson(toolCall?.arguments ?? {});
    const noteData: Record<string, any> = {};

    if (hasRenderableContent(parsedArgs)) {
      noteData.arguments = parsedArgs;
    }

    ensureToolNote(toolId, toolName, 'IN_PROGRESS', noteData);
  }

  function handleMcpToolCallCompleted(_context: any, _agent: any, toolCall: any) {
    const toolName = toolCall?.name ?? 'mcp_tool';
    const parsedArgs = maybeParseJson(toolCall?.arguments ?? {});
    const parsedOutput = toolCall?.output ? maybeParseJson(toolCall.output) : undefined;
    const noteData: Record<string, any> = {};

    if (hasRenderableContent(parsedArgs)) {
      noteData.arguments = parsedArgs;
    }

    if (hasRenderableContent(parsedOutput)) {
      noteData.output = parsedOutput;
    }

    const toolId = typeof toolCall?.id === 'string'
      ? toolCall.id
      : typeof toolCall?.call_id === 'string'
        ? toolCall.call_id
        : undefined;

    ensureToolNote(toolId, toolName, 'DONE', Object.keys(noteData).length ? noteData : undefined);

    // Compact breadcrumb to surface tool usage inline, in order
    if (showDebugTranscript) {
      addTranscriptBreadcrumb(`Used ${toolName}`);
    }

    const toolIdentifier = toolCall?.id || toolCall?.call_id || toolCall?.name;
    const safeOutput = parsedOutput && typeof parsedOutput === 'object'
      ? parsedOutput
      : parsedOutput;
    logToolToServer(toolIdentifier, {
      toolName,
      arguments: parsedArgs,
      output: safeOutput,
    });
  }

  function handleMcpToolArgumentsDone(itemId: string | undefined, rawArguments: string | undefined) {
    if (!itemId) return;
    const noteId = toolNoteIdMapRef.current.get(itemId);
    if (!noteId) return;

    const parsedArgs = maybeParseJson(rawArguments ?? {});
    if (!hasRenderableContent(parsedArgs)) return;

    const existing = transcriptItemsRef.current.find((item) => item.itemId === noteId);
    const existingData = (existing?.data ?? {}) as Record<string, any>;
    const nextData = { ...existingData, arguments: parsedArgs };

    updateTranscriptItem(noteId, {
      data: nextData,
    });
  }

  const handlersRef = useRef({
    handleAgentToolStart,
    handleAgentToolEnd,
    handleHistoryUpdated,
    handleHistoryAdded,
    handleTranscriptionDelta,
    handleTranscriptionCompleted,
    handleGuardrailTripped,
    handleMcpToolCallStarted,
    handleMcpToolCallCompleted,
    handleMcpToolArgumentsDone,
    logOutgoingUserText: (text: string) => {
      const trimmed = text?.trim();
      if (!trimmed) return;
      const syntheticId = `outbound-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      logMessageToServer(syntheticId, 'user', trimmed);
    },
  });

  return handlersRef;
}
