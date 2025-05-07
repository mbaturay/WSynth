// filepath: f:\Baturay\Code\WSynth\src\js\test-utils.js
// test-utils.js - Testing utilities for diagnosing synthesizer issues

import audioContext from './audio-context.js';

class SynthTester {
    constructor(synthesizer) {
        this.synth = synthesizer;
        this.testStatus = document.createElement('div');
        this.testStatus.id = 'test-status';
        this.testStatus.className = 'test-status';
        this.testStatus.style.cssText = 
            'position: fixed; top: 10px; right: 10px; padding: 10px; ' +
            'background: rgba(0,0,0,0.8); color: white; z-index: 1000; ' +
            'font-family: monospace; font-size: 12px; max-width: 400px; ' +
            'max-height: 300px; overflow-y: auto; border-radius: 5px;';
        document.body.appendChild(this.testStatus);
        
        // Create test controls
        this.createTestControls();
    }
    
    // Create test control panel
    createTestControls() {
        const controlPanel = document.createElement('div');
        controlPanel.id = 'test-controls';
        controlPanel.className = 'test-controls';
        controlPanel.style.cssText = 
            'position: fixed; bottom: 10px; right: 10px; padding: 10px; ' +
            'background: rgba(0,0,0,0.8); color: white; z-index: 1000; ' +
            'font-family: monospace; border-radius: 5px;';
        
        const tests = [
            { id: 'test-oscillators', name: 'Test Oscillators' },
            { id: 'test-envelope', name: 'Test Envelope' },
            { id: 'test-filter', name: 'Test Filter' },
            { id: 'test-panning', name: 'Test Panning' },
            { id: 'test-note-leaks', name: 'Test Note Leaks' },
            { id: 'test-nodes', name: 'Dump Audio Nodes' },
            { id: 'clear-stuck-notes', name: 'Clear Stuck Notes' }
        ];
        
        tests.forEach(test => {
            const button = document.createElement('button');
            button.id = test.id;
            button.textContent = test.name;
            button.style.cssText = 
                'display: block; margin: 5px 0; padding: 5px 10px; ' +
                'background: #333; color: white; border: 1px solid #555; ' +
                'border-radius: 3px; cursor: pointer;';
            button.addEventListener('click', () => this[test.id.replace(/-/g, '_')]());
            controlPanel.appendChild(button);
        });
        
        document.body.appendChild(controlPanel);
    }
    
    // Log test info to the status panel
    log(message, isError = false) {
        const entry = document.createElement('div');
        entry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
        if (isError) {
            entry.style.color = '#ff6666';
        }
        this.testStatus.appendChild(entry);
        this.testStatus.scrollTop = this.testStatus.scrollHeight;
        console.log(message);
    }
    
    // Clear the test status panel
    clearLog() {
        this.testStatus.innerHTML = '';
    }
    
