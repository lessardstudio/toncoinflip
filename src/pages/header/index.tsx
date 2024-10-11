import { DropMenuSwitchLang } from "./switchLang";
import { DropMenuSwitchTheme } from "./switchTheme";
import LogoSVG from '@/assets/ton_symbol.svg'
import { ProfileMenu } from "@/components/tonconnect";

export const Header = ()=>{
    
    return(
        <header className="flex flex-col w-full justify-between items-center my-3 flex-wrap md:flex-row gap-y-1 md:gap-y-0">
            <div className="logo flex justify-start w-fit items-center gap-2 select-none cursor-pointer group hover_1 bg-none" onClick={()=>location.href = "/"}>
                <img src={LogoSVG} alt="TON" className="transition-transform ease-in-out duration-1000 group-hover:scale-90"/>
                <h1 className="whitespace-nowrap font-bold">COINFLIP</h1>
            </div>
            <div className="middle"></div>
            <div className="flex flex-row-reverse justify-end items-center gap-x-4 md:flex-row md:flex-wrap md:gap-x-2">
                <ProfileMenu/>
                <DropMenuSwitchLang/>
                <DropMenuSwitchTheme/>
            </div>
        </header>
    );
}

export default Header;