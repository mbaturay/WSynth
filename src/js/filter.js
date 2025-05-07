// filter.js - Handles audio filtering

import audioContext from './audio-context.js';

class Filter {
    constructor() {
        this.filter = null;
        this.type = 'lowpass';
        this.cutoff = 2000; // Hz
        this.resonance = 1; // Q value
    }

    // Initialize the filter with the audio context
    init() {
        const ctx = audioContext.getContext();
        if (!ctx) return null;

        this.filter = ctx.createBiquadFilter();
        this.filter.type = this.type;
        this.filter.frequency.value = this.cutoff;
        this.filter.Q.value = this.resonance;
        
        console.log(`Filter initialized with type ${this.type}, cutoff ${this.cutoff}Hz, Q ${this.resonance}`);
        
        return this.filter;
    }

    // Set filter type (lowpass, highpass, bandpass)
    setType(type) {
        this.type = type;
        if (this.filter) {
            this.filter.type = type;
        }
    }

    // Set filter cutoff frequency (20Hz to 20000Hz)
    setCutoff(frequency) {
        this.cutoff = frequency;
        if (this.filter) {
            const ctx = audioContext.getContext();
            // Use exponential ramp for smoother transitions
            this.filter.frequency.exponentialRampToValueAtTime(
                frequency, 
                ctx.currentTime + 0.01
            );
        }
    }

    // Set filter resonance (Q) (0.1 to 20)
    setResonance(q) {
        this.resonance = q;
        if (this.filter) {
            const ctx = audioContext.getContext();
            this.filter.Q.linearRampToValueAtTime(
                q, 
                ctx.currentTime + 0.01
            );
        }
    }

    // Modulate the filter cutoff with an LFO or envelope
    modulateCutoff(amount) {
        if (this.filter) {
            const ctx = audioContext.getContext();
            const currentCutoff = this.cutoff * amount;
            
            // Clamp the cutoff to prevent out of range values
            const clampedCutoff = Math.max(20, Math.min(20000, currentCutoff));
            
            this.filter.frequency.linearRampToValueAtTime(
                clampedCutoff, 
                ctx.currentTime + 0.01
            );
        }
    }

    // Get the filter node
    getFilterNode() {
        return this.filter;
    }
}

export default Filter;