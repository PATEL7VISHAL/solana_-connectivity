import { Program, Wallet, web3, AnchorProvider, BN } from '@project-serum/anchor'
import { utf8 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { Tut2, IDL } from './idl'
import axios from 'axios'

import {
    TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    getAccount as getTokenAccountInfo,
    getMint,
    getAssociatedTokenAddressSync,
    createTransferInstruction,
    createInitializeMintInstruction,
    createMintToInstruction,
    MINT_SIZE,
} from '@solana/spl-token'
import {
    Metadata,
    createCreateMetadataAccountV2Instruction,
    createCreateMasterEditionInstruction,
    createUpdateMetadataAccountV2Instruction,
    PROGRAM_ID as MPL_ID,

} from '@metaplex-foundation/mpl-token-metadata';


const log = console.log;
const SEED = {
    pda: utf8.encode("_seed")
}

export class Connectivity {
    programId: web3.PublicKey | null;
    wallet: WalletContextState;
    connection: web3.Connection;
    tokenId: web3.PublicKey | null;
    // program: Program<Tut2>
    txis: web3.TransactionInstruction[];
    solCollector: web3.PublicKey;
    userId: web3.PublicKey | null

    constructor(_wallet: WalletContextState) {
        this.wallet = _wallet
        this.connection = new web3.Connection("https://api.devnet.solana.com", { commitment: 'finalized' })

        this.programId = new web3.PublicKey("AdAer5ihhyVQAgxZBTZpgLZG9kFBcFrJ9PEH42AtyFtT")
        this.tokenId = new web3.PublicKey("CGdNrSHN7WEattbAmfRYiwZQCVkNezxPzj4T1gtbNyNc")
        this.solCollector = new web3.PublicKey("7D6StyJSfQJ2d28weVscUn4frrsi9VLeQDCi8uvRtx63")

        // const anchorProvider = new AnchorProvider(this.connection, this.wallet, { commitment: 'finalized', preflightCommitment: 'finalized' })
        // this.program = new Program(IDL, this.programId, anchorProvider);

        //! don't forget to init the txis list.
        this.txis = [];
    }

    async _getOrCreateTokenAccount(owner: web3.PublicKey, token: web3.PublicKey, isOffCurve = false) {
        const ata = getAssociatedTokenAddressSync(token, owner, isOffCurve);
        const info = await this.connection.getAccountInfo(ata);

        if (info == null) {
            log("added token account init")
            const ix = createAssociatedTokenAccountInstruction(this.wallet.publicKey, ata, owner, token);
            this.txis.push(ix);
        }
        return ata;
    }

    async _sendTransaction(signatures: web3.Keypair[] = []) {
        try {
            const tx = new web3.Transaction().add(...this.txis);

            tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash

            // signatures.map((e: web3.Keypair) => { tx.sign(e) })
            // for (let i of signatures) {
            //     tx.sign(i);
            // }

            const res = await this.wallet.sendTransaction(tx, this.connection, { signers: signatures, preflightCommitment: 'finalized' });
            log("Trasaction Sign: ", res);
            alert("Trasaction Sussessful")
        } catch (e) {
            log("Error: ", e);
            alert("Trasaction Fail")
        }

        finally {
            this.txis = [];
        }
    }

    _setUser() {
        this.userId = this.wallet.publicKey
        if (this.userId == null) throw "userID not found"
    }

    _getMetadataAccount(tokenId: web3.PublicKey) {
        return web3.PublicKey.findProgramAddressSync(
            [
                utf8.encode("metadata"),
                MPL_ID.toBuffer(),
                tokenId.toBuffer(),
            ],
            MPL_ID
        )[0]
    }

    _getMasterEditionAccount(tokenId: web3.PublicKey) {
        return web3.PublicKey.findProgramAddressSync(
            [
                utf8.encode("metadata"),
                MPL_ID.toBuffer(),
                tokenId.toBuffer(),
                utf8.encode("edition")
            ],
            MPL_ID
        )[0]
    }

    async createToken() {
        //? we are genrating new keypair in which we are allocating space first
        //? then assing the token details and then token is created.
        const token_keypair = web3.Keypair.generate();

        //* allocating space for token 
        //? to allocate space we need to pay the rent so here i am tring to get the rant amount
        //? you will find the MINT_SIZE variable from spl-token library
        const rent = await this.connection.getMinimumBalanceForRentExemption(MINT_SIZE);

        const ix1 = web3.SystemProgram.createAccount({
            fromPubkey: this.wallet.publicKey,
            lamports: rent,
            newAccountPubkey: token_keypair.publicKey,
            programId: TOKEN_PROGRAM_ID, //? here we are creating the token that's why as the program id to token_program_id smart contract which is only one who can change the date inside the token_account. 
            space: MINT_SIZE,
        })
        this.txis.push(ix1)

        //? setting the token initial values.
        const ix2 = createInitializeMintInstruction(
            token_keypair.publicKey,
            0,
            this.wallet.publicKey,
            this.wallet.publicKey
        );
        this.txis.push(ix2)

        await this._sendTransaction([token_keypair]);

        console.log("Token is created : ", token_keypair.publicKey.toBase58())

        return token_keypair.publicKey;
    }

    async mintToken(tokenId: web3.PublicKey) {
        const ata = await this._getOrCreateTokenAccount(this.wallet.publicKey, tokenId);

        let ix = createMintToInstruction(tokenId, ata, this.wallet.publicKey, 1);
        this.txis.push(ix);

        await this._sendTransaction();
    }

    async _updateMetadata(_metadata: any) {
        const resJSON = await axios({
            method: "post",
            url: "https://api.pinata.cloud/pinning/pinJsonToIPFS",
            data: {
                "name": _metadata.name,
                "symbol": _metadata.symbol,
                "image": _metadata.image
            },
            headers: {
                'pinata_api_key': "8216b9fbbab48995b31e",
                'pinata_secret_api_key': "abb7156280dcb594f5536f13db203419d5e0979fe95d66e330924c1904c297b4",
            },
        })

        const name = _metadata.name
        const symbol = _metadata.symbol;
        const uri = `https://gateway.pinata.cloud/ipfs/${resJSON.data.IpfsHash}`
        // const uri = `ipfs://${resJSON.data.IpfsHash}`

        return {
            name: name,
            symbol: symbol,
            uri: uri,
        }
    }


    async createMetadataAccount(tokenId: web3.PublicKey, _metadata: any) {
        const metadataInfo = await this._updateMetadata(_metadata);
        if (metadataInfo == null) {
            log("metadata is not uploaded")
            throw "Failed to upload the metadata"
        }

        const metadata = this._getMetadataAccount(tokenId);

        const ix = createCreateMetadataAccountV2Instruction(
            { //? Accounts
                metadata: metadata,
                mint: tokenId,
                mintAuthority: this.wallet.publicKey,
                payer: this.wallet.publicKey,
                updateAuthority: this.wallet.publicKey,
                rent: web3.SYSVAR_RENT_PUBKEY,
                systemProgram: web3.SystemProgram.programId,
            },

            { //? args
                createMetadataAccountArgsV2: {
                    data: {
                        name: metadataInfo.name,
                        symbol: metadataInfo.symbol,
                        uri: metadataInfo.uri,
                        collection: null,
                        creators: null,
                        sellerFeeBasisPoints: 20,
                        uses: null,
                    },
                    isMutable: true,
                }
            }
        )

        this.txis.push(ix);
        await this._sendTransaction();
    }

    async createMasterEdition(tokenId: web3.PublicKey) {
        this._setUser();

        const masterEditionAccount = this._getMasterEditionAccount(tokenId)
        const metadataAccount = this._getMetadataAccount(tokenId);

        let ix = createCreateMasterEditionInstruction(
            {
                edition: masterEditionAccount,
                metadata: metadataAccount,
                mint: tokenId,
                mintAuthority: this.userId,
                payer: this.userId,
                updateAuthority: this.userId,
                rent: web3.SYSVAR_RENT_PUBKEY,
                systemProgram: web3.SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID
            },
            {
                createMasterEditionArgs: { maxSupply: 3 }
            },
        )

        this.txis.push(ix)
        this._sendTransaction();
        //! 0x18 -> decimal have to be 0
        //! 0x3f -> need to be initialized metadata acccount
        //! 0x__ -> supply issue. (have to be 0) 
    }

    async updateMetadataAccount(tokenId: web3.PublicKey) {
        const metadata = this._getMetadataAccount(tokenId);
        createUpdateMetadataAccountV2Instruction(
            {
                metadata: metadata,
                updateAuthority: this.wallet.publicKey
            },
            {
                updateMetadataAccountArgsV2: {
                    data: {
                        collection: null,
                        creators: [
                            {
                                address: this.wallet.publicKey,
                                share: 39,
                                verified: true, //? true means it's foccefuly match that at currently in smart contract can  
                                //? able to get the the address(this.wallet.publickey) verification as a signer if not found 
                                //? then address(this.wallet.publickey) as signer then it's throw an error.
                                // verified: false,//? here we are ignore to checking that address require to signer be signer or not.
                            }
                        ],
                        name: "NEW_NAME",
                        sellerFeeBasisPoints: 21,
                        symbol: "NEW_SYMBOL",
                        uri: "NEW_URI",
                        uses: null
                    },
                    isMutable: true,
                    primarySaleHappened: false,
                    updateAuthority: this.wallet.publicKey,
                }
            }
        )
    }

    async _getAlltokens() {
        let user = this.wallet.publicKey;
        if (user == null) throw "Wallet not found !"
        let res = await this.connection.getTokenAccountsByOwner(user, { programId: TOKEN_PROGRAM_ID });
        let data: any[] = [];

        for (let i of res.value) {
            const tokenAccount = i.pubkey
            try {
                const res = await getTokenAccountInfo(this.connection, tokenAccount);
                if (Number(res.amount.toString()) == 0) continue;
                const tokenId = res.mint;
                let tokenInfo = {
                    tokenId: tokenId.toBase58(),
                    metadata: null,
                    isNft: false,
                }

                const metadataAccount = web3.PublicKey.findProgramAddressSync([
                    utf8.encode("metadata"),
                    MPL_ID.toBuffer(),
                    tokenId.toBuffer(),
                ], MPL_ID)[0]

                try {
                    const metadataInfo = await Metadata.fromAccountAddress(this.connection, metadataAccount);
                    let obj = {
                        name: metadataInfo.data.name.split('\u0000')[0],
                        symbol: metadataInfo.data.symbol.split('\u0000')[0],
                        uri: metadataInfo.data.uri.split('\u0000')[0],
                        uriInfo: null,
                    }

                    try {
                        const uriInfo = await (await fetch(obj.uri)).text();
                        obj.uriInfo = JSON.parse(uriInfo);
                    } catch (e) {
                        log("Failed to get uri info from :", obj.uriInfo);
                    }

                    tokenInfo.metadata = obj;
                    data.push(tokenInfo);

                    //?CHECKING for nft
                    const masterEditionAccount = this._getMasterEditionAccount(tokenId);
                    let _accountInfo = await this.connection.getAccountInfo(masterEditionAccount)
                    _accountInfo == null ? tokenInfo.isNft = false : tokenInfo.isNft = true;

                }
                catch (e) {
                    log("Failed to get Token metadata of: ", tokenId.toBase58())
                    data.push(tokenInfo);
                }
            } catch (e) {
                log("Failed to tokenAccountInfo for :", tokenAccount.toBase58())
            }
        }

        return data;
    }

}
