import React, { useState, useCallback, useEffect } from "react";
import ReactDOM from "react-dom";
import cx from "classnames";
import "@spectrum-web-components/theme/sp-theme.js";
import "@spectrum-web-components/theme/theme-dark.js";
import "@spectrum-web-components/theme/scale-medium.js";
import "@spectrum-web-components/slider/sp-slider.js";
import "./index.css";

// Utility function to create an array with values from 0 to n-1
function range(n) {
  return Array.from({ length: n }).map((_, i) => i);
}

// Generates a random pattern in the form of an array with random values
function generateRandomPattern(rows, cols) {
  return Array.from({ length: cols }).map(() => 
    Math.floor(Math.random() * rows)
  );
}

// Generates a sine wave pattern as an array based on input dimensions
function generateSineWavePattern(rows, cols) {
  return Array.from({ length: cols }).map((_, i) => 
    Math.floor((Math.sin(i / cols * Math.PI * 2) + 1) / 2 * (rows - 1))
  );
}
function generatePerlinPattern(rows, cols) {
  function noise(x) {
    return Math.random() * 2 - 1;
  }
  function smoothNoise(x) {
    return (noise(x - 1) + noise(x) + noise(x + 1)) / 3;
  }
  function interpolate(a, b, t) {
    return a + (b - a) * (t * t * (3 - 2 * t)); // Smoother interpolation
  }
  function perlin(x) {
    let total = 0;
    let frequency = 0.5; // Lower frequency for slower changes
    let amplitude = 1;
    let maxValue = 0;
    for (let o = 0; o < 4; o++) {
      const xi = Math.floor(x * frequency);
      const xf = (x * frequency) % 1;
      total += interpolate(smoothNoise(xi), smoothNoise(xi + 1), xf) * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return total / maxValue;
  }
  return Array.from({ length: cols }, (_, i) => {
    const noiseValue = perlin(i / cols * 10);
    const normalizedValue = (noiseValue + 1) / 2;
    return Math.floor(normalizedValue * (rows - 1));
  });
}

function generateBrownianPattern(rows, cols) {
  const pattern = [Math.floor(Math.random() * rows)];
  for (let i = 1; i < cols; i++) {
    const prev = pattern[i - 1];
    // Small random step, biased to avoid staying static too long
    const step = Math.random() < 0.7 ? (Math.random() < 0.5 ? -1 : 1) : (Math.random() < 0.5 ? -2 : 2);
    let next = prev + step;
    next = Math.max(0, Math.min(rows - 1, next));
    pattern.push(next);
  }
  return pattern;
}
function generateMarkovPattern(rows, cols, seed = Math.random()) {
  // Create transition matrix
  const matrix = Array(rows).fill().map(() => Array(rows).fill(0));
  
  // Initialize with some randomness
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < rows; j++) {
      matrix[i][j] = Math.random();
    }
    // Normalize row
    const sum = matrix[i].reduce((a, b) => a + b, 0);
    matrix[i] = matrix[i].map(v => v / sum);
  }

  // Generate pattern using Markov chain
  const pattern = [];
  let current = Math.floor(seed * rows);
  
  for (let i = 0; i < cols; i++) {
    pattern.push(current);
    const r = Math.random();
    let sum = 0;
    for (let j = 0; j < rows; j++) {
      sum += matrix[current][j];
      if (r <= sum) {
        current = j;
        break;
      }
    }
  }
  
  return pattern;
}

// Cellular Automaton based pattern generator
function generateCellularPattern(rows, cols, seed = Math.random()) {
  const pattern = Array(cols).fill(0);
  const rule = Math.floor(seed * 256); // Wolfram rule number
  
  // Initialize first cell
  pattern[0] = Math.floor(Math.random() * rows);
  
  // Apply cellular automaton rules
  for (let i = 1; i < cols; i++) {
    const prev = pattern[i - 1];
    const next = (prev + Math.floor(Math.random() * 3) - 1) % rows;
    pattern[i] = Math.max(0, Math.min(rows - 1, next));
  }
  
  return pattern;
}

// Neural Network based pattern generator
function generateNeuralPattern(rows, cols, seed = Math.random()) {
  // Simple feed-forward neural network
  const input = Array(5).fill().map(() => Math.random());
  const hidden = Array(16).fill().map(() => Math.random());
  const output = Array(rows).fill().map(() => Math.random());
  
  // Generate pattern using neural network
  const pattern = [];
  for (let i = 0; i < cols; i++) {
    // Forward pass
    const hiddenActivation = hidden.map((w, j) => 
      Math.tanh(input[j % 4] * w + seed)
    );
    
    const outputActivation = output.map((w, j) => 
      hiddenActivation.reduce((sum, h, k) => sum + h * w, 0)
    );
    
    // Convert to row index
    const maxIndex = outputActivation.indexOf(Math.max(...outputActivation));
    pattern.push(maxIndex);
    
    // Shift input window
    input.shift();
    input.push(Math.random());
  }
  
  return pattern;
}

