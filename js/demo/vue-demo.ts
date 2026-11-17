// Demo for the workbench /vue page: the Vue wrapper started from
// PlanBlock::initialData() (as an Inertia page would), saving to Laravel.
import { createApp, h, ref } from 'vue';
import { PlanBlock } from '../src/vue';

const initial = JSON.parse(document.getElementById('plan-data')!.textContent!);
const log = ref<string[]>([]);

createApp({
  render: () => [
    h(PlanBlock, {
      initial,
      onReady: () => log.value.push('ready'),
      onCommand: (c: { type: string }) => log.value.push(`command: ${c.type}`),
      onError: (e: { message: string }) => log.value.push(`error: ${e.message}`),
    }),
    h('pre', { id: 'log' }, log.value.join('\n')),
  ],
}).mount('#app');
