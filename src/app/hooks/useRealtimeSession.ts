import { useCallback, useRef, useState, useEffect } from 'react';
import {
  RealtimeSession,
  RealtimeAgent,
  OpenAIRealtimeWebRTC,
} from '@openai/agents/realtime';

import { audioFormatForCodec, applyCodecPreferences } from '../lib/codecUtils';
import { useEvent } from '../contexts/EventContext';
import { useHandleSessionHistory } from './useHandleSessionHistory';
import { SessionStatus } from '../types';
import { MODEL_IDS } from '../config/models';

export interface RealtimeSessionCallbacks {
  onConnectionChange?: (status: SessionStatus) => void;
  onAgentHandoff?: (agentName: string) => void;
  onUsage?: (usage: any) => void;
}

export interface ConnectOptions {
  getEphemeralKey: () => Promise<string>;
  initialAgents: RealtimeAgent[];
  audioElement?: HTMLAudioElement;
  outputGuardrails?: any[];
}

type RealtimeUserInputPayload = Parameters<RealtimeSession['sendMessage']>[0];

export function useRealtimeSession(callbacks: RealtimeSessionCallbacks = {}) {
  const sessionRef = useRef<RealtimeSession | null>(null);
  const [status, setStatus] = useState<
    SessionStatus
  >('DISCONNECTED');
  const { logClientEvent } = useEvent();
  const transcriptionDebugEnabled =
    process.env.NEXT_PUBLIC_DEBUG_TRANSCRIPT === 'true';

  const emitTranscriptionDebug = useCallback((tag: string, payload: Record<string, any>) => {
    if (!transcriptionDebugEnabled) return;
    if (typeof window === 'undefined') return;
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
      if (process.env.NODE_ENV !== 'production') {
        console.debug('transcription debug beacon failed', err);
      }
    }
  }, [transcriptionDebugEnabled]);

  const updateStatus = useCallback(
    (s: SessionStatus) => {
      setStatus(s);
      callbacks.onConnectionChange?.(s);
      logClientEvent({}, s);
    },
    [callbacks],
  );

  const { logServerEvent } = useEvent();

  const historyHandlersRef = useHandleSessionHistory();

  // Track MCP chaining for backend-native tools
  const pendingMcpCallsRef = useRef<Set<string>>(new Set());
  const stepActiveRef = useRef<boolean>(false);
  const currentResponseIdRef = useRef<string | null>(null);

  function logDebug(event: any) {
    try {
      if (process.env.NODE_ENV !== 'production' && transcriptionDebugEnabled) {
        console.debug('[realtime transport]', event);
      }
    } catch {}
  }

  function handleTransportEvent(event: any) {
    logDebug(event);
    if (transcriptionDebugEnabled) {
      console.log('[transport_event]', event);
    }
    if (
      event &&
      typeof event.type === 'string' &&
      (event.type.includes('input_audio') || event.type.startsWith('conversation.item'))
    ) {
      emitTranscriptionDebug('transport_event', {
        type: event.type,
        keys: Object.keys(event),
        event,
      });
    }
    // Handle additional server events that aren't managed by the session
    switch (event.type) {
      case "conversation.item.input_audio_transcription.delta": {
        historyHandlersRef.current.handleTranscriptionDelta(event, 'user');
        break;
      }
      case "conversation.item.input_audio_transcription.completed": {
        historyHandlersRef.current.handleTranscriptionCompleted(event, 'user');
        break;
      }
      case "response.audio_transcript.done": {
        historyHandlersRef.current.handleTranscriptionCompleted(event, 'auto');
        break;
      }
      case "response.audio_transcript.delta": {
        historyHandlersRef.current.handleTranscriptionDelta(event, 'auto');
        break;
      }
      // Some runtimes emit user ASR without the conversation.item.* prefix
      case "input_audio_transcription.delta": {
        historyHandlersRef.current.handleTranscriptionDelta(event, 'user');
        break;
      }
      case "input_audio_transcription.completed": {
        historyHandlersRef.current.handleTranscriptionCompleted(event, 'user');
        break;
      }
      case "conversation.item.input_audio_transcription.done": {
        historyHandlersRef.current.handleTranscriptionCompleted(event, 'user');
        break;
      }
      case "input_audio_transcription.done": {
        historyHandlersRef.current.handleTranscriptionCompleted(event, 'user');
        break;
      }
      case "input_audio_buffer.speech_started": {
        historyHandlersRef.current.handleTranscriptionDelta(
          {
            item_id: event?.item_id,
            delta: '',
          },
          'user'
        );
        break;
      }
      case "input_audio_buffer.committed": {
        const itemId = event?.item_id;
        if (itemId) {
          historyHandlersRef.current.handleTranscriptionDelta(
            {
              item_id: itemId,
              delta: '',
            },
            'user'
          );
          try {
            (sessionRef.current as any)?.sendEvent?.({
              type: 'conversation.item.retrieve',
              item_id: itemId,
            });
          } catch (err) {
            emitTranscriptionDebug('conversation_item_retrieve_failed', {
              itemId,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
        break;
      }
      case "input_audio_buffer.speech_stopped": {
        // No-op for now; retrieval happens on commit.
        break;
      }
      case "conversation.item.created": {
        // Ensure user voice messages show up immediately when items are created
        try {
          const item = event?.item;
          if (item && item.type === 'message') {
            // Map transport shape { id, type, role, content } -> handler shape expects itemId
            const mapped = { ...item, itemId: item.id };
            historyHandlersRef.current.handleHistoryAdded(mapped);
            if (transcriptionDebugEnabled) {
              console.info('[dexter transcription] conversation.item.created', mapped);
            }
          }
        } catch {}
        if (transcriptionDebugEnabled) {
          logServerEvent(event);
        }
        break;
      }
      case "conversation.item.retrieved": {
        try {
          const item = event?.item;
          if (item && item.type === 'message') {
            const mapped = { ...item, itemId: item.id };
            historyHandlersRef.current.handleHistoryUpdated([mapped]);
            if (transcriptionDebugEnabled) {
              console.info('[dexter transcription] conversation.item.retrieved', mapped);
            }
          }
        } catch {}
        if (transcriptionDebugEnabled) {
          logServerEvent(event);
        }
        break;
      }
      case "response.created": {
        // New step begins
        const rid = event?.response?.id || null;
        currentResponseIdRef.current = typeof rid === 'string' ? rid : null;
        pendingMcpCallsRef.current.clear();
        stepActiveRef.current = true;
        if (transcriptionDebugEnabled) {
          console.info('[dexter transcription] response.created', event);
          logServerEvent(event);
        }
        break;
      }
    case "response.output_item.added": {
      // Collect MCP calls for this step
      const item = event?.item;
      if (item && item.type === 'mcp_call' && item.id) {
        if (transcriptionDebugEnabled) {
          console.log('[dexter-client] mcp_call added', { id: item.id, name: item.name, status: item.status });
        }
        pendingMcpCallsRef.current.add(item.id);
        try {
          historyHandlersRef.current.handleMcpToolCallStarted({
            id: item.id,
            name: item.name,
            arguments: item.arguments,
          });
        } catch {}
      }
      if (transcriptionDebugEnabled) {
        logServerEvent(event);
      }
      break;
    }
      case "response.mcp_call.completed": {
        // Mark MCP call finished; if all done for this step and still active, advance
        const itemId = event?.item_id;
        if (itemId && pendingMcpCallsRef.current.has(itemId)) {
          pendingMcpCallsRef.current.delete(itemId);
          tryAdvanceAfterMcp();
        }
        if (transcriptionDebugEnabled) {
          logServerEvent(event);
        }
        break;
      }
      case "response.mcp_call_arguments.done": {
        const itemId = event?.item_id;
        const args = event?.arguments;
        try {
          historyHandlersRef.current.handleMcpToolArgumentsDone(itemId, args);
        } catch {}
        if (transcriptionDebugEnabled) {
          logServerEvent(event);
        }
        break;
      }
      case "response.output_item.done": {
        // Some transports signal completion here; honor both
        const item = event?.item;
        if (item && item.type === 'mcp_call') {
          if (transcriptionDebugEnabled) {
            console.log('[dexter-client] mcp_call detected', { id: item.id, name: item.name });
          }
          // Surface tool usage inline in transcript (compact + note)
          try {
            const toolCall = {
              id: item.id,
              call_id: item.id,
              name: item.name,
              arguments: item.arguments,
              output: item.output,
            };
            historyHandlersRef.current.handleMcpToolCallCompleted(null, null, toolCall);
          } catch (err) {
            console.error('[dexter-client] handleMcpToolCallCompleted failed', err);
          }

          if (item.id && pendingMcpCallsRef.current.has(item.id)) {
            pendingMcpCallsRef.current.delete(item.id);
            tryAdvanceAfterMcp();
          }
        }
        if (transcriptionDebugEnabled) {
          logServerEvent(event);
        }
        break;
      }
      case "response.done": {
        // If no MCP calls were queued this step, and we're still active, advance immediately
        const resp = event?.response;
        const rid = resp?.id || null;
        const outputs: any[] = Array.isArray(resp?.output) ? resp.output : [];
        const hasAssistantMessage = outputs.some((o) => o?.type === 'message');
        const hasMcpCalls = outputs.some((o) => o?.type === 'mcp_call');

        if (typeof rid === 'string') {
          currentResponseIdRef.current = rid;
        }

        if (hasAssistantMessage && !hasMcpCalls) {
          // Natural termination of step with an assistant message
          pendingMcpCallsRef.current.clear();
          stepActiveRef.current = false;
        } else if (!hasMcpCalls && stepActiveRef.current) {
          // No tools emitted and nothing pending — model likely wants to continue
          safeCreateFollowupResponse();
          stepActiveRef.current = false;
        }

        if (resp?.usage) {
          callbacks.onUsage?.(resp.usage);
        }
        if (transcriptionDebugEnabled) {
          logServerEvent(event);
        }
        break;
      }
      default: {
        if (transcriptionDebugEnabled) {
          logServerEvent(event);
        }
        break;
      } 
    }
  }

  function safeCreateFollowupResponse() {
    try {
      sessionRef.current?.transport.sendEvent({ type: 'response.create' } as any);
    } catch { /* ignore */ }
  }

  function tryAdvanceAfterMcp() {
    if (!stepActiveRef.current) return;
    if (pendingMcpCallsRef.current.size > 0) return;
    // All MCP calls for this step have completed; request the next reasoning step
    safeCreateFollowupResponse();
    stepActiveRef.current = false;
  }

  const codecParamRef = useRef<string>(
    (typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('codec') ?? 'opus')
      : 'opus')
      .toLowerCase(),
  );

  // Wrapper to pass current codec param
  const applyCodec = useCallback(
    (pc: RTCPeerConnection) => applyCodecPreferences(pc, codecParamRef.current),
    [],
  );

  const handleAgentHandoff = (
    context: any,
    _fromAgent: any,
    toAgent: any,
  ) => {
    const directName = toAgent?.name;

    if (directName) {
      callbacks.onAgentHandoff?.(directName);
      return;
    }

    // Fallback: older SDK builds emit the transfer target in the history entry name.
    const history = context?.context?.history;
    const lastName = Array.isArray(history)
      ? history[history.length - 1]?.name
      : undefined;
    const inferredName = typeof lastName === 'string' && lastName.includes('transfer_to_')
      ? lastName.split('transfer_to_')[1]
      : undefined;

    if (inferredName) {
      callbacks.onAgentHandoff?.(inferredName);
    }
  };

  useEffect(() => {
    if (!sessionRef.current) return;
    const s = sessionRef.current;
    // Log server errors
    s.on("error", (...args: any[]) => {
      logServerEvent({ type: "error", message: args[0] });
    });

    // history events
    s.on("agent_handoff", handleAgentHandoff);
    s.on("agent_tool_start", historyHandlersRef.current.handleAgentToolStart);
    s.on("agent_tool_end", (context: any, agent: any, tool: any, result: any) => {
      historyHandlersRef.current.handleAgentToolEnd(context, agent, tool, result);
    });
    s.on("history_updated", historyHandlersRef.current.handleHistoryUpdated);
    s.on("history_added", historyHandlersRef.current.handleHistoryAdded);
    s.on("guardrail_tripped", historyHandlersRef.current.handleGuardrailTripped);
    s.on("mcp_tool_call_completed", (context: any, agent: any, toolCall: any) => {
      historyHandlersRef.current.handleMcpToolCallCompleted(context, agent, toolCall);
    });

    // additional transport events
    s.on("transport_event", handleTransportEvent);

    return () => {
      try { s.off?.("agent_handoff", handleAgentHandoff as any); } catch {}
      try { s.off?.("agent_tool_start", historyHandlersRef.current.handleAgentToolStart as any); } catch {}
      try { s.off?.("agent_tool_end", historyHandlersRef.current.handleAgentToolEnd as any); } catch {}
      try { s.off?.("history_updated", historyHandlersRef.current.handleHistoryUpdated as any); } catch {}
      try { s.off?.("history_added", historyHandlersRef.current.handleHistoryAdded as any); } catch {}
      try { s.off?.("guardrail_tripped", historyHandlersRef.current.handleGuardrailTripped as any); } catch {}
      try { s.off?.("mcp_tool_call_completed", historyHandlersRef.current.handleMcpToolCallCompleted as any); } catch {}
      try { s.off?.("transport_event", handleTransportEvent as any); } catch {}
      try { s.off?.("error", (() => {}) as any); } catch {}
    };
  }, [sessionRef.current]);

  const connect = useCallback(
    async ({
      getEphemeralKey,
      initialAgents,
      audioElement,
      outputGuardrails,
    }: ConnectOptions) => {
      if (sessionRef.current) return; // already connected

      updateStatus('CONNECTING');

      const ek = await getEphemeralKey();
      const rootAgent = initialAgents[0];

      // This lets you use the codec selector in the UI to force narrow-band (8 kHz) codecs to
      //  simulate how the voice agent sounds over a PSTN/SIP phone call.
      const codecParam = codecParamRef.current;
      const audioFormat = audioFormatForCodec(codecParam);
      const transcriptionModelId = MODEL_IDS.transcription;

      const includeKeys = [
        'input_audio_transcription',
        'conversation.item.input_audio_transcription',
        'item.input_audio_transcription',
        'item.input_audio_transcription.logprobs',
        'response.audio_transcript',
      ];

      sessionRef.current = new RealtimeSession(rootAgent, {
        transport: new OpenAIRealtimeWebRTC({
          audioElement,
          baseUrl:
            typeof window === 'undefined'
              ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://beta.dexter.cash'}/api/realtime/calls`
              : `${window.location.origin}/api/realtime/calls`,
          // Set preferred codec before offer creation
          changePeerConnection: async (pc: RTCPeerConnection) => {
            applyCodec(pc);
            return pc;
          },
        }),
        model: MODEL_IDS.realtime,
        config: {
          include: includeKeys,
          inputAudioFormat: audioFormat,
          input_audio_format: audioFormat,
          inputAudioTranscription: {
            model: transcriptionModelId,
          },
          input_audio_transcription: {
            model: transcriptionModelId,
          },
        } as any,
        outputGuardrails: outputGuardrails ?? [],
        // The OpenAI Realtime API no longer accepts an arbitrary `context` payload,
        // so we avoid attaching it to prevent 400 Unknown parameter errors.
        automaticallyTriggerResponseForMcpToolCalls: true,
      });

      await sessionRef.current.connect({ apiKey: ek });

      try {
        const sessionUpdatePayload: Record<string, any> = {
          type: 'session.update',
          session: {
            input_audio_transcription: {
              model: transcriptionModelId,
            },
            input_audio_format:
              audioFormat === 'pcm16'
                ? 'pcm16'
                : audioFormat === 'g711_ulaw'
                  ? 'g711_ulaw'
                  : 'g711_alaw',
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
            modalities: ['text', 'audio'],
            response: {
              modalities: ['text'],
            },
          },
        };
        sessionRef.current?.transport.sendEvent(sessionUpdatePayload as any);
        emitTranscriptionDebug('session_update_bootstrap', sessionUpdatePayload);
      } catch (err) {
        logClientEvent(
          {
            type: 'client.session_update_failed',
            error: err instanceof Error ? err.message : String(err),
          },
          '(initial session.update)'
        );
      }

      updateStatus('CONNECTED');
    },
    [callbacks, updateStatus],
  );

  const disconnect = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    updateStatus('DISCONNECTED');
  }, [updateStatus]);

  const assertconnected = () => {
    if (!sessionRef.current) throw new Error('RealtimeSession not connected');
  };

  /* ----------------------- message helpers ------------------------- */

  const interrupt = useCallback(() => {
    sessionRef.current?.interrupt();
  }, []);

  const sendUserMessage = useCallback((message: RealtimeUserInputPayload) => {
    assertconnected();
    if (typeof message === 'string') {
      historyHandlersRef.current.logOutgoingUserText?.(message);
    } else if (message && typeof message === 'object' && Array.isArray((message as any).content)) {
      const textChunk = (message as any).content.find((entry: any) => entry?.type === 'input_text' && typeof entry.text === 'string');
      if (textChunk?.text) {
        historyHandlersRef.current.logOutgoingUserText?.(textChunk.text);
      }
    }
    sessionRef.current!.sendMessage(message);
  }, [historyHandlersRef]);

  const sendUserText = useCallback((text: string) => {
    sendUserMessage(text);
  }, [sendUserMessage]);

  const sendEvent = useCallback((ev: any) => {
    try {
      if (
        ev &&
        ev.type === 'session.update' &&
        ev.session &&
        typeof ev.session === 'object' &&
        Object.prototype.hasOwnProperty.call(ev.session, 'type')
      ) {
        // Surface invalid param usage to logs without mutating the payload
        const offendingKeys = Object.keys(ev.session || {});
        logClientEvent({
          type: 'client.session_update_invalid_param',
          offendingKeys,
          valueType: typeof (ev.session as any).type,
        }, '(invalid param)');
      }
    } catch {}
    sessionRef.current?.transport.sendEvent(ev);
  }, [logClientEvent]);

  const updateSessionConfig = useCallback((config: any) => {
    try {
      emitTranscriptionDebug('session_update_send', { config });
      (sessionRef.current as any)?.updateSessionConfig?.(config);
    } catch (err) {
      logClientEvent(
        {
          type: 'client.session_update_failed',
          error: err instanceof Error ? err.message : String(err),
        },
        '(updateSessionConfig)'
      );
    }
  }, [emitTranscriptionDebug, logClientEvent]);

  const updateTranscriptionSession = useCallback(
    (options: {
      audioFormat: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
      transcriptionModel: string;
      turnDetection: {
        threshold: number;
        prefixPaddingMs: number;
        silenceDurationMs: number;
      };
    }) => {
      try {
        const eventPayload = {
          type: 'transcription_session.update',
          session: {
            input_audio_format: options.audioFormat,
            input_audio_transcription: {
              model: options.transcriptionModel,
            },
            include: ['item.input_audio_transcription.logprobs'],
            turn_detection: {
              type: 'server_vad',
              threshold: options.turnDetection.threshold,
              prefix_padding_ms: options.turnDetection.prefixPaddingMs,
              silence_duration_ms: options.turnDetection.silenceDurationMs,
            },
          },
        } as const;
        emitTranscriptionDebug('transcription_session_update_send', eventPayload);
        if (process.env.NODE_ENV !== 'production') {
          console.info('[dexter transcription] sending transcription_session.update', eventPayload);
        }
        sessionRef.current?.transport.sendEvent(eventPayload as any);
      } catch (err) {
        logClientEvent(
          {
            type: 'client.transcription_session_update_failed',
            error: err instanceof Error ? err.message : String(err),
          },
          '(transcription_session.update)'
        );
      }
    },
    [emitTranscriptionDebug, logClientEvent]
  );

  const mute = useCallback((m: boolean) => {
    sessionRef.current?.mute(m);
  }, []);

  return {
    status,
    connect,
    disconnect,
    sendUserMessage,
    sendUserText,
    sendEvent,
    updateTranscriptionSession,
    updateSessionConfig,
    mute,
    interrupt,
  } as const;
}