// Genetic Algorithm based pattern generator
function generateGeneticPattern(rows, cols, seed = Math.random()) {
  // Population of patterns
  const population = Array(10).fill().map(() => 
    Array(cols).fill().map(() => Math.floor(Math.random() * rows))
  );
  
  // Fitness function
  const fitness = (pattern) => {
    let score = 0;
    for (let i = 1; i < pattern.length; i++) {
      // Reward smooth transitions
      score += 1 - Math.abs(pattern[i] - pattern[i-1]) / rows;
    }
    return score;
  };
  
  // Evolution steps
  for (let generation = 0; generation < 5; generation++) {
    // Sort by fitness
    population.sort((a, b) => fitness(b) - fitness(a));
    
    // Crossover and mutation
    for (let i = 5; i < 10; i++) {
      const parent1 = population[Math.floor(Math.random() * 5)];
      const parent2 = population[Math.floor(Math.random() * 5)];
      
      // Crossover
      const crossover = Array(cols).fill().map((_, j) => 
        Math.random() < 0.5 ? parent1[j] : parent2[j]
      );
      
      // Mutation
      const mutation = crossover.map(v => 
        Math.random() < 0.1 ? Math.floor(Math.random() * rows) : v
      );
      
      population[i] = mutation;
    }
  }
  
  return population[0]; // Return best pattern
}

// L-System based pattern generator
function generateLSystemPattern(rows, cols, seed = Math.random()) {
  const pattern = [];
  let current = Math.floor(seed * rows);
  
  // L-System rules
  const rules = {
    '0': '01',
    '1': '10'
  };
  
  // Generate L-System string
  let axiom = '0';
  for (let i = 0; i < 3; i++) {
    axiom = axiom.split('').map(c => rules[c] || c).join('');
  }
  
  // Convert to pattern
  for (let i = 0; i < cols; i++) {
    const symbol = axiom[i % axiom.length];
    current = (current + (symbol === '1' ? 1 : -1)) % rows;
    pattern.push(Math.max(0, Math.min(rows - 1, current)));
  }
  
  return pattern;
} 
// Generates a Markov Chain pattern based on transition probabilities
function generateMarkovPattern(rows, cols) {
  // Create a transition matrix where each row represents the current state
  // and each column represents the probability of transitioning to that state
  const transitionMatrix = Array.from({ length: rows }, () => 
    Array.from({ length: rows }, () => Math.random())
  );
  
  // Normalize the transition matrix so each row sums to 1
  for (let i = 0; i < rows; i++) {
    const rowSum = transitionMatrix[i].reduce((sum, val) => sum + val, 0);
    for (let j = 0; j < rows; j++) {
      transitionMatrix[i][j] /= rowSum;
    }
  }

  // Generate the pattern
  const pattern = [];
  let currentState = Math.floor(Math.random() * rows);
  pattern.push(currentState);

  for (let i = 1; i < cols; i++) {
    // Generate a random number between 0 and 1
    const rand = Math.random();
    let cumulativeProb = 0;
    
    // Find the next state based on transition probabilities
    for (let nextState = 0; nextState < rows; nextState++) {
      cumulativeProb += transitionMatrix[currentState][nextState];
      if (rand <= cumulativeProb) {
        currentState = nextState;
        break;
      }
    }
    
    pattern.push(currentState);
  }

  return pattern;
}

// Cell component that represents an individual grid cell in the sequencer
function Cell({ select, selected }) {
  return (
    <div
      className={cx("cell", { selected })}
      onClick={select}
      onPointerMove={(e) => e.buttons && select()}
    ></div>
  );
}

// Column component that represents a column of cells
function Column({ playing, val, setVal, rows }) {
  return (
    <div className={cx("column", { playing })}>
      {range(rows).map((i) => (
        <Cell key={i} select={() => setVal(i)} selected={val === i} />
      ))}
    </div>
  );
}

