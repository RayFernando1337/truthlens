"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import type { ChunkSeverity } from "@/lib/pulse-utils";
import type { DemoFixture, TranscriptInputMode } from "@/lib/types";
import { InputHeader, VoiceTranscriptView, TextInputView, InputFooter } from "./TranscriptInputParts";

const URL_PATTERN = /^https?:\/\/\S+$/;
const NEAR_BOTTOM_PX = 80;

interface TranscriptInputProps {
  onAnalyze: (text: string, fixtureKey?: string) => void;
  onFetchUrl: (url: string, fixtureKey?: string) => void;
  isRecording: boolean;
  isProcessing: boolean;
  isFetchingUrl: boolean;
  voiceTranscript: string[];
  voiceError: string | null;
  onStartRecording: (fixtureKey?: string) => void;
  onStopRecording: () => void;
  chunkProgress: { current: number; total: number } | null;
  voiceChunkSeverities?: ChunkSeverity[];
}

function useScrollFollow(voiceTranscript: string[], isRecording: boolean) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const followingRef = useRef(true);
  const [showJumpToLive, setShowJumpToLive] = useState(false);

  const syncJumpButton = useCallback(() => setShowJumpToLive(!followingRef.current), []);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    followingRef.current = true;
    syncJumpButton();
  }, [syncJumpButton]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    followingRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    syncJumpButton();
  }, [syncJumpButton]);

  const hasVoiceChunks = voiceTranscript.length > 0;

  useEffect(() => {
    if (isRecording && voiceTranscript.length === 0) {
      followingRef.current = true;
      syncJumpButton();
    }
  }, [isRecording, voiceTranscript.length, syncJumpButton]);

  useEffect(() => {
    if (!isRecording && !hasVoiceChunks) return;
    if (followingRef.current && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    syncJumpButton();
  }, [voiceTranscript, isRecording, hasVoiceChunks, syncJumpButton]);

  return { scrollRef, showJumpToLive, scrollToBottom, handleScroll, hasVoiceChunks };
}

function useInputState(props: TranscriptInputProps) {
  const { onAnalyze, onFetchUrl, isRecording, isProcessing, isFetchingUrl, onStartRecording } = props;
  const [text, setText] = useState("");
  const [demoOpen, setDemoOpen] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState<DemoFixture | null>(null);

  const inputMode: TranscriptInputMode = useMemo(() => {
    if (isRecording) return "voice";
    if (URL_PATTERN.test(text.trim())) return "url";
    return "text";
  }, [text, isRecording]);

  const handleAction = useCallback(() => {
    const content = text.trim();
    if (!content) return;
    if (inputMode === "url") onFetchUrl(content);
    else onAnalyze(content, selectedFixture?.inputMode === "text" ? selectedFixture.key : undefined);
  }, [text, inputMode, onFetchUrl, onAnalyze, selectedFixture]);

  const loadFixture = useCallback((fixture: DemoFixture) => {
    setSelectedFixture(fixture);
    setDemoOpen(false);
    if (fixture.inputMode === "text") { setText(fixture.content); return; }
    setText("");
    if (fixture.inputMode === "url") onFetchUrl(fixture.content, fixture.key);
  }, [onFetchUrl]);

  const handleTextChange = useCallback((value: string) => {
    setText(value);
    if (selectedFixture?.inputMode !== "text" || value !== selectedFixture.content) setSelectedFixture(null);
  }, [selectedFixture]);

  const handleStartRecording = useCallback(() => {
    onStartRecording(selectedFixture?.inputMode === "voice-prompt" ? selectedFixture.key : undefined);
  }, [onStartRecording, selectedFixture]);

  const busy = isProcessing || isFetchingUrl;
  const showVoiceProtocol = selectedFixture?.inputMode === "voice-prompt" && !isRecording && !props.voiceTranscript.length;

  return { text, demoOpen, setDemoOpen, selectedFixture, setSelectedFixture, inputMode, busy, showVoiceProtocol, handleAction, loadFixture, handleTextChange, handleStartRecording };
}

export default function TranscriptInput(props: TranscriptInputProps) {
  const s = useInputState(props);
  const scroll = useScrollFollow(props.voiceTranscript, props.isRecording);
  const showJump = (props.isRecording || scroll.hasVoiceChunks) && scroll.showJumpToLive;

  return (
    <div className="flex h-full flex-col">
      <InputHeader isRecording={props.isRecording} busy={s.busy} demoOpen={s.demoOpen}
        onToggleDemo={() => s.setDemoOpen((o) => !o)} onLoadFixture={s.loadFixture}
        onStopRecording={props.onStopRecording} onStartRecording={s.handleStartRecording} />
      <div className="relative flex-1 overflow-hidden p-4">
        {props.isRecording || scroll.hasVoiceChunks
          ? <VoiceTranscriptView isRecording={props.isRecording} voiceTranscript={props.voiceTranscript}
              voiceError={props.voiceError} voiceChunkSeverities={props.voiceChunkSeverities}
              showJumpButton={showJump} scrollRef={scroll.scrollRef} onScroll={scroll.handleScroll} onScrollToBottom={scroll.scrollToBottom} />
          : <TextInputView selectedFixture={s.selectedFixture} onClearFixture={() => s.setSelectedFixture(null)}
              showVoiceProtocol={s.showVoiceProtocol} text={s.text} onTextChange={s.handleTextChange} busy={s.busy} />}
      </div>
      <InputFooter isRecording={props.isRecording} busy={s.busy} isFetchingUrl={props.isFetchingUrl}
        chunkProgress={props.chunkProgress} voiceChunkCount={props.voiceTranscript.length}
        text={s.text} inputMode={s.inputMode} onAction={s.handleAction} />
    </div>
  );
}
