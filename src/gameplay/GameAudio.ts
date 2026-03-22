type AudioCue = 'star' | 'boost' | 'ring' | 'smash' | 'place' | 'break' | 'bridge' | 'victory' | 'hurt' | 'die' | 'eat' | 'step' | 'splash' | 'mobHit' | 'mobDie'

export class GameAudio {
  private context: AudioContext | null = null

  unlock(): void {
    const AudioContextCtor = window.AudioContext

    if (!AudioContextCtor) {
      return
    }

    if (!this.context) {
      this.context = new AudioContextCtor()
    }

    if (this.context.state !== 'running') {
      void this.context.resume()
    }
  }

  dispose(): void {
    if (!this.context) {
      return
    }

    void this.context.close()
    this.context = null
  }

  play(cue: AudioCue): void {
    if (!this.context || this.context.state !== 'running') {
      return
    }

    const now = this.context.currentTime

    if (cue === 'star') {
      this.blip(now, 640, 0.08, 'triangle', 0.035)
      this.blip(now + 0.05, 860, 0.1, 'triangle', 0.03)
      return
    }

    if (cue === 'boost') {
      this.sweep(now, 320, 180, 0.22, 'sawtooth', 0.05)
      return
    }

    if (cue === 'ring') {
      this.blip(now, 560, 0.12, 'sine', 0.04)
      this.blip(now + 0.08, 880, 0.14, 'sine', 0.035)
      return
    }

    if (cue === 'smash') {
      this.noise(now, 0.1, 0.05)
      this.blip(now, 150, 0.07, 'square', 0.025)
      return
    }

    if (cue === 'break') {
      this.noise(now, 0.06, 0.04)
      this.blip(now, 200, 0.06, 'square', 0.018)
      return
    }

    if (cue === 'place') {
      this.blip(now, 320, 0.05, 'square', 0.02)
      this.blip(now + 0.03, 260, 0.05, 'square', 0.016)
      return
    }

    if (cue === 'bridge') {
      this.blip(now, 420, 0.08, 'triangle', 0.03)
      this.blip(now + 0.07, 540, 0.1, 'triangle', 0.03)
      return
    }

    if (cue === 'victory') {
      this.blip(now, 523, 0.14, 'triangle', 0.045)
      this.blip(now + 0.12, 659, 0.16, 'triangle', 0.04)
      this.blip(now + 0.24, 784, 0.22, 'triangle', 0.04)
      return
    }

    if (cue === 'hurt') {
      this.noise(now, 0.08, 0.06)
      this.blip(now, 180, 0.1, 'sawtooth', 0.03)
      return
    }

    if (cue === 'die') {
      this.sweep(now, 400, 80, 0.4, 'sawtooth', 0.04)
      this.noise(now, 0.15, 0.04)
      return
    }

    if (cue === 'eat') {
      this.blip(now, 280, 0.06, 'square', 0.015)
      this.blip(now + 0.08, 340, 0.06, 'square', 0.015)
      this.blip(now + 0.16, 300, 0.06, 'square', 0.015)
      return
    }

    if (cue === 'step') {
      this.noise(now, 0.035, 0.012)
      return
    }

    if (cue === 'splash') {
      this.noise(now, 0.12, 0.04)
      this.blip(now, 120, 0.08, 'sine', 0.02)
      return
    }

    if (cue === 'mobHit') {
      this.noise(now, 0.06, 0.03)
      this.blip(now, 250, 0.06, 'square', 0.02)
      return
    }

    if (cue === 'mobDie') {
      this.sweep(now, 300, 100, 0.25, 'square', 0.025)
      return
    }
  }

  private blip(
    startTime: number,
    frequency: number,
    duration: number,
    type: OscillatorType,
    gainAmount: number,
  ): void {
    if (!this.context) {
      return
    }

    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, startTime)
    gain.gain.setValueAtTime(0.0001, startTime)
    gain.gain.exponentialRampToValueAtTime(gainAmount, startTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
    oscillator.connect(gain).connect(this.context.destination)
    oscillator.start(startTime)
    oscillator.stop(startTime + duration + 0.02)
  }

  private sweep(
    startTime: number,
    fromFrequency: number,
    toFrequency: number,
    duration: number,
    type: OscillatorType,
    gainAmount: number,
  ): void {
    if (!this.context) {
      return
    }

    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(fromFrequency, startTime)
    oscillator.frequency.exponentialRampToValueAtTime(toFrequency, startTime + duration)
    gain.gain.setValueAtTime(0.0001, startTime)
    gain.gain.exponentialRampToValueAtTime(gainAmount, startTime + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
    oscillator.connect(gain).connect(this.context.destination)
    oscillator.start(startTime)
    oscillator.stop(startTime + duration + 0.03)
  }

  private noise(startTime: number, duration: number, gainAmount: number): void {
    if (!this.context) {
      return
    }

    const bufferSize = Math.max(1, Math.floor(this.context.sampleRate * duration))
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate)
    const data = buffer.getChannelData(0)

    for (let index = 0; index < bufferSize; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / bufferSize)
    }

    const source = this.context.createBufferSource()
    const gain = this.context.createGain()
    source.buffer = buffer
    gain.gain.setValueAtTime(gainAmount, startTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
    source.connect(gain).connect(this.context.destination)
    source.start(startTime)
    source.stop(startTime + duration)
  }
}
