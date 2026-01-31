import { DropMenuSwitchLang } from "./switchLang";
import { DropMenuSwitchTheme } from "./switchTheme";
import LogoSVG from '@/assets/ton_symbol.svg'
import { ProfileMenu } from "@/components/tonconnect";

export const Header = ()=>{
    const isTestnet = import.meta.env.VITE_IS_TESTNET === 'true' || import.meta.env.VITE_TON_NETWORK === 'testnet';
    
    return(
        <header className="flex flex-col w-full justify-between items-center my-3 flex-wrap md:flex-row gap-y-1 md:gap-y-0">
            <div className="relative logo flex justify-start w-fit items-center gap-2 select-none cursor-pointer group hover_1 bg-none" onClick={()=>location.href = "/"}>
                <img src={LogoSVG} alt="TON" className="transition-transform ease-in-out duration-1000 group-hover:scale-90"/>
                <h1 className={"whitespace-nowrap font-bold" }>COINFLIP</h1>
                {isTestnet && (
                        <span className="absolute ml-2 top-50% left-[100%] m-auto rounded-full bg-[hsla(var(--main-col)/1)] text-white text-[14px] font-bold px-2 py-2 leading-none select-none animate-pulse">
                            TESTNET
                        </span>
                    )}                
            </div>
            <div className="middle">
            </div>
            
            <div className="flex flex-row-reverse justify-end items-center gap-x-1 md:flex-row md:flex-wrap md:gap-x-2">
                <ProfileMenu/>
                <DropMenuSwitchLang/>
                <DropMenuSwitchTheme/>
            </div>
            
        </header>
    );
}

export default Header;
