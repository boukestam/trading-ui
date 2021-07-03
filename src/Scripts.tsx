import React, { useEffect, useState } from "react";
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-xcode";

const getScriptNames = (): string[] => {
  return JSON.parse(localStorage.getItem('scripts') || '[]');
}

const getScripts = () => {
  return getScriptNames();
};

export const getScript = (name: string): string => {
  return localStorage.getItem(name) || '';
}

const saveScript = (name: string, source: string): void => {
  localStorage.setItem(name, source);
};

const createScript = (name: string): void => {
  localStorage.setItem('scripts', JSON.stringify([...getScriptNames(), name]));
};

function download(filename: string, text: string, mimetype: string) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:' + mimetype + ';charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

export function Scripts ({onChange}: {onChange: (script: string) => void}) {
  const [script, setScript] = useState<string | null>(null);
  const [scriptSource, setScriptSource] = useState<string>('');

  const openScript = (name: string): void => {
    setScript(name);
    onChange(name);

    const code = getScript(name);
    setScriptSource(code);
  };

  useEffect(() => {
    const scripts = getScripts();
    if (scripts.length > 0) {
      openScript(localStorage.getItem('last') || scripts[0]);
    }
  });

  return (
    <React.Fragment>
      <div className="code-container container">
        <AceEditor
          mode="javascript"
          theme="xcode"
          onChange={(value) => {
            if (script) {
              setScriptSource(value);
              saveScript(script, value);
            }
          }}
          name="code-editor"
          editorProps={{ $blockScrolling: true }}
          value={scriptSource}
          tabSize={2}
          showGutter={true}
          showPrintMargin={false}
        />
        <div className="code-controls">
          <select value={script || ''} onChange={(e) => {
            openScript(e.target.value);
            localStorage.setItem('last', e.target.value);
          }}>
            {getScripts().map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <input id="script-name" type="text"/>
          <button onClick={() => {
            createScript((document.getElementById('script-name') as HTMLInputElement).value);
          }}>Create</button>
          <button onClick={() => {
            if (script) {
              saveScript(script, scriptSource);
            }
          }}>Save</button>
          <button onClick={() => {
            const data: {[script: string]: string} = {};
            for (const script of getScripts()) {
              data[script] = getScript(script);
            }
            download('scripts.json', JSON.stringify(data), 'application/json');
          }}>Export</button>
        </div>
      </div>
    </React.Fragment>
  );
}