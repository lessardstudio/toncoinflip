import { useTranslation } from "@/components/lang";
import ChoseItem from "./chose";
import BetBlock from "./bet";
import { Button } from "@/components/ui/button";
import { ItemsGames } from "./itemgames";
import MoneyBag from '/tg_money_bag.webp'
import MoneyWings from '/tg_money_with_wings.webp'
import GemStone from '/tg_gem_stone.webp'


export default function MainPage() {
    

    

    const { translations: T } = useTranslation();
    return (
        <>
        <div className="flex flex-row justify-evenly gap-x-6 gap-y-10 flex-wrap xl:flex-nowrap">

            <div className="hidden sm:flex flex-col" style={{width: 356, textAlign: 'right'}}>
                <div className={`text-slogan text-foreground ${T.slogan_text_size}`} >
                    {T.slogan}
                </div>
                <span className={`text-slogan blue ${T.slogan_text_size}`}>
                    {T.slogan_coin}
                </span>
            </div>

            <ChoseItem/>


            <div className="flex flex-col justify-arround items-center text-[hsl(var(--foreground))]
                            bg-foreground-6per px-8 py-8 rounded-[50px] font-['Inter'] font-[600] text-xl min-w-[200px]">

                <div className="choseCount flex-nowrap flex flex-col justify-between items-start h-full">
                    <div className="max-w-[300px] grid grid-cols-4 grid-rows-2 grid-flow-row gap-1">
                        <div className="text-sm text-center pl-2 text-[hsla(var(--main-col)/0.5)] leading-8">{T.bet}:</div>
                        <BetBlock/>
                    </div>

                    <div className="text-lg text-nowrap text-center p-2 rounded-xl w-full
                    bg-[hsla(var(--main-col)/1)]
                    text-[hsl(var(--main-col-bg))]
                    hover:text-[hsla(var(--main-col-bg)/0.9)]
                    hover:bg-[hsla(var(--main-col)/0.6)]
                    transition-colors ease-in-out duration-300
                    select-none cursor-pointer">{T.flipBtn}</div>
                </div>
            </div>



        </div>
        <div className="flex flex-col justify-center items-center gap-2 flex-wrap sm:flex-row lg:flex-nowrap">
            <img className="relative top-2" src={GemStone} alt="GemStone" width="100" height="100" />
            <div className={`px-2 ${T.canwinClass} max-w-[300px] max-h-[160px] font-[600] text-wrap text-right select-none`}>
                {T.canwin}<div className={T.winBigClass}>{T.winBig}</div>
            </div>
            <img src={MoneyWings} alt="MoneyWings" width="200" height="200" />
            <div className={`px-2 ${T.x2Class} max-w-[300px] font-[600] text-wrap select-none`}>{T.x2}<div className={T.betBigClass}>{T.betBig}</div></div>
            <img className="relative top-2" src={MoneyBag} alt="MoneyBag" width="100" height="100" />

        </div>


        <div className="relative history flex flex-col rounded-[25px] overflow-hidden my-4 bg-[hsla(var(--main-col-bg)/1)]">
            <div className="flex flex-row justify-between items-center px-4 py-1">
                <h1 className="px-2 py-4 text-xl font-[600] text-nowrap">{T.historyTitle}</h1>
                <Button className="all-games-btn z-50" variant={'ghost'}>
                    {T.allgamesbtn} {'>'}
                </Button>
            </div>
            <div className="absolute top-0 right-0 w-[10%] h-full z-40 bg-gradient-to-r from-transparent to-[hsla(var(--main-col-bg)/1)] pointer-events-none"/>
            <div className="relative flex flex-row flex-nowrap gap-2 overflow-hidden px-4 pb-4 w-max">
                <ItemsGames object="hello" id={0}/>
                <ItemsGames object="hello" id={0} side={1}/>
                <ItemsGames object="hello" id={0}/>
                <ItemsGames object="hello" id={0}/>
                <ItemsGames object="hello" id={0} side={1}/>
                <ItemsGames object="hello" id={0} side={1}/>
                <ItemsGames object="hello" id={0}/>
                <ItemsGames object="hello" id={0} side={1}/>
                <ItemsGames object="hello" id={0}/>
                <ItemsGames object="hello" id={0}/>
                <ItemsGames object="hello" id={0}/>
                <ItemsGames object="hello" id={0}/>
                <ItemsGames object="hello" id={0}/>
                <ItemsGames object="hello" id={0}/>
                <ItemsGames object="hello" id={0}/>
            </div>
        </div>
        </>
    );
}

