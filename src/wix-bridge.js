export function createWixBridge() {
  const source = 'aha-design-intro';

  function send(type) {
    const payload = { source, type };
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, '*');
      }
    } catch (_) {}
    try {
      window.dispatchEvent(new CustomEvent('aha-design-intro', { detail: payload }));
    } catch (_) {}
  }

  function onStart(cb) {
    window.addEventListener('message', (e) => {
      const d = e.data;
      if (d && d.source === 'aha-design-wix' && d.type === 'start') cb();
    });
  }

  function onSkip(cb) {
    window.addEventListener('message', (e) => {
      const d = e.data;
      if (d && d.source === 'aha-design-wix' && d.type === 'skip') cb();
    });
  }

  return { send, onStart, onSkip, source };
}
