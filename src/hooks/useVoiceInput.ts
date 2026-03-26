"use client";

import { useState, useRef, useCallback } from "react";

interface UseVoiceInputOptions {
  onChunkTranscribed: (text: string) => void;
  chunkDurationMs?: number;
}

function mergeAndEncodeChunks(
  chunks: Float32Array[],
  sampleRate: number,
): FormData | null {
  if (chunks.length === 0) return null;

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  if (totalLength < 1600) return null;

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

  const blob = new Blob([int16.buffer], { type: "application/octet-stream" });
  const formData = new FormData();
  formData.append("audio", blob, "chunk.pcm");
  formData.append("sampleRate", String(sampleRate));
  return formData;
}

async function transcribeChunk(
  formData: FormData,
  onChunkTranscribed: (text: string) => void,
): Promise<void> {
  try {
    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) return;
    const { text } = await res.json();
    if (text?.trim()) onChunkTranscribed(text.trim());
  } catch {
    // network error — continue recording
  }
}

// ScriptProcessorNode is deprecated but universally supported;
// for a hackathon demo this is acceptable.
function beginCapture(
  stream: MediaStream,
  onSample: (data: Float32Array) => void,
) {
  const ctx = new AudioContext({ sampleRate: 16000 });
  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  processor.onaudioprocess = (e) =>
    onSample(new Float32Array(e.inputBuffer.getChannelData(0)));
  source.connect(processor);
  processor.connect(ctx.destination);
  return { ctx, source, processor };
}

function teardownAudio(
  processorRef: { current: ScriptProcessorNode | null },
  sourceRef: { current: MediaStreamAudioSourceNode | null },
  ctxRef: { current: AudioContext | null },
  streamRef: { current: MediaStream | null },
) {
  processorRef.current?.disconnect();
  sourceRef.current?.disconnect();
  ctxRef.current?.close();
  streamRef.current?.getTracks().forEach((t) => t.stop());
  processorRef.current = null;
  sourceRef.current = null;
  ctxRef.current = null;
  streamRef.current = null;
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
    samplesRef.current = [];
    const sampleRate = audioContextRef.current?.sampleRate ?? 16000;
    const formData = mergeAndEncodeChunks(chunks, sampleRate);
    if (formData) await transcribeChunk(formData, onChunkTranscribed);
  }, [onChunkTranscribed]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        { audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } },
      );
      streamRef.current = stream;
      const { ctx, source, processor } = beginCapture(stream, (input) => {
        if (recordingRef.current) samplesRef.current.push(input);
      });
      audioContextRef.current = ctx;
      sourceRef.current = source;
      processorRef.current = processor;
      recordingRef.current = true;
      setIsRecording(true);
      timerRef.current = setInterval(flushChunk, chunkDurationMs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Microphone access denied");
    }
  }, [chunkDurationMs, flushChunk]);

  const stopRecording = useCallback(async () => {
    recordingRef.current = false;
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    await flushChunk();
    teardownAudio(processorRef, sourceRef, audioContextRef, streamRef);
  }, [flushChunk]);

  return { isRecording, error, startRecording, stopRecording };
}