    // Test oscillators individually
    test_oscillators() {
        this.clearLog();
        this.log('Testing oscillators individually...');
        
        // First, make sure no notes are currently playing
        this.clear_stuck_notes();
        
        if (!this.synth.isPoweredOn) {
            this.log('Synth is not powered on. Please turn it on first.', true);
            return;
        }
        
        // Store original settings
        const originalVolume1 = document.getElementById('osc1-volume').value;
        const originalVolume2 = document.getElementById('osc2-volume').value;
        
        // Test oscillator 1 first
        this.log('Setting up oscillator 1 test - turning oscillator 2 down to -60dB');
        
        // Create event to trigger the volume change
        const event = new Event('input', { bubbles: true });
        
        // Set oscillator 2 volume to minimum
        document.getElementById('osc2-volume').value = -60;
        document.getElementById('osc2-volume').dispatchEvent(event);
        
        // Ensure oscillator 1 is at a good volume
        document.getElementById('osc1-volume').value = -5; // Slightly louder for testing
        document.getElementById('osc1-volume').dispatchEvent(event);
        
        this.log('Playing C4 with only Oscillator 1 active (oscillator 2 is silent)...');
        
        // Debug current oscillator settings
        this.log(`Osc1 volume: ${this.synth.oscillators[0].volume}dB, Osc2 volume: ${this.synth.oscillators[1].volume}dB`);
        
        // Play test note with oscillator 1
        setTimeout(() => {
            this.synth.playNote('C4');
            
            setTimeout(() => {
                this.log('Stopping Oscillator 1 test note...');
                this.synth.stopNote('C4');
                
                // Allow a brief pause before testing oscillator 2
                setTimeout(() => {
                    // Now test oscillator 2
                    this.log('Setting up oscillator 2 test - turning oscillator 1 down to -60dB');
                    
                    // Set oscillator 1 to minimum and restore oscillator 2
                    document.getElementById('osc1-volume').value = -60;
                    document.getElementById('osc1-volume').dispatchEvent(event);
                    document.getElementById('osc2-volume').value = -5; // Slightly louder for testing
                    document.getElementById('osc2-volume').dispatchEvent(event);
                    
                    this.log('Playing C4 with only Oscillator 2 active (oscillator 1 is silent)...');
                    
                    // Debug current oscillator settings
                    this.log(`Osc1 volume: ${this.synth.oscillators[0].volume}dB, Osc2 volume: ${this.synth.oscillators[1].volume}dB`);
                    
                    // Play test note with oscillator 2
                    setTimeout(() => {
                        this.synth.playNote('C4');
                        
                        setTimeout(() => {
                            this.log('Stopping Oscillator 2 test note...');
                            this.synth.stopNote('C4');
                            
                            // Restore original settings
                            setTimeout(() => {
                                document.getElementById('osc1-volume').value = originalVolume1;
                                document.getElementById('osc1-volume').dispatchEvent(event);
                                document.getElementById('osc2-volume').value = originalVolume2;
                                document.getElementById('osc2-volume').dispatchEvent(event);
                                
                                this.log('Oscillator test complete. Cleaning up any stuck notes...');
                                this._forceShutdown();
                            }, 500);
                        }, 2000);
                    }, 500);
                }, 1000);
            }, 2000);
        }, 500);
    }
    
    // Test ADSR envelope behavior
    test_envelope() {
        this.clearLog();
        this.log('Testing envelope...');
        
        // First, make sure no notes are currently playing
        this.clear_stuck_notes();
        
        if (!this.synth.isPoweredOn) {
            this.log('Synth is not powered on. Please turn it on first.', true);
            return;
        }
        
        // Store original envelope settings
        const originalAttack = document.getElementById('env-attack').value;
        const originalDecay = document.getElementById('env-decay').value;
        const originalSustain = document.getElementById('env-sustain').value;
        const originalRelease = document.getElementById('env-release').value;
        
        const event = new Event('input', { bubbles: true });
        
        // Test 1: Slow Attack
        this.log('----- Test 1: Slow Attack -----');
        document.getElementById('env-attack').value = 1.0; // 1 second attack
        document.getElementById('env-decay').value = 0.2;
        document.getElementById('env-sustain').value = 0.8;
        document.getElementById('env-release').value = 0.2;
        
        document.getElementById('env-attack').dispatchEvent(event);
        document.getElementById('env-decay').dispatchEvent(event);
        document.getElementById('env-sustain').dispatchEvent(event);
        document.getElementById('env-release').dispatchEvent(event);
        
        this.log('Playing note with SLOW ATTACK (1s)...');
        this.log('Envelope: Attack=1.0s, Decay=0.2s, Sustain=0.8, Release=0.2s');
        this.synth.playNote('C4');
        
        // After attack+decay, release the note
        setTimeout(() => {
            this.log('Releasing note...');
            this.synth.stopNote('C4');
            
            // Test 2: Long Decay
            setTimeout(() => {
                this.log('----- Test 2: Long Decay -----');
                document.getElementById('env-attack').value = 0.1; // Short attack
                document.getElementById('env-decay').value = 1.5;  // Long decay
                document.getElementById('env-sustain').value = 0.3; // Low sustain
                document.getElementById('env-release').value = 0.2;
                
                document.getElementById('env-attack').dispatchEvent(event);
                document.getElementById('env-decay').dispatchEvent(event);
                document.getElementById('env-sustain').dispatchEvent(event);
                document.getElementById('env-release').dispatchEvent(event);
                
                this.log('Playing note with LONG DECAY (1.5s)...');
                this.log('Envelope: Attack=0.1s, Decay=1.5s, Sustain=0.3, Release=0.2s');
                this.synth.playNote('C4');
                
                // Release after decay finishes
                setTimeout(() => {
                    this.log('Releasing note...');
                    this.synth.stopNote('C4');
                    
                    // Test 3: Low Sustain Level
                    setTimeout(() => {
                        this.log('----- Test 3: Low Sustain Level -----');
                        document.getElementById('env-attack').value = 0.1;
                        document.getElementById('env-decay').value = 0.2;
                        document.getElementById('env-sustain').value = 0.2; // Very low sustain
                        document.getElementById('env-release').value = 0.2;
                        
                        document.getElementById('env-attack').dispatchEvent(event);
                        document.getElementById('env-decay').dispatchEvent(event);
                        document.getElementById('env-sustain').dispatchEvent(event);
                        document.getElementById('env-release').dispatchEvent(event);
                        
                        this.log('Playing note with LOW SUSTAIN (0.2)...');
                        this.log('Envelope: Attack=0.1s, Decay=0.2s, Sustain=0.2, Release=0.2s');
                        this.synth.playNote('C4');
                        
                        // Release during sustain
                        setTimeout(() => {
                            this.log('Releasing note...');
                            this.synth.stopNote('C4');
                            
                            // Test 4: Long Release
                            setTimeout(() => {
                                this.log('----- Test 4: Long Release -----');
                                document.getElementById('env-attack').value = 0.1;
                                document.getElementById('env-decay').value = 0.2;
                                document.getElementById('env-sustain').value = 0.8; // High sustain
                                document.getElementById('env-release').value = 2.0; // Very long release
                                
                                document.getElementById('env-attack').dispatchEvent(event);
                                document.getElementById('env-decay').dispatchEvent(event);
                                document.getElementById('env-sustain').dispatchEvent(event);
                                document.getElementById('env-release').dispatchEvent(event);
                                
                                this.log('Playing note with LONG RELEASE (2s)...');
                                this.log('Envelope: Attack=0.1s, Decay=0.2s, Sustain=0.8, Release=2.0s');
                                this.synth.playNote('C4');
                                
                                // Release during sustain
                                setTimeout(() => {
                                    this.log('Releasing note - listen for 2-second RELEASE phase...');
                                    this.synth.stopNote('C4');
                                    
                                    // Restore original settings after all tests
                                    setTimeout(() => {
                                        document.getElementById('env-attack').value = originalAttack;
                                        document.getElementById('env-decay').value = originalDecay;
                                        document.getElementById('env-sustain').value = originalSustain;
                                        document.getElementById('env-release').value = originalRelease;
                                        
                                        document.getElementById('env-attack').dispatchEvent(event);
                                        document.getElementById('env-decay').dispatchEvent(event);
                                        document.getElementById('env-sustain').dispatchEvent(event);
                                        document.getElementById('env-release').dispatchEvent(event);
                                        
                                        this.log('Envelope test complete - all original settings restored.');
                                        
                                        // Force audio reset to ensure clean state
                                        this.clear_stuck_notes();
                                    }, 2500); // Wait for release to finish
                                }, 800);
                            }, 800);
                        }, 800);
                    }, 800);
                }, 2000); // Wait for decay phase
            }, 800);
        }, 1500); // Wait for attack+decay
    }
    
