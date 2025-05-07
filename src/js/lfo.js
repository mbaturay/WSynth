// lfo.js - Handles Low Frequency Oscillator for modulation

import audioContext from './audio-context.js';

class LFO {
    constructor() {
        this.oscillator = null;
        this.gainNode = null;
        this.type = 'sine';
        this.frequency = 1; // Hz
        this.amplitude = 0.5; // 0 to 1
        this.isActive = false;
        this.targetParam = null;
        this.targetBaseValue = 0;
    }

    // Initialize the LFO
    init() {
        const ctx = audioContext.getContext();
        if (!ctx) return;
        
        this.oscillator = ctx.createOscillator();
        this.oscillator.type = this.type;
        this.oscillator.frequency.value = this.frequency;
        
        this.gainNode = ctx.createGain();
        this.gainNode.gain.value = this.amplitude;
        
        this.oscillator.connect(this.gainNode);
        
        console.log(`LFO initialized with type ${this.type}, frequency ${this.frequency}Hz`);
    }

    // Start the LFO
    start() {
        if (!this.oscillator || this.isActive) return;
        
        this.oscillator.start();
        this.isActive = true;
        
        console.log('LFO started');
    }

    // Stop the LFO
    stop() {
        if (this.oscillator && this.isActive) {
            try {
                this.oscillator.stop();
                this.oscillator.disconnect();
                this.gainNode.disconnect();
                this.isActive = false;
                console.log('LFO stopped');
            } catch (e) {
                console.warn('Error stopping LFO:', e);
            }
        }
    }

    // Connect the LFO to a target parameter (filter cutoff, oscillator gain, etc.)
    connect(audioParam, baseValue) {
        if (!this.gainNode) return;
        
        this.targetParam = audioParam;
        this.targetBaseValue = baseValue;
        
        // Disconnect if already connected
        try {
            this.gainNode.disconnect();
        } catch (e) {
            // Ignore disconnection errors
        }
        
        this.gainNode.connect(audioParam);
    }

    // Set LFO type (sine, square, sawtooth, triangle)
    setType(type) {
        this.type = type;
        if (this.oscillator) {
            this.oscillator.type = type;
        }
    }

    // Set LFO frequency (0.1Hz to 20Hz)
    setFrequency(freq) {
        this.frequency = freq;
        if (this.oscillator) {
            this.oscillator.frequency.setValueAtTime(
                freq, 
                audioContext.getContext().currentTime
            );
        }
    }

    // Set LFO amplitude (0 to 1)
    setAmplitude(amp) {
        this.amplitude = amp;
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(
                amp, 
                audioContext.getContext().currentTime
            );
        }
    }

    // Reconnect to a new target
    setTarget(audioParam, baseValue) {
        if (this.isActive) {
            this.connect(audioParam, baseValue);
        }
    }

    // Clean up resources
    cleanup() {
        this.stop();
        this.oscillator = null;
        this.gainNode = null;
    }
}

export default LFO;