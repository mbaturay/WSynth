// audio-context.js - Manages the Audio Context for the synthesizer

class AudioContextManager {
    constructor() {
        this.audioContext = null;
        this.isInitialized = false;
    }

    // Initialize the audio context (must be called after user interaction)
    initialize() {
        if (!this.isInitialized) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.isInitialized = true;
            console.log('Audio context initialized');
        }
        return this.audioContext;
    }

    // Get the current audio context
    getContext() {
        return this.audioContext;
    }

    // Check if the audio context is running
    isRunning() {
        return this.audioContext && this.audioContext.state === 'running';
    }

    // Resume audio context (for browsers that suspend by default)
    async resume() {
        if (this.audioContext && this.audioContext.state !== 'running') {
            await this.audioContext.resume();
            console.log('Audio context resumed');
        }
    }

    // Suspend audio context (to save resources when not in use)
    async suspend() {
        if (this.audioContext && this.audioContext.state === 'running') {
            await this.audioContext.suspend();
            console.log('Audio context suspended');
        }
    }
}

// Export a singleton instance
export default new AudioContextManager();