import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'react-redux';
import createHistory from 'history/createBrowserHistory';
import BrowserRouter from 'react-router-async/browser-router';
import { hookRedux } from 'hook-redux';

import Application from 'component/application';
import router from 'core/router-middleware'

// import { GameSocket } from './network/gamesocket';
// import { PacketRegistry } from './network/packetregistry';
import { createStore, applyMiddleware } from 'redux';
import reducers from './reducers';
import thunk from 'redux-thunk';

// import { LoginHandler } from './state/login/login';
// import { WorldHandler } from './state/world/world';
// import { PlayerHandler } from './state/player/player';

// @@@@@
import routes from './routes'
import config from 'config'
import Transport from 'core/transport'
import { Package, HuffmanDecompression } from 'component/helpers'
import manager from 'package/manager'

import Intro from 'component/intro'

const history = createHistory();

const transport = new Transport({
    host        : config['ws.client.host'],
    port        : config['ws.port'],
    protocol    : 'binary',
    binaryType  : 'arraybuffer'
});

const middleware = [
    thunk.withExtraArgument(transport),
    router(history)
];

if(__DEVELOPMENT__) {
    middleware.push(
        require('redux-logger')({
            duration    : true,
            diff        : true,
            collapsed   : true
        })
    );
}

const createStoreWithMiddleware = applyMiddleware(...middleware)(createStore);

const store = createStoreWithMiddleware(reducers);

// @TODO: GO to app HuffmanDecompression
// need huffman return result
const decompression = new HuffmanDecompression(_package => {
    const item = manager.getPackage(_package.getId());

    if(item) {
        item.action(store, _package);
    }
});

transport.on('message', ({ data }) => {
    if(typeof data === 'object') {
        data = new Uint8Array(data);

        if(store.getState().connect.compression) {
            decompression.receive(data);
        } else {
            data = new Package(data);

            const item = manager.getPackage(data.getId());

            if(item) {
                item.action(store, data);
            }
        }
    }
});

BrowserRouter
    .init({
        path    : history.location.pathname,
        hooks   : [
            hookRedux({ dispatch: store.dispatch })
        ],
        routes,
        history
    })
    .then(({ Router, routerProps, callback }) => {
        render(
            (
                <Application>
                    <Provider store={store}>
                        <Router {...routerProps} />
                    </Provider>
                </Application>
            ),
            document.getElementById('app'),
            callback
        );
    });