    // Test filter behavior
    test_filter() {
        this.clearLog();
        this.log('Testing filter...');
        
        // First, make sure no notes are currently playing
        this.clear_stuck_notes();
        
        if (!this.synth.isPoweredOn) {
            this.log('Synth is not powered on. Please turn it on first.', true);
            return;
        }
        
        // Store original filter settings
        const originalCutoff = document.getElementById('filter-cutoff').value;
        const originalResonance = document.getElementById('filter-resonance').value;
        const originalType = document.getElementById('filter-type').value;
        
        const event = new Event('input', { bubbles: true });
        const changeEvent = new Event('change');
        
        // First test lowpass with low resonance
        document.getElementById('filter-type').value = 'lowpass';
        document.getElementById('filter-type').dispatchEvent(changeEvent);
        document.getElementById('filter-resonance').value = 1;
        document.getElementById('filter-resonance').dispatchEvent(event);
        
        this.log('Playing C4 with lowpass filter at low resonance (Q=1)...');
        this.log('Testing cutoff sweep from low to high...');
        
        // Track if test is complete to prevent stray timeouts
        let testComplete = false;
        let noteStarted = false;
        
        // Play the test note
        try {
            this.synth.playNote('C4');
            noteStarted = true;
            this.log('Note C4 started successfully');
        } catch (error) {
            this.log(`Error starting note: ${error.message}`, true);
            return;
        }
        
        // Handle cutoff sweep with safer timing
        let cutoffSweepStep = 0;
        const cutoffValues = [200, 400, 800, 1600, 3200, 6400, 12800];
        
        const performCutoffSweep = () => {
            if (cutoffSweepStep < cutoffValues.length && !testComplete) {
                const cutoff = cutoffValues[cutoffSweepStep];
                document.getElementById('filter-cutoff').value = cutoff;
                document.getElementById('filter-cutoff').dispatchEvent(event);
                this.log(`Filter cutoff: ${Math.round(cutoff)} Hz, Resonance: 1`);
                cutoffSweepStep++;
                setTimeout(performCutoffSweep, 400);
            } else if (!testComplete) {
                this.log('Now testing with high resonance (Q=10)...');
                document.getElementById('filter-resonance').value = 10;
                document.getElementById('filter-resonance').dispatchEvent(event);
                
                // Reset cutoff to low value
                cutoffSweepStep = 0;
                document.getElementById('filter-cutoff').value = cutoffValues[0];
                document.getElementById('filter-cutoff').dispatchEvent(event);
                
                // Start the resonant sweep
                setTimeout(performResonantSweep, 400);
            }
        };
        
        // Handle resonant sweep
        const performResonantSweep = () => {
            if (cutoffSweepStep < cutoffValues.length && !testComplete) {
                const cutoff = cutoffValues[cutoffSweepStep];
                document.getElementById('filter-cutoff').value = cutoff;
                document.getElementById('filter-cutoff').dispatchEvent(event);
                this.log(`Filter cutoff: ${Math.round(cutoff)} Hz, Resonance: 10`);
                cutoffSweepStep++;
                setTimeout(performResonantSweep, 400);
            } else if (!testComplete) {
                this.log('Testing bandpass filter with high resonance...');
                document.getElementById('filter-type').value = 'bandpass';
                document.getElementById('filter-type').dispatchEvent(changeEvent);
                
                // Reset cutoff to mid value
                cutoffSweepStep = 2; // Start from 800Hz for bandpass
                document.getElementById('filter-cutoff').value = cutoffValues[cutoffSweepStep];
                document.getElementById('filter-cutoff').dispatchEvent(event);
                
                // Start the bandpass sweep
                setTimeout(performBandpassSweep, 400);
            }
        };
        
        // Handle bandpass sweep
        const performBandpassSweep = () => {
            if (cutoffSweepStep < cutoffValues.length && !testComplete) {
                const cutoff = cutoffValues[cutoffSweepStep];
                document.getElementById('filter-cutoff').value = cutoff;
                document.getElementById('filter-cutoff').dispatchEvent(event);
                this.log(`Bandpass filter cutoff: ${Math.round(cutoff)} Hz, Resonance: 10`);
                cutoffSweepStep++;
                setTimeout(performBandpassSweep, 400);
            } else if (!testComplete) {
                // We're done, clean up
                finishTest();
            }
        };
        
        // Finish the test with proper cleanup
        const finishTest = () => {
            if (testComplete) return; // Prevent double execution
            
            testComplete = true;
            this.log('Filter test complete, performing cleanup...');
            
            // Ensure we stop the note properly
            if (noteStarted) {
                this.log('Stopping test note...');
                
                try {
                    // First try normal stop
                    this.synth.stopNote('C4');
                    
                    // Force cleanup any active notes
                    setTimeout(() => {
                        if (this.synth.activeNotes.has('C4')) {
                            this.log('Note still active, forcing cleanup...', true);
                            
                            // Get the note data
                            const noteData = this.synth.activeNotes.get('C4');
                            
                            // Force immediate envelope release
                            if (noteData && noteData.envelope) {
                                noteData.envelope.triggerRelease();
                            }
                            
                            // Force cleanup of oscillators
                            if (noteData && noteData.oscillatorNodes) {
                                noteData.oscillatorNodes.forEach(osc => {
                                    if (osc) {
                                        try {
                                            this.synth.cleanupOscillator(osc);
                                        } catch (e) {
                                            this.log(`Error cleaning oscillator: ${e.message}`, true);
                                        }
                                    }
                                });
                            }
                            
                            // Force remove from active notes
                            this.synth.activeNotes.delete('C4');
                            
                            // Force audio reset as a last resort
                            this._forceAudioReset();
                        }
                        
                        completeTestCleanup();
                    }, 500);
                } catch (e) {
                    this.log(`Error stopping note: ${e.message}`, true);
                    this.synth.activeNotes.delete('C4');
                    this._forceAudioReset();
                    completeTestCleanup();
                }
            } else {
                completeTestCleanup();
            }
        };
        
        // Final cleanup steps after note is handled
        const completeTestCleanup = () => {
            // Restore original settings
            this.log('Restoring original filter settings...');
            document.getElementById('filter-cutoff').value = originalCutoff;
            document.getElementById('filter-resonance').value = originalResonance;
            document.getElementById('filter-type').value = originalType;
            
            document.getElementById('filter-cutoff').dispatchEvent(event);
            document.getElementById('filter-resonance').dispatchEvent(event);
            document.getElementById('filter-type').dispatchEvent(changeEvent);
            
            // Force final cleanup
            setTimeout(() => {
                // Run stuck note check twice with delay between
                this.clear_stuck_notes();
                
                setTimeout(() => {
                    this.log('Final verification of no stuck notes...');
                    this.clear_stuck_notes();
                    this.log('Filter test cleanup complete.');
                }, 1000);
            }, 1000);
        };
        
        // Safety timeout to end test if something goes wrong
        setTimeout(() => {
            if (!testComplete) {
                this.log('Safety timeout triggered - ending test', true);
                finishTest();
            }
        }, 20000); // 20 second safety
        
        // Start the first sweep
        setTimeout(performCutoffSweep, 500);
    }
    