// Sequencer component managing the grid and functionality of sequence creation
function Sequencer({
  sequence,
  setSequence,
  device,
  paused,
  onToggle,
  onRemove,
  autoAdvance, // new prop
  onAdvance,   // new prop
  isLast,      // new prop
}) {
  const [playing, setPlaying] = useState(0);
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(16);
  const [patternMode, setPatternMode] = useState('manual');

  // Effect to generate initial sequence based on selected pattern mode
  useEffect(() => {
    let newSequence;
    switch(patternMode) {
      case 'random':
        newSequence = generateRandomPattern(rows, cols);
        break;
      case 'sine':
        newSequence = generateSineWavePattern(rows, cols, 'sine');
        break;
      case 'square':
        newSequence = generateSineWavePattern(rows, cols, 'square');
        break;
      case 'triangle':
        newSequence = generateSineWavePattern(rows, cols, 'triangle');
        break;
      case 'sawtooth':
        newSequence = generateSineWavePattern(rows, cols, 'sawtooth');
        break;
      case 'cellular':
        newSequence = generateCellularPattern(rows, cols);
        break;
      case 'neural':
        newSequence = generateNeuralPattern(rows, cols);
        break;
      case 'l-system':
        newSequence = generateLSystemPattern(rows, cols);
        break;
      case 'genetic':
        newSequence = generateGeneticPattern(rows, cols);
        break;
      case 'markov':
        newSequence = generateMarkovPattern(rows, cols);
        break;
      case 'perlin':
        newSequence = generatePerlinPattern(rows, cols);
        break;
      case 'brownian':
        newSequence = generateBrownianPattern(rows, cols);
        break;
      case 'auto':
        newSequence = range(cols).map(i => 
          Math.floor(Math.sin(i * 0.5) * (rows - 1) + Math.random() * 2)
        );
        break;
      default:
        // Preserve existing values for manual mode and adjust column count
        newSequence = [...(sequence.values || [])];
        if (newSequence.length < cols) {
          newSequence = [...newSequence, ...Array(cols - newSequence.length).fill(0)];
        } else if (newSequence.length > cols) {
          newSequence = newSequence.slice(0, cols);
        }
    }
    // Update the sequence state
    setSequence({
      ...sequence,
      values: newSequence
    });
  }, [patternMode, rows, cols]);

  // Callback to set a value in the sequence at a specific index
  const setVal = useCallback(
    (v, i) => {
      const newSequence = {...sequence};
      newSequence.values[i] = v;
      setSequence(newSequence);
    },
    [sequence, setSequence]
  );

  // Callback to set the duration of a sequence
  const setDuration = useCallback(
    (duration) => {
      const newSequence = {...sequence};
      newSequence.duration = duration;
      setSequence(newSequence);
    },
    [sequence, setSequence]
  );

  // Effect to manage playing state and device commands based on sequence
  useEffect(() => {
    if (paused) return;

    const id = setInterval(() => {
      setPlaying((playing) => {
        const nextPlaying = (playing + 1) % cols;
        const allowedMessages = device.AllowedMessages;
        const messageTypes = Buttplug.ButtplugDeviceMessageType;
        if (allowedMessages.includes(messageTypes.LinearCmd)) {
          device.linear(sequence.values[nextPlaying] / 4, Math.floor(sequence.duration * 0.9));
        } else if (allowedMessages.includes(messageTypes.VibrateCmd)) {
          device.vibrate(sequence.values[nextPlaying] / 4);
        }
        // If we've reached the end and autoAdvance is enabled, call onAdvance
        if (nextPlaying === 0 && autoAdvance && onAdvance && !isLast) {
          setTimeout(() => onAdvance(), 0);
        }
        return nextPlaying;
      });
    }, sequence.duration);

    return () => clearInterval(id);
  }, [device, paused, sequence, autoAdvance, onAdvance, isLast, cols]);

  return (
    <div className="sequencer">
      <div className="controls">
        <select 
          value={patternMode} 
          onChange={(e) => setPatternMode(e.target.value)}
        >
          <option value="manual">Manual</option>
          <option value="random">Random</option>
          <option value="sine">Sine Wave</option>
          <option value="square">Square Wave</option>
          <option value="triangle">Triangle Wave</option>
          <option value="sawtooth">Sawtooth Wave</option>
          <option value="cellular">Cellular Automaton</option>
          <option value="neural">Neural Network</option>
          <option value="l-system">L-System</option>
          <option value="genetic">Genetic Algorithm</option>
          <option value="markov">Markov Chain</option>
          <option value="perlin">Perlin Noise</option>
          <option value="brownian">Brownian Motion</option>
          <option value="auto">Auto</option>
        </select>
        <div className="grid-controls">
          <label>
            Rows:
            <input 
              type="number" 
              min="5" 
              max="5" 
              value={rows} 
              onChange={(e) => setRows(Number(e.target.value))}
            />
          </label>
          <label>
            Columns:
            <input 
              type="number" 
              min="16" 
              max="32" 
              value={cols} 
              onChange={(e) => setCols(Number(e.target.value))}
            />
          </label>
        </div>
        <button onClick={() => onToggle(paused)} disabled={!device}>
          {paused ? "play" : "pause"}
        </button>
        <sp-slider
          label="duration"
          value={sequence.duration}
          min={250}
          max={3000}
          step={250}
          onInput={(e) => setDuration(parseInt(e.target.value, 10))}
        ></sp-slider>
        <div className="spacer"></div>
        <button onClick={onRemove}>remove</button>
      </div>
      <div className="grid" style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`
      }}>
        {sequence.values.map((val, i) => (
          <Column 
            key={i} 
            playing={playing === i} 
            val={val} 
            rows={rows}
            setVal={(v) => setVal(v, i)} 
          />
        ))}
      </div>
    </div>
  );
}

// Initial sequences fetched from local storage or default
const initialSequences = localStorage.sequences
  ? JSON.parse(localStorage.sequences)
  : [{values: range(16).map(() => 0), duration: 250}];

// App component representing the main application
function App() {
  const [connecting, setConnecting] = useState(true);
  const [devices, setDevices] = useState([]);
  const [device, setDevice] = useState();
  const [sequences, setSequences] = useState(initialSequences);
  const [playing, setPlaying] = useState();
  const [autoAdvance, setAutoAdvance] = useState(false);

  // Callback to set the device index from a list of devices
  const setDeviceIndex = useCallback((index, devices) => {
    index = Number(index);
    if (isNaN(index)) return;
    localStorage.deviceIndex = index;
    const device = devices.find((device) => device.Index === index);
    if (device) {
      setDevice(device);
    } else if (devices.length) {
      setDevice(devices[0]);
      localStorage.deviceIndex = 0;
    }
  });

  // Effect to initialize connection to device client
  useEffect(async () => {
    await Buttplug.buttplugInit();

    const client = new Buttplug.ButtplugClient("vibe sequencer");
    client.on("deviceadded", () => {
      setDevices(client.Devices);
      setDeviceIndex(localStorage.deviceIndex, client.Devices);
    });

    await client.connect(new Buttplug.ButtplugWebsocketConnectorOptions());

    setDevices(client.Devices);
    setDeviceIndex(localStorage.deviceIndex, client.Devices);

    client.startScanning();

    setConnecting(false);
  }, []);


  return (
    <sp-theme>
      <h1>vibe sequencer</h1>

      {/* Display the device select list, which lets the user select which device to connect to */}
      <label className="device">
        device:{" "}
        <select
          value={connecting ? "" : localStorage.deviceIndex || ""}
          onChange={(e) => setDeviceIndex(e.target.value, devices)}
        >
          {/* Display a message while the client is connecting to the intiface */}
          <option disabled value="">
            {connecting ? "connecting to intiface..." : "select a device"}
          </option>
          {/* List all the devices that are connected */}
          {devices.map((device, i) => (
            <option key={i} value={device.Index}>
              {device.Name}
            </option>
          ))}
        </select>
      </label>
      <label style={{marginLeft: 16}}>
        <input type="checkbox" checked={autoAdvance} onChange={e => setAutoAdvance(e.target.checked)} />
        Auto-advance to next pattern
      </label>

      {/* Render all the sequences in the list */}
      {sequences.map((sequence, i) => {
        return (
          <Sequencer
            key={i}
            sequence={sequence}
            setSequence={(sequence) => {
              const newSequences = sequences.slice(0);
              newSequences[i] = sequence;
              localStorage.sequences = JSON.stringify(newSequences);
              setSequences(newSequences);
            }}
            device={device}
            paused={playing !== i}
            onToggle={(play) => {
              if (play) setPlaying(i);
              else {
                device.stop();
                setPlaying(null);
              }
            }}
            onRemove={() => {
              if (playing === i) {
                if (device) device.stop();
                setPlaying(null);
              }
              const newSequences = sequences.slice(0);
              newSequences.splice(i, 1);
              localStorage.sequences = JSON.stringify(newSequences);
              setSequences(newSequences);
            }}
            autoAdvance={autoAdvance}
            onAdvance={() => {
              if (i + 1 < sequences.length) {
                setPlaying(i + 1);
              } else {
                setPlaying(null);
                if (device) device.stop();
              }
            }}
            isLast={i === sequences.length - 1}
          />
        );
      })}

      {/* Add a button to add a new sequencer */}
      <button
        onClick={() => {
          const newSequences = sequences.slice(0);
          newSequences.push({values: range(16).map(() => 0), duration: 250});
          localStorage.sequences = JSON.stringify(newSequences);
          setSequences(newSequences);
        }}
      >
        add sequencer
      </button>
    </sp-theme>
  );
}

// Render the App component into the root div
ReactDOM.render(<App />, document.getElementById("root"));


