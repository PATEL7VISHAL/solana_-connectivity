export const ListTile = (props: any) => {

    console.log("name: ", props.name)
    console.log("symbol: ", props.symbol)
    console.log("image: ", props.image)
    console.log("isNft: ", props.isNft)

    return <>
        <center>
            <div className="listTile">
                <div className="listTileImageContainer">
                    <img src={props.image} alt="token image" />
                </div>
                <div className="listTileNftInfoContainer">
                    <h5>Name: {props.name}</h5>
                    <h5>Symbol: {props.symbol}</h5>

                    <div style={{ display: "flex" }}>
                        <h5>isNft: </h5>
                        <input type={"checkbox"} checked={props.isNft} disabled />
                    </div>
                </div>
            </div>

        </center>
    </>
}
export default ListTile;