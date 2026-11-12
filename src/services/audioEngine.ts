/**
 * AudioEngine: High-fidelity audio processor and real-time VU telemetry engine.
 * Maintains a persistent AudioContext across device switches, preventing unwanted
 * context recreations and autoplay suspensions.
 */
export class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private animFrameId: number | null = null;
  private onLevelCallback: ((level: number, peak: number) => void) | null = null;
  private peak: number = 0;
  private currentGain: number = 1.0;
  private userGestureBound: boolean = false;

  constructor() {
    this.bindUserGestureResume();
  }

  /**
   * Automatically resumes suspended AudioContext on any user interaction anywhere on the page
   */
  private bindUserGestureResume(): void {
    if (typeof window === 'undefined' || this.userGestureBound) return;

    const resumeContext = async () => {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        try {
          await this.audioCtx.resume();
        } catch {}
      }
    };

    window.addEventListener('click', resumeContext, { passive: true });
    window.addEventListener('keydown', resumeContext, { passive: true });
    window.addEventListener('touchstart', resumeContext, { passive: true });
    window.addEventListener('mousedown', resumeContext, { passive: true });
    this.userGestureBound = true;
  }

  /**
   * Disconnects nodes in the processing graph without closing the AudioContext
   */
  private disconnectGraph(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {}
      this.gainNode = null;
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {}
      this.analyser = null;
    }
    this.destinationNode = null;
    this.peak = 0;
  }

  /**
   * Initializes audio processing graph with an active microphone stream,
   * reusing the existing AudioContext to preserve user-gesture running state.
   */
  async init(stream: MediaStream): Promise<MediaStreamAudioDestinationNode | null> {
    // 1. Only disconnect graph nodes — do NOT close the AudioContext!
    this.disconnectGraph();

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.warn('[AudioEngine] Provided stream has no audio tracks.');
      return null;
    }

    // Ensure audio tracks are enabled and active
    audioTracks.forEach((t) => {
      t.enabled = true;
    });

    // 2. Reuse existing AudioContext if already open, or create one lazy
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }

    // Attempt resume if suspended
    if (this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch {
        // Will be resumed on user interaction
      }
    }

    try {
      this.sourceNode = this.audioCtx.createMediaStreamSource(stream);
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(this.currentGain, this.audioCtx.currentTime);

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.4;

      this.destinationNode = this.audioCtx.createMediaStreamDestination();

      // Audio Graph:
      // Source -> Gain -> Analyser (for VU level telemetry)
      // Source -> Gain -> DestinationNode (for recording pipe)
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.gainNode.connect(this.destinationNode);

      this.startLevelLoop();
      return this.destinationNode;
    } catch (err) {
      console.error('[AudioEngine] Failed to connect audio graph:', err);
      return null;
    }
  }

  /**
   * Returns the current state of the AudioContext: 'running', 'suspended', 'closed', or 'uninitialized'
   */
  public getContextState(): AudioContextState | 'uninitialized' {
    return this.audioCtx ? this.audioCtx.state : 'uninitialized';
  }

  public async resume(): Promise<void> {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (err) {
        console.warn('[AudioEngine] resume() error:', err);
      }
    }
  }

  setGain(value: number): void {
    this.currentGain = value;
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(value, this.audioCtx.currentTime);
    }
  }

  onLevel(cb: (level: number, peak: number) => void): void {
    this.onLevelCallback = cb;
  }

  private startLevelLoop(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.fftSize;
    const timeData = new Uint8Array(bufferLength);
    const freqData = new Uint8Array(this.analyser.frequencyBinCount);

    const update = () => {
      if (!this.analyser) return;

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        if (this.onLevelCallback) {
          this.onLevelCallback(0, 0);
        }
        this.animFrameId = requestAnimationFrame(update);
        return;
      }

      this.analyser.getByteTimeDomainData(timeData);
      this.analyser.getByteFrequencyData(freqData);

      // 1. Root Mean Square (RMS) calculation of speech waveform
      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = (timeData[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / bufferLength);

      // 2. Average Frequency Energy
      let freqSum = 0;
      for (let i = 0; i < freqData.length; i++) {
        freqSum += freqData[i];
      }
      const freqEnergy = freqSum / freqData.length / 255;

      // 3. Speech-weighted sensitivity calibrated for courtroom/office deposition
      const speechVolume = Math.max(rms * 4.2, freqEnergy * 2.8);
      const level = Math.min(1.0, Math.max(0, speechVolume * this.currentGain));

      // Peak damping
      if (level > this.peak) {
        this.peak = level;
      } else {
        this.peak = Math.max(0, this.peak - 0.025);
      }

      if (this.onLevelCallback) {
        this.onLevelCallback(level, this.peak);
      }

      this.animFrameId = requestAnimationFrame(update);
    };

    update();
  }

  getMixedAudioTrack(): MediaStreamTrack | null {
    if (!this.destinationNode) return null;
    return this.destinationNode.stream.getAudioTracks()[0] || null;
  }

  /**
   * Fully closes the audio engine and releases context (only call on app teardown)
   */
  close(): void {
    this.disconnectGraph();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
  }
}
