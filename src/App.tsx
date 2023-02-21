import React, { useMemo, useState } from 'react';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  SolletWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { ConnectionProvider, useWallet, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connectivity } from './Connectivity';
import { web3 } from '@project-serum/anchor';

require('@solana/wallet-adapter-react-ui/styles.css');


const log = console.log;

function App() {
  const solNetwork = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(solNetwork), [solNetwork]);

  const wallets = useMemo(
    () => [
      new SolflareWalletAdapter(),
      new PhantomWalletAdapter(),
      new SolletWalletAdapter(),
    ],
    [solNetwork]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets}>
        <WalletModalProvider>
          <Content />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

const Content = () => {
  let wallet = useWallet();

  let connectivity = new Connectivity(wallet);
  const [tokenAmount, setTokenAmount] = useState(0)

  const tokenId = new web3.PublicKey('7H84faAWWJdvcczC32aQzsfm8Jw9XVquGLLuVFVTK5Ge')

  return <>
    <div className="app">
      <WalletMultiButton />

      <br></br>
      <hr />


      <button onClick={async () => {
        await connectivity.createToken();
      }}>Create Token</button>

      <button onClick={async () => {
        await connectivity.mintToken(tokenId);
      }}>Mint Token</button>

      <hr />

      <button onClick={async () => {
        await connectivity.createMetadataAccount(tokenId)
      }}>Create The metadata</button>

      <button onClick={async () => {
        await connectivity.createMasterEdition(tokenId)
      }}>Create The MasterEdition</button>



    </div>
  </>
}

export default App;
