import * as  bodyParser from 'body-parser';
import * as cors from 'cors';
import * as express from 'express';

import {
    Block, generateNextBlock, generatenextBlockWithTransaction, generateRawNextBlock, getAccountProduct,
    getBlockchain
} from './blockchain';
import {connectToPeers, getSockets, initP2PServer} from './p2p';
import {getPublicFromWallet, initWallet} from './wallet';

const httpPort: number = parseInt(process.env.HTTP_PORT) || 3001;
const p2pPort: number = parseInt(process.env.P2P_PORT) || 6001;

const initHttpServer = (myHttpPort: number) => {
    const app = express();
    app.use(bodyParser.json());
    app.use(cors());
    app.use((err, req, res, next) => {
        if (err) {
            res.status(400).send(err.message);
        }
        next();
    });

    /*
    app.get('/blocks', (req, res) => {
        res.send(getBlockchain());
    });
    */
    /*
    app.post('/mineRawBlock', (req, res) => {
        if (req.body.data == null) {
            res.send('data parameter is missing');
            return;
        }
        const newBlock: Block = generateRawNextBlock(req.body.data);
        if (newBlock === null) {
            res.status(400).send('could not generate block');
        } else {
            res.send(newBlock);
        }
    });
    */

    app.post('/init-private-key', (req, res, next) => {
        try {
            initWallet(req.body.user_id);
            res.json({
                status : getPublicFromWallet()
            });
        } catch (e) {
            console.log(e.message);
            res.status(400).send(e.message);
        }
    });
    app.get('/', (req, res, next) => {
        res.json(
            {
                status : 'yorublockchains'
            }
        );
    });
    app.post('/new-product', (req, res, next) => {
        const newBlock: Block = generateNextBlock(req.body.productId);
        if (newBlock === null) {
            res.status(400).send('could not generate block');
        } else {
            res.send(newBlock);
        }
    });

    app.get('/products', (req, res, next) => {
        const balance: number[] = getAccountProduct();
        res.send({ids: balance});
    });

    app.post('/new-transaction', (req, res, next) => {
        const address = req.body.address;
        const productId = req.body.productId;
        try {
            const resp = generatenextBlockWithTransaction(address, productId);
            res.send(resp);
        } catch (e) {
            console.log(e.message);
            res.status(400).send(e.message);
        }
    });

    app.get('/peers', (req, res, next) => {
        res.send(getSockets().map((s: any) => s._socket.remoteAddress + ':' + s._socket.remotePort));
    });
    app.post('/add-peer', (req, res, next) => {
        connectToPeers(req.body.peer);
        res.send();
    });

    app.listen(myHttpPort, () => {
        console.log('Listening http on port: ' + myHttpPort);
    });
};

initHttpServer(httpPort);
initP2PServer(p2pPort);
/*
initWallet();
*/