    // Test panning
    test_panning() {
        this.clearLog();
        this.log('Testing panning...');
        
        // First, make sure no notes are currently playing
        this.clear_stuck_notes();
        
        if (!this.synth.isPoweredOn) {
            this.log('Synth is not powered on. Please turn it on first.', true);
            return;
        }
        
        // Store original pan settings
        const originalPan1 = document.getElementById('osc1-pan').value;
        const originalPan2 = document.getElementById('osc2-pan').value;
        const originalVolume1 = document.getElementById('osc1-volume').value;
        const originalVolume2 = document.getElementById('osc2-volume').value;
        
        // Create event to trigger the input change
        const event = new Event('input', { bubbles: true });
        
        // Create a cleanup reference for the active note
        let activeNote = 'C4';
        let noteData = null;
        let testComplete = false;
        
        // Test oscillator 1 pan
        this.log('Testing Oscillator 1 panning (center -> left -> right -> center)...');
        
        // Set both oscillators to center position and set volumes
        document.getElementById('osc1-pan').value = 0;
        document.getElementById('osc2-pan').value = 0;
        document.getElementById('osc1-volume').value = -5; // Higher volume for better testing
        document.getElementById('osc2-volume').value = -60; // Turn off osc2
        
        // Dispatch events
        document.getElementById('osc1-pan').dispatchEvent(event);
        document.getElementById('osc2-pan').dispatchEvent(event);
        document.getElementById('osc1-volume').dispatchEvent(event);
        document.getElementById('osc2-volume').dispatchEvent(event);
        
        this.log(`Current oscillator 1 settings: Volume=${this.synth.oscillators[0].volume}dB, Pan=Center`);
        
        // Play a note with oscillator 1
        setTimeout(() => {
            this.synth.playNote(activeNote);
            noteData = this.synth.activeNotes.get(activeNote);
            this.log('Playing C4 with Oscillator 1 in center position');
            
            // Pan left after 1 second
            setTimeout(() => {
                document.getElementById('osc1-pan').value = -1;
                document.getElementById('osc1-pan').dispatchEvent(event);
                this.log('Oscillator 1 panned left');
                
                // Pan right after 1 second
                setTimeout(() => {
                    document.getElementById('osc1-pan').value = 1;
                    document.getElementById('osc1-pan').dispatchEvent(event);
                    this.log('Oscillator 1 panned right');
                    
                    // Stop and test oscillator 2
                    setTimeout(() => {
                        this.log('Stopping Oscillator 1...');
                        
                        // Use the more robust cleanup method
                        if (noteData && noteData.oscillatorNodes) {
                            noteData.oscillatorNodes.forEach(osc => {
                                this.synth.cleanupOscillator(osc);
                            });
                        }
                        
                        // Force stop the note to avoid any stuck notes
                        this.synth.stopNote(activeNote);
                        
                        // Double check the note is stopped
                        if (this.synth.activeNotes.has(activeNote)) {
                            this.log('Note still active, forcing removal...', true);
                            this.synth.activeNotes.delete(activeNote);
                        }
                        
                        // Add a small delay before starting oscillator 2
                        setTimeout(() => {
                            // Now test oscillator 2
                            this.log('Testing Oscillator 2 panning (center -> left -> right -> center)...');
                            
                            document.getElementById('osc1-volume').value = -60;
                            document.getElementById('osc2-volume').value = -5; // Higher volume for testing
                            document.getElementById('osc2-pan').value = 0;
                            
                            document.getElementById('osc1-volume').dispatchEvent(event);
                            document.getElementById('osc2-volume').dispatchEvent(event);
                            document.getElementById('osc2-pan').dispatchEvent(event);
                            
                            this.log(`Current oscillator 2 settings: Volume=${this.synth.oscillators[1].volume}dB, Pan=Center`);
                            
                            // Create a new note for oscillator 2 testing
                            setTimeout(() => {
                                // Play a note with oscillator 2
                                this.synth.playNote(activeNote);
                                noteData = this.synth.activeNotes.get(activeNote);
                                this.log('Playing C4 with Oscillator 2 in center position');
                                
                                // Pan left after 1 second
                                setTimeout(() => {
                                    document.getElementById('osc2-pan').value = -1;
                                    document.getElementById('osc2-pan').dispatchEvent(event);
                                    this.log('Oscillator 2 panned left');
                                    
                                    // Pan right after 1 second
                                    setTimeout(() => {
                                        document.getElementById('osc2-pan').value = 1;
                                        document.getElementById('osc2-pan').dispatchEvent(event);
                                        this.log('Oscillator 2 panned right');
                                        
                                        // Restore original settings after 1 second
                                        setTimeout(() => {
                                            this.log('Stopping Oscillator 2...');
                                            
                                            // Use the more robust cleanup method
                                            if (noteData && noteData.oscillatorNodes) {
                                                noteData.oscillatorNodes.forEach(osc => {
                                                    this.synth.cleanupOscillator(osc);
                                                });
                                            }
                                            
                                            // Force stop the note
                                            this.synth.stopNote(activeNote);
                                            
                                            // Double check the note is stopped
                                            if (this.synth.activeNotes.has(activeNote)) {
                                                this.log('Note still active, forcing removal...', true);
                                                this.synth.activeNotes.delete(activeNote);
                                            }
                                            
                                            testComplete = true;
                                            
                                            // Add a small delay before restoring settings
                                            setTimeout(() => {
                                                // Restore original settings
                                                document.getElementById('osc1-volume').value = originalVolume1;
                                                document.getElementById('osc2-volume').value = originalVolume2;
                                                document.getElementById('osc1-pan').value = originalPan1;
                                                document.getElementById('osc2-pan').value = originalPan2;
                                                
                                                document.getElementById('osc1-volume').dispatchEvent(event);
                                                document.getElementById('osc2-volume').dispatchEvent(event);
                                                document.getElementById('osc1-pan').dispatchEvent(event);
                                                document.getElementById('osc2-pan').dispatchEvent(event);
                                                
                                                this.log('Panning test complete. Final cleanup in progress...');
                                                
                                                // Give the audio context time to process all changes
                                                setTimeout(() => {
                                                    // Force all audio nodes to disconnect
                                                    this._forceAudioReset();
                                                    this.log('Panning test and cleanup complete.');
                                                }, 300);
                                            }, 500);
                                        }, 1000);
                                    }, 1000);
                                }, 1000);
                            }, 300);
                        }, 500);
                    }, 1000);
                }, 1000);
            }, 1000);
        }, 500);
        
        // Safety timeout to ensure cleanup happens even if test gets interrupted
        setTimeout(() => {
            if (!testComplete) {
                this.log('Safety timeout triggered - forcing cleanup', true);
                this._forceAudioReset();
            }
        }, 15000); // 15 second safety timeout
    }
    
