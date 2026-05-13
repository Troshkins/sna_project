import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// CRA's webpack-dev-server overlay shows every uncaught error, including the
// harmless "ResizeObserver loop completed with undelivered notifications"
// warning that fires when a layout-watching observer schedules work that
// causes another layout pass in the same frame. It doesn't affect runtime,
// so we silence the overlay for this specific message only.
const isResizeObserverLoopMessage = (message) =>
  typeof message === 'string' &&
  (message.includes('ResizeObserver loop completed') ||
    message.includes('ResizeObserver loop limit exceeded'));

window.addEventListener('error', (event) => {
  if (isResizeObserverLoopMessage(event.message)) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason?.message || event.reason;
  if (isResizeObserverLoopMessage(message)) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
