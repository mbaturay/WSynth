// knob-controller.js - Handles the behavior of rotary knob controls

class KnobController {
    constructor() {
        this.knobs = document.querySelectorAll('.knob');
        this.activeKnob = null;
        this.startY = 0;
        this.currentValue = 0;
        this.knobValues = new Map();
        
        this.init();
    }
    
    init() {
        // Initialize all knobs
        this.knobs.forEach(knob => {
            // Get attributes
            const controlId = knob.dataset.control;
            const minValue = parseFloat(knob.dataset.min);
            const maxValue = parseFloat(knob.dataset.max);
            const initialValue = parseFloat(knob.dataset.value);
            const isLogarithmic = knob.dataset.log === 'true';
            
            // Store values for this knob
            this.knobValues.set(knob.id, {
                controlId,
                minValue,
                maxValue,
                currentValue: initialValue,
                isLogarithmic
            });
            
            // Set initial rotation
            this.updateKnobRotation(knob, initialValue, minValue, maxValue, isLogarithmic);
            
            // Add event listeners
            knob.addEventListener('mousedown', this.handleKnobMouseDown.bind(this));
            knob.addEventListener('touchstart', this.handleKnobTouchStart.bind(this), { passive: false });
        });
        
        // Global event listeners
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Also handle the hidden range inputs to keep everything in sync
        document.querySelectorAll('input[type="range"]').forEach(input => {
            input.addEventListener('input', this.handleInputChange.bind(this));
        });
    }
    
    handleKnobMouseDown(event) {
        this.startDrag(event.target, event.clientY);
        event.preventDefault();
    }
    
    handleKnobTouchStart(event) {
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.startDrag(event.target, touch.clientY);
            event.preventDefault();
        }
    }
    
    startDrag(knob, clientY) {
        this.activeKnob = knob;
        this.startY = clientY;
        
        const knobData = this.knobValues.get(knob.id);
        this.currentValue = knobData.currentValue;
        
        // Add active class for styling
        knob.classList.add('active');
    }
    
    handleMouseMove(event) {
        if (!this.activeKnob) return;
        this.updateKnobValue(event.clientY);
    }
    
    handleTouchMove(event) {
        if (!this.activeKnob || event.touches.length !== 1) return;
        this.updateKnobValue(event.touches[0].clientY);
        event.preventDefault();
    }
    
    updateKnobValue(clientY) {
        if (!this.activeKnob) return;
        
        const knobData = this.knobValues.get(this.activeKnob.id);
        const { minValue, maxValue, controlId, isLogarithmic } = knobData;
        
        // Calculate value change based on vertical movement (up = increase, down = decrease)
        const sensitivity = 200; // Adjust for sensitivity
        const deltaY = this.startY - clientY;
        const valueRange = maxValue - minValue;
        
        let newValue;
        if (isLogarithmic) {
            // For logarithmic controls like filter cutoff
            const logMin = Math.log(minValue);
            const logMax = Math.log(maxValue);
            const logRange = logMax - logMin;
            
            const percentChange = deltaY / sensitivity;
            const currentPercent = (Math.log(this.currentValue) - logMin) / logRange;
            let newPercent = currentPercent + percentChange;
            newPercent = Math.min(1, Math.max(0, newPercent));
            
            newValue = Math.exp(logMin + (newPercent * logRange));
        } else {
            // Linear controls
            const changeAmount = (deltaY / sensitivity) * valueRange;
            newValue = this.currentValue + changeAmount;
        }
        
        // Clamp value to min/max
        newValue = Math.min(maxValue, Math.max(minValue, newValue));
        
        // Update knob rotation
        this.updateKnobRotation(this.activeKnob, newValue, minValue, maxValue, isLogarithmic);
        
        // Update the corresponding input element
        const inputElement = document.getElementById(controlId);
        if (inputElement) {
            inputElement.value = newValue;
            
            // Dispatch input event to trigger handlers
            const event = new Event('input', { bubbles: true });
            inputElement.dispatchEvent(event);
        }
        
        // Store new value
        knobData.currentValue = newValue;
    }
    
    handleMouseUp() {
        if (this.activeKnob) {
            this.activeKnob.classList.remove('active');
            this.activeKnob = null;
        }
    }
    
    handleTouchEnd() {
        if (this.activeKnob) {
            this.activeKnob.classList.remove('active');
            this.activeKnob = null;
        }
    }
    
    handleInputChange(event) {
        const input = event.target;
        const id = input.id;
        
        // Find corresponding knob
        const knobId = `${id}-knob`;
        const knob = document.getElementById(knobId);
        
        if (knob) {
            const knobData = this.knobValues.get(knobId);
            if (knobData) {
                const value = parseFloat(input.value);
                knobData.currentValue = value;
                
                this.updateKnobRotation(
                    knob, 
                    value, 
                    knobData.minValue, 
                    knobData.maxValue, 
                    knobData.isLogarithmic
                );
                
                // Update display value
                const valueDisplay = knob.nextElementSibling;
                if (valueDisplay && valueDisplay.classList.contains('knob-value')) {
                    this.updateValueDisplay(valueDisplay, id, value);
                }
            }
        }
    }
    
    updateKnobRotation(knob, value, minValue, maxValue, isLogarithmic) {
        let percent;
        
        if (isLogarithmic) {
            // Logarithmic scale normalization
            const logMin = Math.log(minValue);
            const logMax = Math.log(maxValue);
            const logValue = Math.log(value);
            percent = (logValue - logMin) / (logMax - logMin);
        } else {
            // Linear scale normalization
            percent = (value - minValue) / (maxValue - minValue);
        }
        
        // Convert to degrees (300 degree rotation range from -150 to +150)
        const degrees = -150 + (percent * 300);
        
        // Update knob rotation
        knob.style.transform = `rotate(${degrees}deg)`;
        
        // Update the displayed value
        const valueDisplay = knob.nextElementSibling;
        if (valueDisplay && valueDisplay.classList.contains('knob-value')) {
            const controlId = knob.dataset.control;
            this.updateValueDisplay(valueDisplay, controlId, value);
        }
    }
    
    updateValueDisplay(element, controlId, value) {
        // Format based on control type
        if (controlId.includes('volume') || controlId.includes('master')) {
            element.textContent = `${Math.round(value)} dB`;
        } else if (controlId.includes('detune')) {
            element.textContent = `${Math.round(value)} cents`;
        } else if (controlId.includes('cutoff')) {
            // Round to nearest 10 for readability at higher frequencies
            const roundedValue = value > 1000 ? Math.round(value / 10) * 10 : Math.round(value);
            element.textContent = `${roundedValue} Hz`;
        } else if (controlId.includes('frequency')) {
            element.textContent = `${value.toFixed(1)} Hz`;
        } else if (controlId.includes('attack') || controlId.includes('decay') || controlId.includes('release')) {
            element.textContent = `${value.toFixed(2)} s`;
        } else if (controlId.includes('resonance')) {
            element.textContent = value.toFixed(1);
        } else {
            element.textContent = value.toFixed(2);
        }
    }
}

// Initialize once the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new KnobController();
});

export default KnobController;