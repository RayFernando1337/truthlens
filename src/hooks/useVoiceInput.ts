"use client";

import { useState, useRef, useCallback } from "react";

interface UseVoiceInputOptions {
  onChunkTranscribed: (text: string) => void;
  chunkDurationMs?: number;
}

export function useVoiceInput({
  onChunkTranscribed,
  chunkDurationMs = 4_000,
}: UseVoiceInputOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const samplesRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingRef = useRef(false);

  const flushChunk = useCallback(async () => {
    const chunks = samplesRef.current;
    if (chunks.length === 0) return;
    samplesRef.current = [];

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    if (totalLength < 1600) return; // less than 0.1s at 16kHz, skip

    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const int16 = new Int16Array(merged.length);
    for (let i = 0; i < merged.length; i++) {
      const s = Math.max(-1, Math.min(1, merged[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    const blob = new Blob([int16.buffer], {
      type: "application/octet-stream",
    });
    const formData = new FormData();
    formData.append("audio", blob, "chunk.pcm");
    formData.append(
      "sampleRate",
      String(audioContextRef.current?.sampleRate ?? 16000)
    );

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const { text } = await res.json();
        if (text && text.trim()) {
          onChunkTranscribed(text.trim());
        }
      }
    } catch {
      // network error, continue recording
    }
  }, [onChunkTranscribed]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // ScriptProcessorNode is deprecated but universally supported.
      // For a hackathon demo this is fine.
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!recordingRef.current) return;
        const input = e.inputBuffer.getChannelData(0);
        samplesRef.current.push(new Float32Array(input));
      };

      source.connect(processor);
      processor.connect(ctx.destination);

      recordingRef.current = true;
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        flushChunk();
      }, chunkDurationMs);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Microphone access denied"
      );
    }
  }, [chunkDurationMs, flushChunk]);

  const stopRecording = useCallback(async () => {
    recordingRef.current = false;
    setIsRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    await flushChunk();

    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioContextRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());

    processorRef.current = null;
    sourceRef.current = null;
    audioContextRef.current = null;
    streamRef.current = null;
  }, [flushChunk]);

  return { isRecording, error, startRecording, stopRecording };
}
