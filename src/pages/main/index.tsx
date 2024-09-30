import ChoseItem from "./chose";

export default function MainPage() {
    

    

    return (
        <div className="flex flex-row gap-x-6">

            <div style={{width: 356, textAlign: 'right'}}>
                <span className="text-slogan text-foreground" >
                    Try your luck by tossing a </span>
                <span className="text-slogan blue">
                    coin!</span>
            </div>

            <ChoseItem/>
        </div>
    );
}

