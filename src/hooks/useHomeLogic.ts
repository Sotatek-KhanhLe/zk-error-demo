import {
  Experimental,
  Field,
  Mina,
  PublicKey,
  UInt64,
  fetchAccount,
} from 'o1js';
import Token from '@/configs/ABIs/Erc20_mina.raw';
import moment from 'moment';
import Hooks from '@/configs/ABIs/Hooks';
import { Bridge } from '@/configs/ABIs/Bridge';
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

    // token pubkey
    const zkAppAddress = PublicKey.fromBase58(
      'B62qohaSdFQHsRwePtARWT8rUQMU92L5D5HWQ9pA2xUVJKHpytaW873'
    );

    // bridge pubkey
    const zkBridgeAddress = PublicKey.fromBase58(
      'B62qjw7APgQFKZKsufgVvoArwmpxppn7aPpmnAXXwpGPGzsX3vDQga3'
    );

    // hook pubkey
    const hook = PublicKey.fromBase58(
      'B62qj8oiQzRDzvGWS89mNkpKvufyYWMP9Uombsy73sLWBzHi9swY4a2'
    );

    console.log('compile the contracts...', getTime());
    await Hooks.compile();
    await Bridge.compile();
    await Token.compile();
    const zkApp = new Token(zkAppAddress);
    const zkBridge = new Bridge(zkBridgeAddress, zkApp.token.id);
    console.log('compile completed', getTime());

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
      // fetch token account
      await fetchAccount({
        publicKey: zkAppAddress,
      });

      // fetch bridge account
      await fetchAccount({
        publicKey: zkBridgeAddress,
      });

      // fetch hook account
      await fetchAccount({
        publicKey: hook,
      });
      console.log(`finish fetch accounts:`, getTime());

      // call update() and send transaction
      console.log('build transaction and create proof...', getTime());
      let tx = await Mina.transaction(PublicKey.fromBase58(addr), async () => {
        const cb = Experimental.Callback.create(zkBridge, 'checkMinMax', [
          UInt64.from(1_000_000_000n),
        ]);
        await zkApp.lock(
          Field.from('0x64797030263Fa2f3be3Fb4d9b7c16FDf11e6d8E1'),
          zkBridgeAddress,
          cb
        );
      });
      console.log(
        '🚀 ~ file: index.tsx:57 ~ callZKTransaction ~ builded tx:',
        getTime(),
        tx
      );
      await tx.prove();
      const snapId = import.meta.env.REACT_APP_REQUIRED_SNAP_ID;

      console.log('sending transaction...', getTime());
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
    } catch (err) {
      console.log(getTime(), err);
    }
  }

  return callZKTransaction;
}
