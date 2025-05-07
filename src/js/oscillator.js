// oscillator.js - Handles oscillator functionality

import audioContext from './audio-context.js';

class Oscillator {
    constructor(id) {
        this.id = id;
        this.oscillator = null;
        this.gainNode = null;
        this.type = 'sine';
        this.volume = -10;
        this.detune = 0;
        this.isActive = false;
    }
    
    // Initialize the oscillator with a destination node
    init(destinationNode) {
        const ctx = audioContext.getContext();
        if (!ctx) return null;
        
        // Create oscillator
        this.oscillator = ctx.createOscillator();
        this.oscillator.type = this.type;
        this.oscillator.detune.value = this.detune;
        
        // Create gain node for volume control
        this.gainNode = ctx.createGain();
        const volumeValue = this.dbToGain(this.volume);
        this.gainNode.gain.value = volumeValue;
        
        // Connect the nodes: oscillator -> gain -> destination
        this.oscillator.connect(this.gainNode);
        
        // If a destination is provided, connect to it
        if (destinationNode) {
            this.gainNode.connect(destinationNode);
        }
        
        return this.gainNode; // Return the last node in our chain
    }
    
    // Start the oscillator at a specific frequency
    start(frequency) {
        if (!this.oscillator || this.isActive) return;
        
        this.oscillator.frequency.value = frequency;
        this.oscillator.start();
        this.isActive = true;
        
        console.log(`Oscillator ${this.id} started at ${frequency}Hz`);
    }
    
    // Stop the oscillator
    stop() {
        if (this.oscillator && this.isActive) {
            try {
                this.oscillator.stop();
                this.oscillator.disconnect();
                this.gainNode.disconnect();
                this.isActive = false;
                console.log(`Oscillator ${this.id} stopped`);
            } catch (e) {
                console.warn(`Error stopping oscillator ${this.id}:`, e);
            }
        }
    }
    
    // Set oscillator type (sine, square, sawtooth, triangle)
    setType(type) {
        this.type = type;
        if (this.oscillator) {
            this.oscillator.type = type;
        }
    }
    
    // Set oscillator volume (in dB)
    setVolume(volume) {
        this.volume = volume;
        if (this.gainNode) {
            const volumeValue = this.dbToGain(volume);
            this.gainNode.gain.setValueAtTime(
                volumeValue, 
                audioContext.getContext().currentTime
            );
        }
    }
    
    // Set oscillator detune (in cents)
    setDetune(cents) {
        this.detune = cents;
        if (this.oscillator) {
            this.oscillator.detune.setValueAtTime(
                cents, 
                audioContext.getContext().currentTime
            );
        }
    }
    
    // Get the gain node for connection
    getGainNode() {
        return this.gainNode;
    }
    
    // Convert dB value to gain (amplitude)
    dbToGain(db) {
        return Math.pow(10, db / 20);
    }
    
    // Get the output node
    getOutput() {
        return this.gainNode; // Return the gain node as the output
    }
    
    // Clean up resources
    cleanup() {
        this.stop();
        this.oscillator = null;
        this.gainNode = null;
    }
}

export default Oscillator;