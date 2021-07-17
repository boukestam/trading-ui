import { proxy, releaseProxy, wrap } from "comlink";
import { Settings } from "trading-lib";
import { Data } from "./Loader";
import { Mode } from "../Modes";
import { StrategyEvent } from "./Simulation";
import { SimulationSettings } from "./SimulationSettings";

export async function runInWorker (
  mode: Mode, 
  data: Data[], 
  script: string, 
  scriptOptions: Record<string, any> | null, 
  settings: Settings,
  simSettings: SimulationSettings,
  callback?: (event: StrategyEvent) => void
) {
  const worker = new Worker("../SimulationWorker", {
    name: "simulation-worker",
    type: "module"
  });
  const workerApi = wrap<import("../SimulationWorker").SimulationWorker>(worker);

  const result = await workerApi.run(
    data, 
    script, 
    scriptOptions, 
    simSettings, 
    settings, 
    callback && proxy(callback)
  );

  workerApi[releaseProxy]();
  worker.terminate();

  return result;
}