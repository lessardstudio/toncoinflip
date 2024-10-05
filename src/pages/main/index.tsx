import { useTranslation } from "@/components/lang";
import ChoseItem from "./chose";
import BetBlock from "./bet";

export default function MainPage() {
    

    

    const { translations: T } = useTranslation();
    return (
        <>
        <div className="flex flex-row justify-evenly gap-x-6">

            <div className="flex flex-col" style={{width: 356, textAlign: 'right'}}>
                <div className={`text-slogan text-foreground ${T.slogan_text_size}`} >
                    {T.slogan}
                </div>
                <span className={`text-slogan blue ${T.slogan_text_size}`}>
                    {T.slogan_coin}
                </span>
            </div>

            <ChoseItem/>


            <div className="flex flex-col justify-arround items-center text-[hsl(var(--foreground))] bg-foreground-6per px-8 py-8 rounded-[50px] font-['Inter'] font-[600] text-xl min-w-[200px]">
                <div className="choseCount flex-nowrap flex flex-row justify-between items-start">
                    <div className="max-w-[300px] grid grid-cols-4 grid-rows-4 grid-flow-row gap-1">
                        <div className="text-sm text-center pl-2 text-[hsla(var(--main-col)/0.5)] leading-8">{T.bet}:</div>
                        <BetBlock/>
                        
                    </div>
                </div>
                
            </div>
        </div>
        </>
    );
}

