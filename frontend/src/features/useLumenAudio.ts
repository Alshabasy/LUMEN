import { useCallback, useEffect, useRef, useState } from "react";

type AudioGraph = {
  context: AudioContext;
  master: GainNode;
  filter: BiquadFilterNode;
};

export function useLumenAudio() {
  const graphRef = useRef<AudioGraph | null>(null);
  const enabledRef = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolumeState] = useState(0.35);

  const createGraph = useCallback(() => {
    const AudioContextConstructor = window.AudioContext;
    const context = new AudioContextConstructor();
    const master = context.createGain();
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 240;
    filter.Q.value = 0.55;
    master.gain.value = 0;
    filter.connect(master);
    master.connect(context.destination);

    [55, 82.41].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const voiceGain = context.createGain();
      oscillator.type = index === 0 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      voiceGain.gain.value = index === 0 ? 0.12 : 0.045;
      oscillator.connect(voiceGain);
      voiceGain.connect(filter);
      oscillator.start();
    });

    const noiseLength = context.sampleRate * 2;
    const buffer = context.createBuffer(1, noiseLength, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < noiseLength; index += 1) {
      channel[index] = (Math.random() * 2 - 1) * 0.12;
    }
    const noise = context.createBufferSource();
    const noiseGain = context.createGain();
    noise.buffer = buffer;
    noise.loop = true;
    noiseGain.gain.value = 0.035;
    noise.connect(noiseGain);
    noiseGain.connect(filter);
    noise.start();
    graphRef.current = { context, master, filter };
    return graphRef.current;
  }, []);

  const toggle = useCallback(async () => {
    const nextEnabled = !enabled;
    try {
      let graph = graphRef.current;
      if (nextEnabled && !graph) graph = createGraph();
      if (!graph) return;
      enabledRef.current = nextEnabled;
      if (nextEnabled) {
        await graph.context.resume();
        graph.master.gain.setTargetAtTime(volume * 0.12, graph.context.currentTime, 0.9);
      } else {
        graph.master.gain.setTargetAtTime(0, graph.context.currentTime, 0.35);
        window.setTimeout(() => {
          if (!enabledRef.current && graph?.context.state === "running") {
            void graph.context.suspend().catch(() => undefined);
          }
        }, 1400);
      }
      setEnabled(nextEnabled);
    } catch {
      enabledRef.current = false;
      setEnabled(false);
    }
  }, [createGraph, enabled, volume]);

  const setVolume = useCallback((nextVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, nextVolume));
    setVolumeState(clampedVolume);
    const graph = graphRef.current;
    if (enabled && graph) {
      graph.master.gain.setTargetAtTime(clampedVolume * 0.12, graph.context.currentTime, 0.12);
    }
  }, [enabled]);

  const playCue = useCallback((frequency = 660) => {
    const graph = graphRef.current;
    if (!enabled || !graph || graph.context.state !== "running") return;
    const { context } = graph;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const start = context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.34, start + 0.12);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(0.08, start + 0.025);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
    oscillator.connect(envelope);
    envelope.connect(graph.master);
    oscillator.start(start);
    oscillator.stop(start + 0.34);
  }, [enabled]);

  useEffect(() => () => {
    const graph = graphRef.current;
    graphRef.current = null;
    if (graph) void graph.context.close();
  }, []);

  return { enabled, volume, setVolume, toggle, playCue };
}
