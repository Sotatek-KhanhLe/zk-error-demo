import { Mina, PublicKey, UInt64, fetchAccount } from 'o1js';
import Token from '@/configs/ABIs/Erc20_mina.raw';
import moment from 'moment';
import Hooks from '@/configs/ABIs/Hooks';
import { useState } from 'react';

type ResponseAccountInfo = {
  balance: {
    total: string;
  };
  delegateAccount: {
    publicKey: string;
  };
  inferredNonce: string;
  name: string;
  nonce: string;
  publicKey: string;
};

export default function useHomeLogic() {
  async function connectWallet() {
    const snap = await window.ethereum?.request<
      Record<string, { id: string; version: string }>
    >({
      method: 'wallet_getSnaps',
    });
    console.log('🚀 ~ connectWallet ~ snap:', snap);
    const snapId: string = import.meta.env.REACT_APP_REQUIRED_SNAP_ID;
    const version: string = import.meta.env.REACT_APP_REQUIRED_SNAP_VERSION;

    if (
      !snap ||
      !snap.hasOwnProperty(snapId) ||
      !snap[snapId] ||
      snap[snapId]?.version !== version
    ) {
      await window.ethereum?.request({
        method: 'wallet_requestSnaps',
        params: {
          [snapId]: {
            version: `^${version}`,
          },
        },
      });
    }
    const accountInfo = await window.ethereum?.request<ResponseAccountInfo>({
      method: 'wallet_invokeSnap',
      params: {
        snapId,
        request: {
          method: 'mina_accountInfo',
          params: {},
        },
      },
    });
    if (!accountInfo) return '';
    return accountInfo.publicKey || '';
  }

  function getTime() {
    return moment().format('MMMM Do YYYY, h:mm:ss a');
  }

  async function callZKTransaction() {
    const addr = await connectWallet();
    if (!addr) return;

    const sender = PublicKey.fromBase58(addr);

    const zkAppAddress = PublicKey.fromBase58(
      'B62qnGgFXcQv2VVDLFqvgt3cYB7TMWF8FgkvqUDoUmeNSWNL1Qf33Xq'
    );

    const zkBridgeAddress = PublicKey.fromBase58(
      'B62qiiNVF3QQsdiXJ8jsRUiN6TkNisWGiEnqoJhD5j5XRVLp92Y8wou'
    );

    const hook = PublicKey.fromBase58(
      'B62qjdNm8sDd9S2Zj2pfD3i85tuCk7SNjuF7J6UpPvT6pu1EqPv8Dqb'
    );

    let sentTx;
    console.log('compile the contract...', getTime());
    await Hooks.compile();
    await Token.compile();
    const zkApp = new Token(zkAppAddress);
    Mina.setActiveInstance(
      Mina.Network({
        // mina: 'https://proxy.berkeley.minaexplorer.com/graphql',
        mina: 'https://api.minascan.io/node/berkeley/v1/graphql',
        archive: 'https://api.minascan.io/archive/berkeley/v1/graphql/',
      })
    );
    try {
      const account = await fetchAccount({
        publicKey: sender,
      });
      await fetchAccount({
        publicKey: zkAppAddress,
      });
      await fetchAccount({
        publicKey: hook,
      });
      console.log(`-account:`, getTime(), account);
      // call update() and send transaction
      console.log('build transaction and create proof...', getTime());
      let tx = await Mina.transaction(
        {
          sender: sender,
          fee: Number(0.1) * 1e9,
        },
        async () => {
          // AccountUpdate.fundNewAccount(feepayerAddress);

          await zkApp.lock(
            '0x64797030263Fa2f3be3Fb4d9b7c16FDf11e6d8E1',
            zkBridgeAddress,
            UInt64.from(1_000_000_000n)
          );
          // bridgeApp.lock(zkAppAddress, AMOUNT_TRANSFER)
        }
      );
      console.log(
        '🚀 ~ file: index.tsx:57 ~ callZKTransaction ~ tx:',
        getTime(),
        tx
      );
      await tx.prove();
      const snapId = import.meta.env.REACT_APP_REQUIRED_SNAP_ID;

      console.log('send transaction...', getTime());
      const res = await window.ethereum?.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: snapId,
          request: {
            method: 'mina_sendTransaction',
            params: {
              transaction: tx.toJSON(),
              feePayer: {
                fee: 0.1,
              },
            },
          },
        },
      });
      console.log(
        '🚀 ~ file: index.tsx:57 ~ callZKTransaction ~ res:',
        getTime(),
        res
      );
      // sentTx = await tx.sign([]).send();
    } catch (err) {
      console.log(getTime(), err);
    }

    console.log('sentTx', getTime(), sentTx);
  }

  return callZKTransaction;
}
