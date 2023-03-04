
import ListTile from "./ListTile";
import { Connectivity } from "./Connectivity";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";

export const TokenList = () => {
    const nft1name = "hsifd"
    const wallet = useWallet();
    const { publicKey } = useWallet();
    let connectivity = new Connectivity(wallet);
    const [nftData, setNftData] = useState([]);

    useEffect(() => {
        connectivity._getAlltokens().then((res) => {
            console.log(res)
            setNftData(res);
        });
    }, [publicKey])

    return <>
        <center> <h1> TokenList </h1> </center>
        <div className="myList">
            {nftData.map((i) =>
                <ListTile
                    name={i?.metadata?.name}
                    symbol={i?.metadata?.symbol}
                    isNft={i?.isNft}
                    image={i?.metadata?.uriInfo?.image}>
                </ListTile>)
            }
        </div>
    </>
}
export default TokenList;