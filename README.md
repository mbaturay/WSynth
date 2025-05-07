# WSynth - Modern Web Synthesizer

![WSynth Banner](https://via.placeholder.com/1200x300/333333/FF7F50?text=WSynth+-+Web+Audio+Synthesizer)

WSynth is a fully-featured web-based synthesizer that runs directly in your browser using the native Web Audio API. No plugins, no external libraries, just pure JavaScript power.

## 🎹 [Try it live](https://example.com/wsynth) 

## ✨ Features

WSynth provides all the core components of a traditional hardware synthesizer:

- **Dual Oscillators** - Each with 4 waveforms (sine, square, sawtooth, triangle), independent volume control, panning, and detune
- **Multimode Filter** - Lowpass, highpass, and bandpass filtering with frequency and resonance controls
- **ADSR Envelope** - Shape your sounds with complete Attack, Decay, Sustain, and Release controls
- **LFO Modulation** - Low Frequency Oscillator with multiple waveforms and selectable targets
- **Virtual Keyboard** - Play notes via mouse clicks or computer keyboard (QWERTY layout)
- **Real-time Control** - All parameters are adjustable in real-time without audio interruption
- **MIDI Support** - Connect and play using external MIDI controllers

## 🖥️ Screenshot

![WSynth Interface](https://via.placeholder.com/800x500/333333/FFFFFF?text=WSynth+Interface+Screenshot)

## 🔧 How to Use

1. **Power Up** - Click the "Power" button to initialize the audio system
2. **Play Notes** - Click on the virtual keyboard or use your computer keyboard (Z, X, C, V... for white keys, S, D... for black keys)
3. **Shape Your Sound**:
   - Choose oscillator waveforms and adjust their volumes
   - Set filter type and adjust cutoff/resonance
   - Modify envelope settings to create dynamic sounds
   - Use the LFO to add movement to your sound

## 👨‍💻 Technical Details

WSynth is built using:
- Pure JavaScript (ES6 modules)
- Web Audio API for all sound generation and processing
- HTML5 and CSS3 for the user interface
- No external dependencies or frameworks

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, or Edge)

### Running Locally
1. Clone this repository:
   ```
   git clone https://github.com/yourusername/wsynth.git
   ```
2. Open the project folder
3. Start a local server (e.g., using Live Server in VS Code or any other HTTP server)
4. Open the browser and navigate to the local server URL (typically http://localhost:5500)

## 🧪 Testing Utilities

WSynth includes built-in testing functions to validate synthesizer functionality:
- Oscillator tests
- Envelope behavior tests
- Filter response tests
- Panning tests
- Audio node inspection
- Note leak detection

Access these by clicking on the test panel in the bottom right of the interface when running in development mode.

## 📋 Project Structure

```
WSynth/
├── index.html          # Main HTML file
├── src/
│   ├── css/
│   │   └── styles.css  # Synthesizer styling
│   └── js/
│       ├── audio-context.js    # Audio context management
│       ├── envelope.js         # ADSR envelope implementation
│       ├── filter.js           # Filter implementation
│       ├── knob-controller.js  # UI control for knobs
│       ├── lfo.js              # Low Frequency Oscillator
│       ├── main.js             # Main synthesizer application
│       ├── midi-controller.js  # MIDI input handling
│       ├── oscillator.js       # Oscillator implementation
│       ├── panner.js           # Stereo panning functionality
│       └── test-utils.js       # Testing utilities
```

## 🌟 Future Enhancements

Planned features for future releases:
- Preset system for saving and loading synthesizer settings
- Additional oscillator types (noise, FM synthesis)
- Effects processing (reverb, delay, chorus)
- Enhanced MIDI device support
- Sequencer for programming patterns
- Waveform visualization
- Mobile device optimization
- Additional modulation sources and destinations

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author

Murat K. Baturay

---

Built with ❤️ using the Web Audio API