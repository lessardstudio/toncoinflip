import { TonConnectButton } from "@tonconnect/ui-react";
import { DropMenuSwitchLang } from "./switchLang";
import { DropMenuSwitchTheme } from "./switchTheme";
import LogoSVG from '@/assets/ton_symbol.svg'

export default function Header(){
    return(
        <header className="flex flex-row">
            <div className="logo flex justify-start items-center w-full gap-2">
                <img src={LogoSVG} alt="TON" />
                <h1>Coin Flip</h1>
            </div>
            <div className="flex flex-row justify-end items-center gap-x-4">
                <TonConnectButton className="h-min w-full" />
                <DropMenuSwitchLang/>
                <DropMenuSwitchTheme/>
            </div>
        </header>
    );
}