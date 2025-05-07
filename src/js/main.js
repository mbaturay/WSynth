// main.js - Main entry point for the synthesizer application

import audioContext from './audio-context.js';
import Oscillator from './oscillator.js';
import Filter from './filter.js';
import Envelope from './envelope.js';
import LFO from './lfo.js';
import { initPanners, setPan1, setPan2, connectOscillator } from './panner.js';
import MIDIController from './midi-controller.js';
import SynthTester from './test-utils.js'; // Import the test utilities

// Global synth instance for testing
let synthInstance;

// Synthesizer class to manage all components
class Synthesizer {
    constructor() {
        // Audio nodes
        this.masterGain = null;
        this.filter = null;
        
        // Synthesizer components
        this.oscillators = [];
        this.envelope = null;
        this.lfo = null;
        this.midiController = null; // Add MIDI controller instance
        
        // Synth state
        this.isPoweredOn = false;
        this.activeNotes = new Map(); // To track currently playing notes
        
        // Constants
        this.NOTE_FREQUENCIES = this.generateNoteFrequencies();
        this.KEYBOARD_MAPPING = {
            'z': 'C4', 's': 'C#4', 'x': 'D4', 'd': 'D#4', 'c': 'E4', 'v': 'F4', 
            'g': 'F#4', 'b': 'G4', 'h': 'G#4', 'n': 'A4', 'j': 'A#4', 'm': 'B4',
            'q': 'C5', '2': 'C#5', 'w': 'D5', '3': 'D#5', 'e': 'E5', 'r': 'F5',
            '5': 'F#5', 't': 'G5', '6': 'G#5', 'y': 'A5', '7': 'A#5', 'u': 'B5'
        };
    }

    // Initialize the synthesizer
    init() {
        if (this.isPoweredOn) return;
        
        try {
            // Initialize audio context on user interaction
            audioContext.initialize();
            const ctx = audioContext.getContext();
            
            // Create master gain node
            this.masterGain = ctx.createGain();
            this.masterGain.gain.value = this.dbToGain(-10); // Default -10dB
            this.masterGain.connect(ctx.destination);
            
            // Create filter
            this.filter = new Filter();
            const filterNode = this.filter.init();
            filterNode.connect(this.masterGain);
            
            // Create oscillators
            this.oscillators = [
                new Oscillator('1'),
                new Oscillator('2')
            ];
            
            // Default settings for oscillators
            this.oscillators[0].setType('sawtooth');
            this.oscillators[1].setType('square');
            this.oscillators[0].setVolume(-10);
            this.oscillators[1].setVolume(-15);
            
            // Create envelope
            this.envelope = new Envelope();
            
            // Create LFO
            this.lfo = new LFO();
            this.lfo.init();
            
            // Initialize panners
            const panners = initPanners();
            if (!panners) {
                console.error("Failed to initialize panners");
            }
            
            // Initialize MIDI controller
            this.midiController = new MIDIController(this.oscillators);
            this.midiController.init();
            
            // Power on the synth
            this.isPoweredOn = true;
            
            console.log('Synthesizer initialized');
            this.updateUI();
            
            // Setup event listeners for UI controls
            this.setupEventListeners();
            
            // Create keyboard
            this.createKeyboard();
            
            // Start LFO
            this.lfo.start();
            
            // Set default LFO target (filter cutoff)
            this.setLFOTarget(document.getElementById('lfo-target').value);
            
            return true;
        } catch (error) {
            console.error('Failed to initialize synthesizer:', error);
            return false;
        }
    }

    // Shut down the synthesizer
    shutdown() {
        if (!this.isPoweredOn) return;
        
        // Stop all active notes
        this.stopAllNotes();
        
        // Clean up oscillators
        this.oscillators.forEach(osc => osc.cleanup());
        
        // Stop and clean up LFO
        if (this.lfo) {
            this.lfo.cleanup();
        }
        
        // Suspend audio context
        audioContext.suspend();
        
        this.isPoweredOn = false;
        console.log('Synthesizer shut down');
        this.updateUI();
    }

