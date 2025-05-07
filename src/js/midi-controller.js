// midi-controller.js - Handles MIDI input and maps it to oscillators

import Oscillator from './oscillator.js';

class MIDIController {
    constructor(oscillators, synth) {
        this.oscillators = oscillators; // Array of Oscillator instances
        this.synth = synth; // Synthesizer instance
        this.activeNotes = {}; // Track active notes per oscillator
    }

    // Initialize MIDI access
    async init() {
        if (!navigator.requestMIDIAccess) {
            console.error('Web MIDI API is not supported in this browser.');
            return;
        }

        try {
            const midiAccess = await navigator.requestMIDIAccess();
            console.log('MIDI access granted:', midiAccess);
            this.setupMIDIListeners(midiAccess);
        } catch (error) {
            console.error('Failed to get MIDI access:', error);
        }
    }

    // Set up listeners for MIDI input
    setupMIDIListeners(midiAccess) {
        console.log('Setting up MIDI listeners.');
        for (const input of midiAccess.inputs.values()) {
            console.log('MIDI Input Device:', input.name);
            input.onmidimessage = (message) => this.handleMIDIMessage(message);
        }
    }

    // Handle incoming MIDI messages
    handleMIDIMessage(message) {
        console.log('MIDI Message Received:', message.data);
        const [status, data1, data2] = message.data;
        const command = status & 0xf0;
        const channel = status & 0x0f;

        switch (command) {
            case 0x90: // Note On
                if (data2 > 0) {
                    console.log(`Note On: ${data1}, Velocity: ${data2}, Channel: ${channel}`);
                    this.noteOn(data1, data2, channel);
                } else {
                    console.log(`Note Off (via Note On with Velocity 0): ${data1}, Channel: ${channel}`);
                    this.noteOff(data1, channel);
                }
                break;
            case 0x80: // Note Off
                console.log(`Note Off: ${data1}, Channel: ${channel}`);
                this.noteOff(data1, channel);
                break;
            // Handle System Exclusive (SysEx) messages
            case 0xf0: // SysEx Start
                console.log('System Exclusive (SysEx) message received:', message.data);
                break;
            // Handle System Real-Time Messages
            case 0xf8: // MIDI Timing Clock
                // Uncomment the line below if you need to debug Timing Clock messages
                // console.log('MIDI Timing Clock message received.');
                break;
            default:
                console.log(`Unhandled MIDI Command: ${command}`);
                break;
        }
    }

    // Convert MIDI note number to frequency
    midiNoteToFrequency(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }

    // Handle Note On
    noteOn(note, velocity, channel) {
        const frequency = this.midiNoteToFrequency(note);
        console.log(`Triggering Note On: Note=${note}, Velocity=${velocity}, Channel=${channel}, Frequency=${frequency}Hz`);
        this.synth.playNoteByFrequency(frequency, velocity);
    }

    // Handle Note Off
    noteOff(note, channel) {
        const frequency = this.midiNoteToFrequency(note);
        console.log(`Triggering Note Off: Note=${note}, Channel=${channel}, Frequency=${frequency}Hz`);
        this.synth.stopNoteByFrequency(frequency);
    }
}

export default MIDIController;