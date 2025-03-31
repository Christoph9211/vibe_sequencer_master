import React, { useState, useCallback, useEffect } from "react";
import ReactDOM from "react-dom";
import cx from "classnames";
import "@spectrum-web-components/theme/sp-theme.js";
import "@spectrum-web-components/theme/theme-dark.js";
import "@spectrum-web-components/theme/scale-medium.js";
import "@spectrum-web-components/slider/sp-slider.js";
import "./index.css";

// Utility functions
function range(n) {
  return Array.from({ length: n }).map((_, i) => i);
}

function generateRandomPattern(rows, cols) {
  return Array.from({ length: cols }).map(() => 
    Math.floor(Math.random() * rows)
  );
}

function generateSineWavePattern(rows, cols) {
  return Array.from({ length: cols }).map((_, i) => 
    Math.floor((Math.sin(i / cols * Math.PI * 2) + 1) / 2 * (rows - 1))
  );
}

function Cell({ select, selected }) {
  return (
    <div
      className={cx("cell", { selected })}
      onClick={select}
      onPointerMove={(e) => e.buttons && select()}
    ></div>
  );
}

function Column({ playing, val, setVal, rows }) {
  return (
    <div className={cx("column", { playing })}>
      {range(rows).map((i) => (
        <Cell key={i} select={() => setVal(i)} selected={val === i} />
      ))}
    </div>
  );
}

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

  // Generate initial sequence based on mode
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
        // Implement a more complex auto-generating pattern
        newSequence = range(cols).map(i => 
          Math.floor(Math.sin(i * 0.5) * (rows - 1) + Math.random() * 2)
        );
        break;
      default:
        newSequence = sequence.values || range(cols).map(() => 0);
    }
    
    setSequence({
      ...sequence,
      values: newSequence
    });
  }, [patternMode, rows, cols]);

  const setVal = useCallback(
    (v, i) => {
      const newSequence = {...sequence};
      newSequence.values[i] = v;
      setSequence(newSequence);
    },
    [sequence, setSequence]
  );

  const setDuration = useCallback(
    (duration) => {
      const newSequence = {...sequence};
      newSequence.duration = duration;
      setSequence(newSequence);
    },
    [sequence, setSequence]
  );

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

const initialSequences = localStorage.sequences
  ? JSON.parse(localStorage.sequences)
  : [{values: range(8).map(() => 0), duration: 250}];

function App() {
  const [connecting, setConnecting] = useState(true);
  const [devices, setDevices] = useState([]);
  const [device, setDevice] = useState();
  const [sequences, setSequences] = useState(initialSequences);
  const [playing, setPlaying] = useState();

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

      <label className="device">
        device:{" "}
        <select
          value={connecting ? "" : localStorage.deviceIndex || ""}
          onChange={(e) => setDeviceIndex(e.target.value, devices)}
        >
          <option disabled value="">
            {connecting ? "connecting to intiface..." : "select a device"}
          </option>
          {devices.map((device, i) => (
            <option key={i} value={device.Index}>
              {device.Name}
            </option>
          ))}
        </select>
      </label>

      {sequences.map((sequence, i) => {
        return (
          <Sequencer
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
            key={i}
            sequence={sequence}
            setSequence={(sequence) => {
              const newSequences = sequences.slice(0);
              newSequences[i] = sequence;
              localStorage.sequences = JSON.stringify(newSequences);
              setSequences(newSequences);
            }}
            device={device}
          />
        );
      })}

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

ReactDOM.render(<App />, document.getElementById("root"));