    // Force audio reset - completely disconnects and resets the audio system
    _forceAudioReset() {
        try {
            // First try stopping all notes
            this.synth.stopAllNotes();
            
            // Get audio context
            const ctx = audioContext.getContext();
            
            // Create a silent buffer and play it to reset audio
            const silentBuffer = ctx.createBuffer(1, 44100, 44100);
            const silentSource = ctx.createBufferSource();
            silentSource.buffer = silentBuffer;
            
            const silentGain = ctx.createGain();
            silentGain.gain.value = 0;
            
            silentSource.connect(silentGain);
            silentGain.connect(ctx.destination);
            
            silentSource.start();
            silentSource.stop(ctx.currentTime + 0.1);
            
            // Suspend and resume to reset context state
            setTimeout(() => {
                ctx.suspend().then(() => {
                    setTimeout(() => {
                        ctx.resume();
                        
                        // Clear any remaining active notes
                        this.synth.activeNotes.clear();
                        
                        // Reinitialize filter and panner connections
                        this._reinitializeAudio();
                    }, 100);
                });
            }, 200);
        } catch (e) {
            this.log(`Error during audio reset: ${e.message}`, true);
        }
    }
    
    // Test for note leaks
    test_note_leaks() {
        this.clearLog();
        this.log('Testing for note leaks...');
        
        if (!this.synth.isPoweredOn) {
            this.log('Synth is not powered on. Please turn it on first.', true);
            return;
        }
        
        // Play and release a sequence of notes rapidly
        const notes = ['C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4'];
        let index = 0;
        
        const playNextNote = () => {
            if (index < notes.length) {
                const note = notes[index];
                this.log(`Playing note: ${note}`);
                this.synth.playNote(note);
                
                // Release after a short duration
                setTimeout(() => {
                    this.log(`Stopping note: ${note}`);
                    this.synth.stopNote(note);
                    index++;
                    setTimeout(playNextNote, 200);
                }, 300);
            } else {
                this.log('Checking active notes...');
                setTimeout(() => {
                    const activeCount = this.synth.activeNotes.size;
                    if (activeCount > 0) {
                        this.log(`WARNING: ${activeCount} notes still active after all should be released!`, true);
                        this.log('Active notes: ' + Array.from(this.synth.activeNotes.keys()).join(', '), true);
                    } else {
                        this.log('All notes properly released.');
                    }
                    this.log('Note leak test complete.');
                }, 2000);
            }
        };
        
        playNextNote();
    }
    
