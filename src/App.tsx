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

  return <>
    <div className="app">
      <WalletMultiButton />
      <br />
      <hr />

      <button onClick={async () => {
        let res = await connectivity._getTokenInfo();
        log("res: ", res)
      }}>Get token info</button>

      <button onClick={async () => {
        let res = await connectivity._getTokenBalance(wallet.publicKey);
        log("res: ", res)
      }}>Get token balance</button>

      <br></br>
      <br></br>

      <label>Amount : </label>
      <input type="number" onChange={(event) => {
        const value = Number(event.target.value)
        setTokenAmount(value)
      }} />
      <button onClick={async () => {
        await connectivity.buyToken(tokenAmount);
      }}>Buy Token</button>

      <br></br>
      <hr></hr>

      <button onClick={async () => {
        const info = await connectivity.getPdaInfo();
        console.log("info: ", info);
      }}>Get PdaInfo</button>

      <button onClick={async () => {
        await connectivity.transfer_token();
      }}>Transer</button>


    </div>
  </>
}

export default App;
