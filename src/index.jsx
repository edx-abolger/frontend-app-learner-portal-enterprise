import 'babel-polyfill';

import {
  initialize,
  APP_INIT_ERROR,
  APP_READY,
  subscribe,
} from '@edx/frontend-platform';
import { ErrorPage, AppProvider } from '@edx/frontend-platform/react';
import React from 'react';
import ReactDOM from 'react-dom';

import { App } from './components/app';

subscribe(APP_READY, () => {
  ReactDOM.render(
    (
      <AppProvider>
        <App />
      </AppProvider>
    ),
    document.getElementById('root'),
  );
});

subscribe(APP_INIT_ERROR, (error) => {
  ReactDOM.render(<ErrorPage message={error.message} />, document.getElementById('root'));
});

initialize({
  messages: [],
  requireAuthenticatedUser: true,
  hydrateAuthenticatedUser: true,
});
