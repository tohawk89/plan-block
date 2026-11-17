// Laravel Echo for the workbench demo, connected to the local Reverb server.
// The editor finds window.Echo and subscribes to the plan's channel itself.
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

const config = JSON.parse(document.getElementById('echo-config')!.textContent!);
const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

(window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;
(window as unknown as { Echo: Echo<'reverb'> }).Echo = new Echo({
  broadcaster: 'reverb',
  key: config.key,
  wsHost: config.host,
  wsPort: config.port,
  wssPort: config.port,
  forceTLS: false,
  enabledTransports: ['ws'],
  authEndpoint: '/broadcasting/auth',
  auth: { headers: { 'X-CSRF-TOKEN': csrf } },
});
