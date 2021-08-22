import React, {useEffect, useRef, useState} from 'react';

import './App.css';

import { getSettings, getSimSettings, modes } from './Modes';
import { annealing, genetic, list } from './services/Optimization';
import { Data, load } from './services/Loader';

import { Run } from './pages/Run';
import { Settings } from 'trading-lib';
import { SimulationSettings } from './services/SimulationSettings';
import { Link, NavLink, Route, Switch } from 'react-router-dom';
import { ListOptimizer } from './pages/ListOptimizer';
import { GridOptimizer } from './pages/GridOptimizer';
import { Monkey } from './pages/Monkey';
import { GeneticOptimizer } from './pages/GeneticOptimizer';
import { Display } from './services/Display';

function App() {
  const [progress, setProgress] = useState<number>(0);
  const [data, setData] = useState<Data[]>([]);
  const [script, setScript] = useState<string | null>(null);
  const [mode, setMode] = useState<string>('alts');

  const [settings, setSettings] = useState<Settings>(getSettings(modes[mode]));
  const [simSettings, setSimSettings] = useState<SimulationSettings>(getSimSettings(modes[mode]));

  useEffect(() => {
    setSettings(getSettings(modes[mode]));
    setSimSettings(getSimSettings(modes[mode]));
  }, [mode]);

  const runRef = useRef<{
    run: () => Promise<void>;
  }>({
    run: async () => {}
  });

  const listOptimizerRef = useRef<{
    run: () => Promise<void>;
  }>({
    run: async () => {}
  });

  const gridOptimizerRef = useRef<{
    run: () => Promise<void>;
  }>({
    run: async () => {}
  });

  const monkeyRef = useRef<{
    run: () => Promise<void>;
  }>({
    run: async () => {}
  });

  const geneticRef = useRef<{
    run: () => Promise<void>;
  }>({
    run: async () => {}
  });

  const getData = async (simulationInterval: string) => {
    let loadedData;

    if (data.length === 0) {
      loadedData = await Promise.all(
        simSettings.symbols.map(symbol => load(modes[mode], symbol, simulationInterval, simSettings))
      );
      setData(loadedData);
    } else {
      loadedData = data;
    }

    return loadedData;
  }

  const optimize = (f: any) => {
    if (!script) return;
    getData(simSettings.simulationInterval).then(data => {
      f(
        script, 
        data, 
        modes[mode], 
        settings, 
        simSettings
      );
    });
  };

  return (
    <div className="App">
      <div className="header">
        <img className="header-icon" src="/icon.png"/>
        <div className="header-title">Algo Sim</div>
        <div className="header-links">
          <NavLink exact to="/" className="header-link" activeClassName="header-link-active">Simulator</NavLink>
          <NavLink to="/list" className="header-link" activeClassName="header-link-active">List</NavLink>
          <NavLink to="/grid" className="header-link" activeClassName="header-link-active">Grid</NavLink>
          <NavLink to="/genetic" className="header-link" activeClassName="header-link-active">Genetic</NavLink>
          <NavLink to="/annealing" className="header-link" activeClassName="header-link-active">Annealing</NavLink>
          <NavLink to="/monkey" className="header-link" activeClassName="header-link-active">Monkey</NavLink>
        </div>
        <div className="header-controls">
            <div className="header-buttons">
              <Switch>
                <Route exact path="/">
                  <button onClick={() => runRef.current && runRef.current.run()}>Run</button>
                </Route>
                <Route path="/list">
                  <button onClick={() => listOptimizerRef.current && listOptimizerRef.current.run()}>Run</button>
                </Route>
                <Route path="/grid">
                  <button onClick={() => gridOptimizerRef.current && gridOptimizerRef.current.run()}>Run</button>
                </Route>
                <Route path="/genetic">
                  <button onClick={() => geneticRef.current && geneticRef.current.run()}>Run</button>
                </Route>
                <Route path="/annealing">
                  <button onClick={() => optimize(annealing)}>Run</button>
                </Route>
                <Route path="/monkey">
                  <button onClick={() => monkeyRef.current && monkeyRef.current.run()}>Run</button>
                </Route>
              </Switch>
            </div>

            <div className="progress">
              <div className="progress-bar" style={{width: progress === 0 ? 0 : progress + '%'}}></div>
            </div>
            <div className="progress-text">{Display.number(progress)}%</div>

            <div>
              <select value={mode} onChange={e => {
                setMode(e.target.value);
                setData([]);
              }}>
                {Object.keys(modes).map(key => 
                  <option key={key} value={key}>{key[0].toUpperCase() + key.slice(1)}</option>
                )}
              </select>
            </div>
          </div>
      </div>

      <div className="content">
        <Switch>
          <Route path="/list">
            <ListOptimizer 
              setProgress={setProgress} 
              setScript={setScript} 
              getData={getData} 
              script={script} 
              mode={modes[mode]}
              settings={settings}
              simSettings={simSettings}
              ref={listOptimizerRef}
            ></ListOptimizer>
          </Route>

          <Route path="/grid">
            <GridOptimizer 
              setProgress={setProgress} 
              setScript={setScript} 
              getData={getData} 
              script={script} 
              mode={modes[mode]}
              settings={settings}
              simSettings={simSettings}
              ref={gridOptimizerRef}
            ></GridOptimizer>
          </Route>

          <Route path="/monkey">
            <Monkey 
              setProgress={setProgress} 
              setScript={setScript} 
              getData={getData} 
              script={script} 
              mode={modes[mode]}
              settings={settings}
              simSettings={simSettings}
              ref={monkeyRef}
            ></Monkey>
          </Route>

          <Route path="/genetic">
            <GeneticOptimizer 
              setProgress={setProgress} 
              setScript={setScript} 
              getData={getData} 
              script={script} 
              mode={modes[mode]}
              settings={settings}
              simSettings={simSettings}
              ref={geneticRef}
            ></GeneticOptimizer>
          </Route>

          <Route exact path="/">
            <Run 
              setProgress={setProgress} 
              setScript={setScript} 
              getData={getData} 
              script={script} 
              mode={modes[mode]}
              settings={settings}
              simSettings={simSettings}
              ref={runRef}
            ></Run>
          </Route>
        </Switch>
      </div>
    </div>
  );
}

export default App;
