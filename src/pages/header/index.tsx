import { DropMenuSwitchLang } from "./switchLang";
import { DropMenuSwitchTheme } from "./switchTheme";
import LogoSVG from '@/assets/ton_symbol.svg'
import { ProfileMenu } from "@/components/tonconnect";

export const Header = ()=>{
    const isTestnet = import.meta.env.VITE_IS_TESTNET === 'true' || import.meta.env.VITE_TON_NETWORK === 'testnet';
    const isMobile = window.innerWidth <= 768;
    
    return(
        <header className="flex flex-col w-full justify-between items-center my-3 flex-wrap md:flex-row gap-y-1 md:gap-y-0">
            <div className="logo flex justify-start w-fit items-center gap-2 select-none cursor-pointer group hover_1 bg-none" onClick={()=>location.href = "/"}>
                <img src={LogoSVG} alt="TON" className="transition-transform ease-in-out duration-1000 group-hover:scale-90"/>
                <div className="flex flex-col justify-center items-center">
                <h1 className={"whitespace-nowrap font-bold"+ (isMobile ? " text-[12px]" : "") }>COINFLIP</h1>
                {isTestnet && isMobile && (
                    <span className="m-auto rounded-full bg-[hsla(var(--main-col)/1)] text-white text-[6px] font-bold px-1 py-1 leading-none select-none animate-pulse">
                        TESTNET
                    </span>
                )}
                </div>
                
            </div>
            <div className="middle">
            </div>
            
            <div className="flex flex-row-reverse justify-end items-center gap-x-1 md:flex-row md:flex-wrap md:gap-x-2">
                {isTestnet && !isMobile && (
                    <span className="mr-4 rounded-full bg-[hsla(var(--main-col)/1)] text-white text-[14px] font-bold px-2 py-2 leading-none select-none animate-pulse">
                        TESTNET
                    </span>
                )}
                <ProfileMenu/>
                <DropMenuSwitchLang/>
                <DropMenuSwitchTheme/>
            </div>
            
        </header>
    );
}

export default Header;
