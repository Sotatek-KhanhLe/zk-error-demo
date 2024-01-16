import MinaProvider from '@aurowallet/mina-provider';
import { MetaMaskInpageProvider } from '@metamask/providers';

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
    mina?: MinaProvider;
  }
}
