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
}) {
  const [playing, setPlaying] = useState(0);
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(8);
  const [patternMode, setPatternMode] = useState('manual');

  // Effect to generate initial sequence based on selected pattern mode
  useEffect(() => {
    let newSequence;
    switch(patternMode) {
      case 'random':
        newSequence = generateRandomPattern(rows, cols);
        break;
      case 'sine':
        newSequence = generateSineWavePattern(rows, cols);
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
        playing = (playing + 1) % cols;
        const allowedMessages = device.AllowedMessages;
        const messageTypes = Buttplug.ButtplugDeviceMessageType;
        if (allowedMessages.includes(messageTypes.LinearCmd)) {
          device.linear(sequence.values[playing] / 4, Math.floor(sequence.duration * 0.9));
        } else if (allowedMessages.includes(messageTypes.VibrateCmd)) {
          device.vibrate(sequence.values[playing] / 4);
        }
        return playing;
      });
    }, sequence.duration);

    return () => clearInterval(id);
  }, [device, paused, sequence]);

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
          <option value="auto">Auto</option>
        </select>
        <div className="grid-controls">
          <label>
            Rows:
            <input 
              type="number" 
              min="3" 
              max="10" 
              value={rows} 
              onChange={(e) => setRows(Number(e.target.value))}
            />
          </label>
          <label>
            Columns:
            <input 
              type="number" 
              min="4" 
              max="16" 
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
  : [{values: range(8).map(() => 0), duration: 250}];

// App component representing the main application
function App() {
  const [connecting, setConnecting] = useState(true);
  const [devices, setDevices] = useState([]);
  const [device, setDevice] = useState();
  const [sequences, setSequences] = useState(initialSequences);
  const [playing, setPlaying] = useState();

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

/*************  ✨ Codeium Command 🌟  *************/
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
          />
        );
      })}

      {/* Add a button to add a new sequencer */}
      <button
        onClick={() => {
          const newSequences = sequences.slice(0);
          newSequences.push({values: range(8).map(() => 0), duration: 250});
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
/******  cdade36f-e074-4008-891d-d18c42a8bc08  *******/