    // Clean up a specific oscillator instance
    cleanupOscillator(oscillator) {
        if (!oscillator) return;
        
        const ctx = audioContext.getContext();
        
        try {
            // First make sure volume is set to zero to avoid any clicks
            if (oscillator.gainNode) {
                oscillator.gainNode.gain.setValueAtTime(0, ctx.currentTime);
            }
            
            // Stop oscillator with proper timing
            if (oscillator.oscillator && oscillator.isActive) {
                // Set a tiny timeout to ensure the zero volume takes effect
                setTimeout(() => {
                    try {
                        oscillator.oscillator.stop();
                        console.log(`Stopped oscillator ${oscillator.id}`);
                    } catch (e) {
                        console.warn(`Error stopping oscillator ${oscillator.id}:`, e);
                    }
                }, 10);
            }
            
            // Disconnect all nodes
            setTimeout(() => {
                try {
                    if (oscillator.oscillator) {
                        oscillator.oscillator.disconnect();
                    }
                    if (oscillator.gainNode) {
                        oscillator.gainNode.disconnect();
                    }
                    
                    // Reset flags and references
                    oscillator.isActive = false;
                    
                    console.log(`Oscillator ${oscillator.id} fully cleaned up`);
                } catch (e) {
                    console.warn(`Error disconnecting oscillator ${oscillator.id}:`, e);
                }
            }, 20);
        } catch (error) {
            console.error(`Failed to cleanup oscillator ${oscillator.id}:`, error);
        }
    }

    // Play a note by note name (e.g., 'A4')
    playNote(noteName) {
        if (!this.isPoweredOn || !audioContext.isRunning()) return;
        
        // If note is already playing, stop it first
        if (this.activeNotes.has(noteName)) {
            this.stopNote(noteName);
            
            // Small delay to ensure cleanup completes
            const ctx = audioContext.getContext();
            const startTime = ctx.currentTime + 0.1;
            setTimeout(() => this._createAndPlayNote(noteName, startTime), 100);
            return;
        }
        
        this._createAndPlayNote(noteName);
    }
    
    // Internal method to create and play a note
    _createAndPlayNote(noteName, startTime = null) {
        const frequency = this.NOTE_FREQUENCIES[noteName];
        if (!frequency) return;
        
        const ctx = audioContext.getContext();
        startTime = startTime || ctx.currentTime;
        
        // Setup for this note
        const noteData = {
            oscillatorNodes: [],
            startTime: startTime
        };
        
        // Create gain node for this note
        const noteGain = ctx.createGain();
        noteGain.gain.value = 0; // Start with zero gain, envelope will control it
        noteGain.connect(this.filter.getFilterNode());
        noteData.gainNode = noteGain;
        
        // Create a unique envelope instance for this note
        const noteEnvelope = new Envelope();
        noteEnvelope.setAttack(this.envelope.attackTime);
        noteEnvelope.setDecay(this.envelope.decayTime);
        noteEnvelope.setSustain(this.envelope.sustainLevel);
        noteEnvelope.setRelease(this.envelope.releaseTime);
        noteEnvelope.setTarget(noteGain.gain);
        
        // Schedule envelope attack at the start time
        setTimeout(() => {
            noteEnvelope.triggerAttack();
        }, Math.max(0, (startTime - ctx.currentTime) * 1000));
        
        noteData.envelope = noteEnvelope;
        
        // Initialize oscillators for this note
        this.oscillators.forEach((osc, index) => {
            // Create a new oscillator instance for each note
            const oscInstance = new Oscillator(osc.id);
            oscInstance.setType(osc.type);
            oscInstance.setVolume(osc.volume);
            oscInstance.setDetune(osc.detune);
            
            // Initialize oscillator with its own nodes
            oscInstance.init(noteGain);
            
            // Use the connectOscillator function to properly connect through panner
            connectOscillator(
                oscInstance.getOutput(), // Get the oscillator's output node
                index === 0, // true for first oscillator, false for others
                noteGain // The destination node
            );
            
            // Schedule oscillator start at the correct time
            setTimeout(() => {
                oscInstance.start(frequency);
            }, Math.max(0, (startTime - ctx.currentTime) * 1000));
            
            // Store oscillator instance
            noteData.oscillatorNodes.push(oscInstance);
        });
        
        // Store note data
        this.activeNotes.set(noteName, noteData);
        
        console.log(`Playing note: ${noteName} (${frequency}Hz) at time ${startTime.toFixed(3)}`);
    }