    // Display information about all active audio nodes
    test_nodes() {
        this.clearLog();
        this.log('Dumping audio node information...');
        
        if (!this.synth.isPoweredOn) {
            this.log('Synth is not powered on. Please turn it on first.', true);
            return;
        }
        
        const ctx = audioContext.getContext();
        if (!ctx) {
            this.log('Audio context not available.', true);
            return;
        }
        
        // Get information about active notes
        this.log(`Active notes: ${this.synth.activeNotes.size}`);
        this.synth.activeNotes.forEach((noteData, noteName) => {
            this.log(`- Note ${noteName} active with ${noteData.oscillatorNodes.length} oscillators`);
        });
        
        // Get information about master gain
        if (this.synth.masterGain) {
            this.log(`Master gain: ${this.synth.masterGain.gain.value.toFixed(4)}`);
        }
        
        // Get information about filter
        if (this.synth.filter && this.synth.filter.filter) {
            this.log(`Filter type: ${this.synth.filter.filter.type}`);
            this.log(`Filter cutoff: ${this.synth.filter.filter.frequency.value.toFixed(2)} Hz`);
            this.log(`Filter Q: ${this.synth.filter.filter.Q.value.toFixed(2)}`);
        }
        
        // Get active oscillator information
        this.oscillatorInfo();
        
        this.log('Audio node dump complete.');
    }
    
