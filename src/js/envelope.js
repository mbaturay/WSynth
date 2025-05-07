// envelope.js - Handles ADSR envelope generation and application

import audioContext from './audio-context.js';

class Envelope {
    constructor() {
        this.attackTime = 0.1;  // seconds
        this.decayTime = 0.2;   // seconds
        this.sustainLevel = 0.7; // 0 to 1
        this.releaseTime = 0.5; // seconds
        this.targetNode = null;
        this.startTime = 0;
        this.noteIsOn = false;
    }

    // Set the target node that this envelope will control
    setTarget(audioParam) {
        this.targetNode = audioParam;
    }

    // Trigger the attack, decay, and sustain phases
    triggerAttack() {
        if (!this.targetNode) return;
        
        const ctx = audioContext.getContext();
        const now = ctx.currentTime;
        this.startTime = now;
        this.noteIsOn = true;
        
        // Cancel any scheduled values
        this.targetNode.cancelScheduledValues(now);
        
        // Set initial value
        this.targetNode.setValueAtTime(0, now);
        
        // Attack phase - ramp from 0 to 1
        this.targetNode.linearRampToValueAtTime(1, now + this.attackTime);
        
        // Decay phase - ramp from 1 to sustain level
        this.targetNode.linearRampToValueAtTime(this.sustainLevel, now + this.attackTime + this.decayTime);
        
        console.log('Envelope: Attack triggered');
    }

    // Trigger the release phase
    triggerRelease() {
        if (!this.targetNode || !this.noteIsOn) return;
        
        const ctx = audioContext.getContext();
        const now = ctx.currentTime;
        this.noteIsOn = false;
        
        // Cancel any scheduled values
        this.targetNode.cancelScheduledValues(now);
        
        // Get the current value
        const currentValue = this.getCurrentValue(now);
        this.targetNode.setValueAtTime(currentValue, now);
        
        // Release phase - ramp from current value to 0
        this.targetNode.linearRampToValueAtTime(0, now + this.releaseTime);
        
        console.log('Envelope: Release triggered');
    }

    // Calculate the current envelope value based on the time since attack
    getCurrentValue(now) {
        const timeSinceAttack = now - this.startTime;
        
        if (timeSinceAttack <= this.attackTime) {
            // During attack phase
            return timeSinceAttack / this.attackTime;
        } else if (timeSinceAttack <= (this.attackTime + this.decayTime)) {
            // During decay phase
            const decayProgress = (timeSinceAttack - this.attackTime) / this.decayTime;
            return 1 - (1 - this.sustainLevel) * decayProgress;
        } else {
            // During sustain phase
            return this.sustainLevel;
        }
    }

    // Set attack time (0.01 to 2 seconds)
    setAttack(time) {
        this.attackTime = time;
    }

    // Set decay time (0.01 to 2 seconds)
    setDecay(time) {
        this.decayTime = time;
    }

    // Set sustain level (0 to 1)
    setSustain(level) {
        this.sustainLevel = level;
    }

    // Set release time (0.01 to 5 seconds)
    setRelease(time) {
        this.releaseTime = time;
    }
}

export default Envelope;