    // Stop a currently playing note
    stopNote(noteName) {
        if (!this.activeNotes.has(noteName)) return;
        
        const noteData = this.activeNotes.get(noteName);
        
        // Trigger release phase of envelope
        if (noteData.envelope) {
            noteData.envelope.triggerRelease();
        }
        
        // Clean up after release time
        const releaseTime = noteData.envelope ? noteData.envelope.releaseTime : 0.5;
        setTimeout(() => {
            try {
                // Stop and clean up oscillators
                if (noteData.oscillatorNodes) {
                    noteData.oscillatorNodes.forEach(osc => {
                        if (osc && typeof osc.stop === 'function') {
                            osc.stop();
                            osc.cleanup();
                        }
                    });
                }
                
                // Disconnect note gain node
                if (noteData.gainNode) {
                    noteData.gainNode.disconnect();
                }
                
                // Remove from active notes
                this.activeNotes.delete(noteName);
                console.log(`Stopped note: ${noteName}`);
            } catch (e) {
                console.error(`Error stopping note ${noteName}:`, e);
            }
        }, releaseTime * 1000 + 100); // Add a small buffer
    }

    // Play a note by frequency (used for MIDI input)
    playNoteByFrequency(frequency, velocity) {
        const noteName = Object.keys(this.NOTE_FREQUENCIES).find(
            key => this.NOTE_FREQUENCIES[key] === frequency
        );
        if (noteName) {
            this.playNote(noteName);
        } else {
            console.warn(`Frequency ${frequency}Hz does not match any known note.`);
        }
    }

    // Stop a note by frequency (used for MIDI input)
    stopNoteByFrequency(frequency) {
        const noteName = Object.keys(this.NOTE_FREQUENCIES).find(
            key => this.NOTE_FREQUENCIES[key] === frequency
        );
        if (noteName) {
            this.stopNote(noteName);
        } else {
            console.warn(`Frequency ${frequency}Hz does not match any known note.`);
        }
    }

    // Stop all currently playing notes
    stopAllNotes() {
        for (const noteName of this.activeNotes.keys()) {
            this.stopNote(noteName);
        }
    }

    // Set the LFO target parameter
    setLFOTarget(target) {
        if (!this.lfo || !this.isPoweredOn) return;
        
        switch (target) {
            case 'filter':
                // Connect LFO to filter cutoff frequency
                this.lfo.connect(this.filter.filter.frequency, this.filter.cutoff);
                break;
            case 'amplitude':
                // Connect LFO to master gain
                this.lfo.connect(this.masterGain.gain, this.masterGain.gain.value);
                break;
            default:
                console.warn(`Unknown LFO target: ${target}`);
        }
    }

    // Update UI to reflect synthesizer state
    updateUI() {
        // Update power button
        const powerButton = document.getElementById('powerButton');
        if (powerButton) {
            powerButton.textContent = this.isPoweredOn ? 'Power Off' : 'Power On';
            powerButton.classList.toggle('active', this.isPoweredOn);
        }
        
        // Disable/enable all controls based on power state
        const controls = document.querySelectorAll('input, select');
        controls.forEach(control => {
            control.disabled = !this.isPoweredOn;
        });
    }

    // Create the virtual keyboard
    createKeyboard() {
        const keyboardElement = document.getElementById('keyboard');
        if (!keyboardElement) return;
        
        keyboardElement.innerHTML = '';
        
        // Define keys to create (2 octaves)
        const keys = ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
                     'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5'];
        