    // Get detailed oscillator information
    oscillatorInfo() {
        this.log('Oscillator information:');
        
        // Check synth oscillators array (template instances)
        if (this.synth.oscillators) {
            this.synth.oscillators.forEach((osc, index) => {
                this.log(`Oscillator template ${index + 1}:`);
                this.log(`- Type: ${osc.type}`);
                this.log(`- Volume: ${osc.volume} dB`);
                this.log(`- Detune: ${osc.detune} cents`);
                this.log(`- Pan: ${osc.pan}`);
                this.log(`- Active: ${osc.isActive}`);
            });
        }
        
        // Check active note oscillators (actual instances)
        this.log('Active note oscillators:');
        this.synth.activeNotes.forEach((noteData, noteName) => {
            this.log(`Note ${noteName}:`);
            noteData.oscillatorNodes.forEach((osc, index) => {
                if (osc && osc.oscillator) {
                    this.log(`- Osc ${index + 1}: Type ${osc.type}, Volume ${osc.volume}dB, Frequency ${osc.oscillator.frequency.value.toFixed(2)}Hz`);
                } else {
                    this.log(`- Osc ${index + 1}: INVALID NODE`, true);
                }
            });
        });
    }
    
    // Clear any stuck notes
    clear_stuck_notes() {
        this.clearLog();
        this.log('Clearing all stuck notes...');
        
        // First try the normal cleanup method
        this.synth.stopAllNotes();
        
        // Also manually cleanup each active note
        if (this.synth.activeNotes.size > 0) {
            this.log(`Found ${this.synth.activeNotes.size} active notes to clean up:`, true);
            
            // Get a snapshot of active notes to avoid iteration issues
            const activeNoteNames = Array.from(this.synth.activeNotes.keys());
            
            activeNoteNames.forEach(noteName => {
                this.log(`Cleaning up note: ${noteName}`);
                const noteData = this.synth.activeNotes.get(noteName);
                
                // First directly clean up oscillators
                if (noteData && noteData.oscillatorNodes) {
                    noteData.oscillatorNodes.forEach((osc, index) => {
                        this.log(`- Cleaning up oscillator ${index + 1} for note ${noteName}`);
                        if (osc) {
                            this.synth.cleanupOscillator(osc);
                        }
                    });
                }
                
                // Force immediate removal from active notes
                this.synth.activeNotes.delete(noteName);
            });
        } else {
            this.log('No active notes found');
        }
        
        // Force a complete audio reset
        this._forceAudioReset();
        
        this.log('Stuck note cleanup complete');
    }
    
