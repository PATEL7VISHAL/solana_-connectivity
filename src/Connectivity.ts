import { Program, Wallet, web3, AnchorProvider, BN } from '@project-serum/anchor'
import { utf8 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { Tut2, IDL } from './idl'

import {
    TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    getAccount as getTokenAccountInfo,
    getMint,
    getAssociatedTokenAddressSync,
    createTransferInstruction,
} from '@solana/spl-token'


const log = console.log;
const SEED = {
    pda: utf8.encode("_seed")
}

export class Connectivity {
    programId: web3.PublicKey | null;
    wallet: WalletContextState;
    connection: web3.Connection;
    pda: web3.PublicKey | null
    pdaAta: web3.PublicKey | null
    tokenId: web3.PublicKey | null;
    program: Program<Tut2>
    txis: web3.TransactionInstruction[];
    solCollector: web3.PublicKey;

    constructor(_wallet: WalletContextState) {
        this.wallet = _wallet
        this.connection = new web3.Connection("https://api.devnet.solana.com", { commitment: 'finalized' })

        this.programId = new web3.PublicKey("AdAer5ihhyVQAgxZBTZpgLZG9kFBcFrJ9PEH42AtyFtT")
        this.tokenId = new web3.PublicKey("CGdNrSHN7WEattbAmfRYiwZQCVkNezxPzj4T1gtbNyNc")
        this.solCollector = new web3.PublicKey("7D6StyJSfQJ2d28weVscUn4frrsi9VLeQDCi8uvRtx63")

        this.pda = web3.PublicKey.findProgramAddressSync([SEED.pda], this.programId)[0];
        this.pdaAta = getAssociatedTokenAddressSync(this.tokenId, this.pda, true);

        const anchorProvider = new AnchorProvider(this.connection, this.wallet, { commitment: 'finalized', preflightCommitment: 'finalized' })
        this.program = new Program(IDL, this.programId, anchorProvider);

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

    async _getTokenBalance(address: web3.PublicKey): Promise<number> {
        try {
            let ata = getAssociatedTokenAddressSync(this.tokenId, address);
            let data = await getTokenAccountInfo(this.connection, ata);
            let _amount = Number(data.amount.toString())
            return _amount / 10_000
        }
        catch (e) {
            return 0
        }
    }

    async _getTokenInfo() {
        //? mint structure contrains : tlvData 
        const res = await getMint(this.connection, this.tokenId);

        return {
            tokenId: this.tokenId.toBase58(),
            totalSupply: parseInt(res.supply.toString()) / 10 ** res.decimals,
            mintAuthority: res.mintAuthority?.toBase58(),
            freezAuthority: res.freezeAuthority?.toBase58(),
            decimal: res.decimals,
        }
    }

    async _sendTransaction(signatures: web3.Keypair[] = []) {
        try {
            const tx = new web3.Transaction().add(...this.txis);

            // signatures.map((e: web3.Keypair) => { tx.sign(e) })
            for (let i of signatures) {
                tx.sign(i);
            }

            tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash

            const res = await this.wallet.sendTransaction(tx, this.connection, { preflightCommitment: 'finalized' });
            log("Trasaction Sign: ", res);
            alert("Trasaction Sussessful")
        } catch (e) {
            alert("Trasaction Fail")
        }

        finally {
            this.txis = [];
        }
    }

    async getPdaInfo() {
        const info = await this.program.account.pdaInfo.fetch(this.pda);

        const obj = {
            owner: info.owner.toBase58(),
            solCollector: info.solReceiver.toBase58(),
            soldAmount: info.soldAmount.toNumber() / 10_000,
            price: info.price,
        }

        return obj;
    }

    async transfer_token() {
        const senderAta = await this._getOrCreateTokenAccount(this.wallet.publicKey, this.tokenId)
        const receiverAta = await this._getOrCreateTokenAccount(this.solCollector, this.tokenId)

        let ix = createTransferInstruction(senderAta, receiverAta, this.wallet.publicKey, 1);

        this.txis.push(ix)
        await this._sendTransaction();
    }

    async buyToken(amount: number) {
        amount = Math.trunc(amount * 10_000)
        const buyer = this.wallet.publicKey;
        const buyerAta = await this._getOrCreateTokenAccount(buyer, this.tokenId);

        let ix = await this.program.methods.buyToken(new BN(amount)).accounts({
            buyer: buyer,
            buyerAta: buyerAta,
            mint: this.tokenId,
            pda: this.pda,
            pdaAta: this.pdaAta,
            solCollector: this.solCollector,
            systemProgram: web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
        }).instruction();

        this.txis.push(ix);
        await this._sendTransaction();
    }

}