        // Create key elements
        keys.forEach(note => {
            const keyElement = document.createElement('div');
            keyElement.className = 'key';
            keyElement.dataset.note = note;
            
            // Determine if it's a white or black key
            const isSharp = note.includes('#');
            keyElement.dataset.noteType = isSharp ? 'black' : 'white';
            
            // Find the keyboard key for this note
            const keyboardKey = Object.keys(this.KEYBOARD_MAPPING).find(
                key => this.KEYBOARD_MAPPING[key] === note
            );
            
            // Add label for computer key
            if (keyboardKey) {
                const keyLabel = document.createElement('span');
                keyLabel.textContent = keyboardKey.toUpperCase();
                keyElement.appendChild(keyLabel);
            }
            
            // Add event listeners for mouse interaction
            keyElement.addEventListener('mousedown', () => {
                console.log(`Mouse down on key: ${note}`);
                keyElement.classList.add('active'); // Add active class for highlighting
                this.playNote(note);
            });
            keyElement.addEventListener('mouseup', () => {
                console.log(`Mouse up on key: ${note}`);
                keyElement.classList.remove('active'); // Remove active class
                this.stopNote(note);
            });
            keyElement.addEventListener('mouseleave', () => {
                console.log(`Mouse left key: ${note}`);
                keyElement.classList.remove('active'); // Remove active class
                this.stopNote(note);
            });
            
            // Prevent context menu on right-click
            keyElement.addEventListener('contextmenu', e => e.preventDefault());
            
            keyboardElement.appendChild(keyElement);
        });
    }

    // Setup event listeners for UI controls
    setupEventListeners() {
        // Power button
        const powerButton = document.getElementById('powerButton');
        if (powerButton) {
            powerButton.addEventListener('click', () => {
                if (this.isPoweredOn) {
                    this.shutdown();
                } else {
                    this.init();
                }
            });
        }
        
        // Oscillator controls
        this.setupOscillatorControls();
        
        // Filter controls
        this.setupFilterControls();
        
        // Envelope controls
        this.setupEnvelopeControls();
        
        // LFO controls
        this.setupLFOControls();
        
        // Master volume
        const masterVolume = document.getElementById('master-volume');
        if (masterVolume) {
            masterVolume.addEventListener('input', () => {
                const value = parseFloat(masterVolume.value);
                if (this.masterGain) {
                    this.masterGain.gain.value = this.dbToGain(value);
                }
                document.querySelector('#master-volume + .value').textContent = `${value} dB`;
            });
        }
        
        // Keyboard events
        window.addEventListener('keydown', e => this.handleKeyDown(e));
        window.addEventListener('keyup', e => this.handleKeyUp(e));
    }

    // Setup oscillator control event listeners
    setupOscillatorControls() {
        // For each oscillator
        this.oscillators.forEach((osc, index) => {
            const oscId = index + 1;
            
            // Waveform
            const waveformSelect = document.getElementById(`osc${oscId}-waveform`);
            if (waveformSelect) {
                waveformSelect.addEventListener('change', () => {
                    osc.setType(waveformSelect.value);
                });
            }
            
            // Volume
            const volumeSlider = document.getElementById(`osc${oscId}-volume`);
            if (volumeSlider) {
                volumeSlider.addEventListener('input', () => {
                    const value = parseFloat(volumeSlider.value);
                    osc.setVolume(value);
                    document.querySelector(`#osc${oscId}-volume + .value`).textContent = `${value} dB`;
                });
            }
            
            // Pan control
            const panSlider = document.getElementById(`osc${oscId}-pan`);
            if (panSlider) {
                panSlider.addEventListener('input', () => {
                    const value = parseFloat(panSlider.value);
                    if (oscId === 1) {
                        setPan1(value);
                    } else if (oscId === 2) {
                        setPan2(value);
                    }

                    // Update the display value for pan
                    const displayValue = value === 0 ? 'C' : value < 0 ? `L${Math.abs(value).toFixed(1)}` : `R${value.toFixed(1)}`;
                    const knobContainer = document.querySelector(`.knob-container:has(#osc${oscId}-pan-knob)`);
                    if (knobContainer) {
                        const panKnobValue = knobContainer.querySelector('.knob-value');
                        if (panKnobValue) {
                            panKnobValue.textContent = displayValue;
                        }
                    }
                });
            }
            
            // Detune
            const detuneSlider = document.getElementById(`osc${oscId}-detune`);
            if (detuneSlider) {
                detuneSlider.addEventListener('input', () => {
                    const value = parseFloat(detuneSlider.value);
                    osc.setDetune(value);
                    document.querySelector(`#osc${oscId}-detune + .value`).textContent = `${value} cents`;
                });
            }
        });
    }

    // Setup filter control event listeners
    setupFilterControls() {
        // Filter type
        const filterTypeSelect = document.getElementById('filter-type');
        if (filterTypeSelect) {
            filterTypeSelect.addEventListener('change', () => {
                this.filter.setType(filterTypeSelect.value);
            });
        }
        
        // Cutoff
        const cutoffSlider = document.getElementById('filter-cutoff');
        if (cutoffSlider) {
            cutoffSlider.addEventListener('input', () => {
                const value = parseFloat(cutoffSlider.value);
                this.filter.setCutoff(value);
                document.querySelector('#filter-cutoff + .value').textContent = `${value} Hz`;
            });
        }
        
        // Resonance
        const resonanceSlider = document.getElementById('filter-resonance');
        if (resonanceSlider) {
            resonanceSlider.addEventListener('input', () => {
                const value = parseFloat(resonanceSlider.value);
                this.filter.setResonance(value);
                document.querySelector('#filter-resonance + .value').textContent = value.toFixed(1);
            });
        }
    }

    // Setup envelope control event listeners
    setupEnvelopeControls() {
        // Attack
        const attackSlider = document.getElementById('env-attack');
        if (attackSlider) {
            attackSlider.addEventListener('input', () => {
                const value = parseFloat(attackSlider.value);
                this.envelope.setAttack(value);
                document.querySelector('#env-attack + .value').textContent = `${value.toFixed(2)} s`;
            });
        }
        
        // Decay
        const decaySlider = document.getElementById('env-decay');
        if (decaySlider) {
            decaySlider.addEventListener('input', () => {
                const value = parseFloat(decaySlider.value);
                this.envelope.setDecay(value);
                document.querySelector('#env-decay + .value').textContent = `${value.toFixed(2)} s`;
            });
        }
        
        // Sustain
        const sustainSlider = document.getElementById('env-sustain');
        if (sustainSlider) {
            sustainSlider.addEventListener('input', () => {
                const value = parseFloat(sustainSlider.value);
                this.envelope.setSustain(value);
                document.querySelector('#env-sustain + .value').textContent = value.toFixed(2);
            });
        }
        
        // Release
        const releaseSlider = document.getElementById('env-release');
        if (releaseSlider) {
            releaseSlider.addEventListener('input', () => {
                const value = parseFloat(releaseSlider.value);
                this.envelope.setRelease(value);
                document.querySelector('#env-release + .value').textContent = `${value.toFixed(2)} s`;
            });
        }
    }

    // Setup LFO control event listeners
    setupLFOControls() {
        // Waveform
        const lfoWaveformSelect = document.getElementById('lfo-waveform');
        if (lfoWaveformSelect) {
            lfoWaveformSelect.addEventListener('change', () => {
                this.lfo.setType(lfoWaveformSelect.value);
            });
        }
        
        // Frequency
        const lfoFrequencySlider = document.getElementById('lfo-frequency');
        if (lfoFrequencySlider) {
            lfoFrequencySlider.addEventListener('input', () => {
                const value = parseFloat(lfoFrequencySlider.value);
                this.lfo.setFrequency(value);
                document.querySelector('#lfo-frequency + .value').textContent = `${value.toFixed(1)} Hz`;
            });
        }
        
        // Amplitude
        const lfoAmplitudeSlider = document.getElementById('lfo-amplitude');
        if (lfoAmplitudeSlider) {
            lfoAmplitudeSlider.addEventListener('input', () => {
                const value = parseFloat(lfoAmplitudeSlider.value);
                this.lfo.setAmplitude(value);
                document.querySelector('#lfo-amplitude + .value').textContent = value.toFixed(2);
            });
        }
        
        // Target
        const lfoTargetSelect = document.getElementById('lfo-target');
        if (lfoTargetSelect) {
            lfoTargetSelect.addEventListener('change', () => {
                this.setLFOTarget(lfoTargetSelect.value);
            });
        }
    }

    // Handle keyboard key down event
    handleKeyDown(event) {
        // Prevent key repeat
        if (event.repeat) return;
        
        const key = event.key.toLowerCase();
        
        // Check if this key is mapped to a note
        if (this.KEYBOARD_MAPPING[key]) {
            const note = this.KEYBOARD_MAPPING[key];
            this.playNote(note);
            
            // Add visual feedback
            const keyElement = document.querySelector(`.key[data-note="${note}"]`);
            if (keyElement) {
                keyElement.classList.add('active');
            }
        }
    }

    // Handle keyboard key up event
    handleKeyUp(event) {
        const key = event.key.toLowerCase();
        
        // Check if this key is mapped to a note
        if (this.KEYBOARD_MAPPING[key]) {
            const note = this.KEYBOARD_MAPPING[key];
            this.stopNote(note);
            
            // Remove visual feedback
            const keyElement = document.querySelector(`.key[data-note="${note}"]`);
            if (keyElement) {
                keyElement.classList.remove('active');
            }
        }
    }

    // Generate frequencies for all musical notes
    generateNoteFrequencies() {
        const notes = {};
        const A4 = 440; // Hz
        
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        // Generate notes from C0 to B8
        for (let octave = 0; octave <= 8; octave++) {
            for (let i = 0; i < noteNames.length; i++) {
                const noteName = `${noteNames[i]}${octave}`;
                
                // Calculate note index relative to A4 (note 57, where A = 9, octave = 4)
                const noteIndex = octave * 12 + i - 57;
                
                // Calculate frequency: f = 440 * 2^(n/12)
                const frequency = A4 * Math.pow(2, noteIndex / 12);
                
                notes[noteName] = frequency;
            }
        }
        
        return notes;
    }

    // Convert dB value to gain (amplitude)
    dbToGain(db) {
        return Math.pow(10, db / 20);
    }
}

