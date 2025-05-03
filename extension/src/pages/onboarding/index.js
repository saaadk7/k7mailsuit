import React from 'react';
import ReactDOM from 'react-dom/client';
import Onboarding from './Onboarding';
import './onboarding.css';

const root = ReactDOM.createRoot(document.getElementById('onboarding-root'));
root.render(
  <React.StrictMode>
    <Onboarding />
  </React.StrictMode>
);
