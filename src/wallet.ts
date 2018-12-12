import {ec} from 'elliptic';
import {existsSync, readFileSync, unlinkSync, writeFileSync} from 'fs';
import * as _ from 'lodash';
import {getPublicKey, getTransactionId, signTxIn, Transaction, TxIn, TxOut, UnspentTxOut} from './transaction';

const EC = new ec('secp256k1');
const privateKeyLocation = 'node/wallet/private_key';

const getPrivateFromWallet = (): string => {
    const buffer = readFileSync(privateKeyLocation, 'utf8');
    return buffer.toString();
};

const getPublicFromWallet = (): string => {
    const privateKey = getPrivateFromWallet();
    const key = EC.keyFromPrivate(privateKey, 'hex');
    return key.getPublic().encode('hex');
};

const generatePrivateKey = (userCode: number): string => {
    const keyPair = EC.genKeyPair();
    const privateKey = keyPair.getPrivate() + 1000000;
    return privateKey.toString(16);
};

const initWallet = (userCode: number) => {
    // let's not override existing private keys
    if (existsSync(privateKeyLocation)) {
        return;
    }
    const newPrivateKey = generatePrivateKey(userCode);

    writeFileSync(privateKeyLocation, newPrivateKey);
    console.log('new wallet with private key created');
};

const getBalance = (address: string, unspentTxOuts: UnspentTxOut[]): number[] => {
    return _(unspentTxOuts)
        .filter((uTxO: UnspentTxOut) => uTxO.address === address)
        .map((uTxO: UnspentTxOut) => uTxO.productId)
        .reduce( (a, b) => a.concat([b]), []) ;
};

const findTxOutsForAmount = (productId: number, myUnspentTxOuts: UnspentTxOut[]) => {
    const includedUnspentTxOuts = [];
    for (const myUnspentTxOut of myUnspentTxOuts) {
        if (myUnspentTxOut.productId === productId) {
            includedUnspentTxOuts.push(myUnspentTxOut);
            return includedUnspentTxOuts;
        }
    }
    throw Error('not enough product to send transaction');
};

const createTxOuts = (receiverAddress: string, productId: number) => {
    const txOut1: TxOut = new TxOut(receiverAddress, productId);
    return [txOut1];
};

const createTransaction = (receiverAddress: string, productId: number,
                           privateKey: string, unspentTxOuts: UnspentTxOut[]): Transaction => {

    const myAddress: string = getPublicKey(privateKey);
    const myUnspentTxOuts = unspentTxOuts.filter((uTxO: UnspentTxOut) => uTxO.address === myAddress);

    const includedUnspentTxOuts = findTxOutsForAmount(productId, myUnspentTxOuts);

    const toUnsignedTxIn = (unspentTxOut: UnspentTxOut) => {
        const txIn: TxIn = new TxIn();
        txIn.txOutId = unspentTxOut.txOutId;
        txIn.txOutIndex = unspentTxOut.txOutIndex;
        return txIn;
    };

    const unsignedTxIns: TxIn[] = includedUnspentTxOuts.map(toUnsignedTxIn);

    const tx: Transaction = new Transaction();
    tx.txIns = unsignedTxIns;
    tx.txOuts = createTxOuts(receiverAddress, productId);
    tx.id = getTransactionId(tx);

    tx.txIns = tx.txIns.map((txIn: TxIn, index: number) => {
        txIn.signature = signTxIn(tx, index, privateKey, unspentTxOuts);
        return txIn;
    });

    return tx;
};

export {createTransaction, getPublicFromWallet,
    getPrivateFromWallet, getBalance, generatePrivateKey, initWallet};
