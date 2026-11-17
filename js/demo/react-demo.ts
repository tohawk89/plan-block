// Demo for the workbench /react page: the React wrapper started from
// PlanBlock::initialData() (as an Inertia page would), saving to Laravel.
import { createElement, StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PlanBlock } from '../src/react';

const initial = JSON.parse(document.getElementById('plan-data')!.textContent!);

function App() {
  const [log, setLog] = useState<string[]>([]);
  const add = (line: string) => setLog((l) => [...l, line]);

  return createElement(
    'div',
    null,
    createElement(PlanBlock, {
      initial,
      onReady: () => add('ready'),
      onCommand: (c) => add(`command: ${c.type}`),
      onError: (e) => add(`error: ${e.message}`),
    }),
    createElement('pre', { id: 'log' }, log.join('\n')),
  );
}

createRoot(document.getElementById('app')!).render(createElement(StrictMode, null, createElement(App)));