// Initialize synthesizer when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const synth = new Synthesizer();
    synthInstance = synth; // Assign global instance for testing
    
    // Listen for clicks on the power button to initialize audio
    document.getElementById('powerButton').addEventListener('click', () => {
        if (!synth.isPoweredOn) {
            synth.init();
            
            // Initialize test utilities if synth is powered on
            if (synth.isPoweredOn && !window.synthTester) {
                window.synthTester = new SynthTester(synth);
                console.log('Test utilities initialized');
            }
        } else {
            synth.shutdown();
        }
    });
    
    // Update all UI value displays
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        const valueDisplay = slider.nextElementSibling;
        if (valueDisplay && valueDisplay.classList.contains('value')) {
            const value = parseFloat(slider.value);
            
            // Format based on control type
            if (slider.id.includes('volume') || slider.id.includes('master')) {
                valueDisplay.textContent = `${value} dB`;
            } else if (slider.id.includes('detune')) {
                valueDisplay.textContent = `${value} cents`;
            } else if (slider.id.includes('cutoff')) {
                valueDisplay.textContent = `${value} Hz`;
            } else if (slider.id.includes('frequency')) {
                valueDisplay.textContent = `${value.toFixed(1)} Hz`;
            } else if (slider.id.includes('attack') || slider.id.includes('decay') || slider.id.includes('release')) {
                valueDisplay.textContent = `${value.toFixed(2)} s`;
            } else {
                valueDisplay.textContent = value.toFixed(2);
            }
        }
    });
});