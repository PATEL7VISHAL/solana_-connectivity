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
import TokenList from './TokenList';

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
  let name = '';
  let symbol = '';
  let image = '';
  let tokenId: web3.PublicKey = null;

  return <>
    <div className="app">
      <WalletMultiButton />

      <br></br>
      <hr />


      <button onClick={async () => {
        await connectivity.createToken();
      }}>Create Token</button>


      <hr />

      <label htmlFor="">Token ID</label>
      <input onChange={(event) => {
        try {
          tokenId = new web3.PublicKey(event.target.value)
        } catch (e) {
          console.log("Wrong Token ID")
          tokenId = null;
        }
      }} type={'text'} />
      <br />
      <br />

      <button onClick={async () => {
        await connectivity.mintToken(tokenId);
      }}>Mint Token</button>

      <hr />


      <label htmlFor="">nft name</label>
      <input onChange={(event) => {
        name = event.target.value
      }} type={'text'} />
      <br />

      <label htmlFor="">nft symbol</label>
      <input onChange={(event) => {
        symbol = event.target.value
      }} type={'text'} />
      <br />

      <label htmlFor="">nft image url</label>
      <input onChange={(event) => {
        image = event.target.value
      }} type={'text'} />
      <br />


      <button onClick={async () => {
        const _metadata = {
          name: name,
          symbol: symbol,
          image: image,
          attributes: [
            {
              "trait_type": 'color',
              "value": "green"
            },
            {
              "trait_type": "",
              "value": "sdf"
            }
          ]
        }
        await connectivity.createMetadataAccount(tokenId, _metadata)
      }}>Create The metadata</button>

      <button onClick={async () => {
        await connectivity.createMasterEdition(tokenId)
      }}>Create The MasterEdition</button>

      <hr />

      {/* <button onClick={async () => {
        await connectivity._getAlltokens()
      }}>Get All Token details</button> */}

      <TokenList />
    </div>
  </>
}

export default App;
