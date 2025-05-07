// panner.js - Stereo panning for both oscillators

import audioContext from './audio-context.js';

// Panner nodes
let pannerNode1, pannerNode2;

// Initialize panners for both oscillators
function initPanners() {
    const ctx = audioContext.getContext();
    if (!ctx) {
        console.error("AudioContext not available for panner initialization.");
        return null;
    }
    
    // Create stereo panner for oscillator 1
    pannerNode1 = ctx.createStereoPanner();
    const panSlider1 = document.getElementById('osc1-pan');
    if (panSlider1) {
        pannerNode1.pan.value = parseFloat(panSlider1.value);
        console.log(`Initialized pannerNode1 with value: ${pannerNode1.pan.value}`);
    } else {
        console.warn("osc1-pan element not found, defaulting to center pan.");
        pannerNode1.pan.value = 0;
    }

    // Create stereo panner for oscillator 2
    pannerNode2 = ctx.createStereoPanner();
    const panSlider2 = document.getElementById('osc2-pan');
    if (panSlider2) {
        pannerNode2.pan.value = parseFloat(panSlider2.value);
        console.log(`Initialized pannerNode2 with value: ${pannerNode2.pan.value}`);
    } else {
        console.warn("osc2-pan element not found, defaulting to center pan.");
        pannerNode2.pan.value = 0;
    }
    
    return { pannerNode1, pannerNode2 };
}

// Get the panner nodes - useful for reconnecting when needed
function getPanners() {
    if (!pannerNode1 || !pannerNode2) {
        return initPanners();
    }
    return { pannerNode1, pannerNode2 };
}

// Set oscillator 1 pan position
function setPan1(value) {
    const ctx = audioContext.getContext();
    if (!ctx) {
        console.error("AudioContext not available for setting pan1.");
        return;
    }
    
    if (!pannerNode1) {
        console.error("pannerNode1 not initialized when trying to set pan.");
        const panners = initPanners();
        if (!panners) return;
        pannerNode1 = panners.pannerNode1;
    }
    
    console.log(`Setting pannerNode1 pan to: ${value}`);
    pannerNode1.pan.setValueAtTime(value, ctx.currentTime);
}

// Set oscillator 2 pan position
function setPan2(value) {
    const ctx = audioContext.getContext();
    if (!ctx) {
        console.error("AudioContext not available for setting pan2.");
        return;
    }
    
    if (!pannerNode2) {
        console.error("pannerNode2 not initialized when trying to set pan.");
        const panners = initPanners();
        if (!panners) return;
        pannerNode2 = panners.pannerNode2;
    }
    
    console.log(`Setting pannerNode2 pan to: ${value}`);
    pannerNode2.pan.setValueAtTime(value, ctx.currentTime);
}

// Connect oscillator output to panner and then to destination
function connectOscillator(oscillatorOutput, isPrimaryOsc, destinationNode) {
    if (!oscillatorOutput) {
        console.error("No oscillator output provided to connect to panner");
        return false;
    }
    
    if (!destinationNode) {
        console.error("No destination node provided for panner connection");
        return false;
    }
    
    const panners = getPanners();
    if (!panners) {
        console.error("Failed to get panner nodes for connection");
        return false;
    }
    
    // Choose the appropriate panner
    const pannerNode = isPrimaryOsc ? panners.pannerNode1 : panners.pannerNode2;
    
    try {
        console.log(`Connecting ${isPrimaryOsc ? "Oscillator 1" : "Oscillator 2"} to panner...`);
        
        // First disconnect oscillator from any previous connections to ensure clean connection
        try {
            oscillatorOutput.disconnect();
            console.log(`Disconnected oscillator ${isPrimaryOsc ? "1" : "2"} from previous connections`);
        } catch (e) {
            // Ignore disconnection errors
            console.log(`Disconnect oscillator error (expected): ${e.message}`);
        }
        
        // Then disconnect panner from any previous connections
        try {
            pannerNode.disconnect();
            console.log(`Disconnected pannerNode${isPrimaryOsc ? "1" : "2"} from previous connections`);
        } catch (e) {
            // Ignore disconnection errors
            console.log(`Disconnect panner error (expected): ${e.message}`);
        }
        
        // Connect oscillator to panner
        oscillatorOutput.connect(pannerNode);
        console.log(`Connected oscillator ${isPrimaryOsc ? "1" : "2"} output to pannerNode${isPrimaryOsc ? "1" : "2"}`);
        
        // Connect panner to destination
        pannerNode.connect(destinationNode);
        console.log(`Connected pannerNode${isPrimaryOsc ? "1" : "2"} to destination`);
        
        // Debug current settings
        const gainValue = oscillatorOutput.gain ? oscillatorOutput.gain.value : 'unknown';
        console.log(`Oscillator ${isPrimaryOsc ? "1" : "2"} connection complete: 
            - Gain: ${gainValue}
            - Pan: ${pannerNode.pan.value}
            - isPrimaryOsc: ${isPrimaryOsc}`);
            
        return true;
    } catch (error) {
        console.error(`Error connecting oscillator ${isPrimaryOsc ? "1" : "2"} through panner:`, error);
        return false;
    }
}

export {
    pannerNode1, 
    pannerNode2,
    initPanners,
    getPanners,
    setPan1,
    setPan2,
    connectOscillator
};