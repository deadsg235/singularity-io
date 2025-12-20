"use client";

import { useCallback, useRef, useState } from "react";

interface UseAudioDownloadResult {
  startRecording: (sourceStream?: MediaStream) => Promise<void>;
  stopRecording: () => void;
  downloadRecording: () => void;
  isRecording: boolean;
}

/**
 * Minimal audio recorder/downloader hook. It captures microphone input into a
 * WAV blob and exposes helpers to start/stop recording and trigger a download.
 */
export default function useAudioDownload(): UseAudioDownloadResult {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const resetRecorder = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
    setIsRecording(false);
  };

  const startRecording = useCallback(async (sourceStream?: MediaStream) => {
    if (isRecording) return;
    try {
      const stream =
        sourceStream ??
        (await navigator.mediaDevices.getUserMedia({ audio: true }));
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        if (!sourceStream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (error) {
      console.warn("Failed to start audio recording", error);
      resetRecorder();
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    try {
      mediaRecorderRef.current.stop();
    } catch (error) {
      console.warn("Failed to stop audio recording", error);
    } finally {
      setIsRecording(false);
    }
  }, []);

  const downloadRecording = useCallback(() => {
    if (recordedChunksRef.current.length === 0) return;
    const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dexter-session-${new Date().toISOString()}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    recordedChunksRef.current = [];
  }, []);

  return {
    startRecording,
    stopRecording,
    downloadRecording,
    isRecording,
  };
}