    // Force shutdown audio completely - most aggressive cleanup
    _forceShutdown() {
        this.log('Forcing complete audio shutdown...');
        
        try {
            // Get context
            const ctx = audioContext.getContext();
            if (!ctx) {
                this.log('No audio context available', true);
                return;
            }
            
            // Create a temporary silent oscillator to replace any stuck ones
            const tempOsc = ctx.createOscillator();
            const tempGain = ctx.createGain();
            tempGain.gain.value = 0; // Silent
            tempOsc.connect(tempGain);
            tempGain.connect(ctx.destination);
            tempOsc.start();
            
            // First try normal cleanup
            this.synth.stopAllNotes();
            
            // Force clean all active nodes
            if (this.synth.activeNotes.size > 0) {
                this.log(`Forcing cleanup of ${this.synth.activeNotes.size} active notes`);
                
                // Immediately clean all active notes
                this.synth.activeNotes.forEach((noteData, noteName) => {
                    if (noteData.oscillatorNodes) {
                        noteData.oscillatorNodes.forEach(osc => {
                            try {
                                if (osc.oscillator) {
                                    osc.oscillator.stop(0);
                                    osc.oscillator.disconnect();
                                }
                                if (osc.gainNode) {
                                    osc.gainNode.gain.setValueAtTime(0, ctx.currentTime);
                                    osc.gainNode.disconnect();
                                }
                            } catch (e) {
                                // Ignore errors
                            }
                        });
                    }
                    
                    // Clear gain node
                    if (noteData.gainNode) {
                        try {
                            noteData.gainNode.gain.setValueAtTime(0, ctx.currentTime);
                            noteData.gainNode.disconnect();
                        } catch (e) {
                            // Ignore errors
                        }
                    }
                });
                
                // Clear all active notes
                this.synth.activeNotes.clear();
            }
            
            // Suspend and resume the audio context
            ctx.suspend().then(() => {
                this.log('Audio context suspended');
                setTimeout(() => {
                    ctx.resume().then(() => {
                        this.log('Audio context resumed');
                        
                        // Stop and disconnect the temporary oscillator
                        tempOsc.stop();
                        tempOsc.disconnect();
                        tempGain.disconnect();
                        
                        // Reinitialize filter and panners
                        this._reinitializeAudio();
                    });
                }, 100);
            });
        } catch (e) {
            this.log(`Error during force shutdown: ${e.message}`, true);
        }
    }
    
    // Reinitialize core audio components
    _reinitializeAudio() {
        try {
            // Get context
            const ctx = audioContext.getContext();
            if (!ctx) return;
            
            // Reconnect filter to master gain
            if (this.synth.filter && this.synth.filter.filter && this.synth.masterGain) {
                try { this.synth.filter.filter.disconnect(); } catch (e) {}
                this.synth.filter.filter.connect(this.synth.masterGain);
            }
            
            // Reconnect master gain to destination
            if (this.synth.masterGain) {
                try { this.synth.masterGain.disconnect(); } catch (e) {}
                this.synth.masterGain.connect(ctx.destination);
            }
            
            // Re-initialize panners
            if (typeof initPanners === 'function') {
                try { 
                    import('./panner.js').then(panner => {
                        panner.initPanners();
                    });
                } catch (e) {
                    this.log('Could not re-initialize panners', true);
                }
            }
            
            this.log('Audio components reinitialized');
        } catch (e) {
            this.log(`Error during audio reinitialization: ${e.message}`, true);
        }
    }
}

export default SynthTester;