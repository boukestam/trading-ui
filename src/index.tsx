import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { wrap } from 'comlink';

function takeALongTimeToDoSomething() {
    const worker = new Worker('./my-first-worker', { name: 'my-first-worker', type: 'module' });
    const workerApi = wrap<import('./my-first-worker').MyFirstWorker>(worker);
    workerApi.takeALongTimeToDoSomething();    
}

ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

console.log('Do something');
takeALongTimeToDoSomething();
console.log('Do another thing');
