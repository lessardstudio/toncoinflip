import { TonConnectButton, useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "../ui/button";
import { useTranslation } from "../lang";
import { Wallet, Flag, LogOut } from 'lucide-react';
import { useRef, useState } from "react";

export function ProfileMenu() {
    const wallet = useTonWallet(); // Проверяем состояние подключения

    if (!wallet) { // Если кошелек подключен
        return (
            <TonConnectButton className="h-min w-full" />
        );
    } else { // Если кошелек не подключен
        return (<WalletObj />);
    }
}

export const WalletObj = () => {
    const wallet = useTonWallet();
    const tonUi = useTonConnectUI(); // Используем хук для TonConnect UI

    const handleLogout = () => {
        if (tonUi) {
            tonUi[0].disconnect();
        }
    };
    const { translations: T } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null); // Для меню
    const triggerRef = useRef<HTMLButtonElement | null>(null); // Для триггера
    const isMouseOverMenu = useRef<boolean>(false); // Флаг для отслеживания, курсор над меню
    const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);
    const handleMouseToggle = (isEntering:boolean) => {
        if (isEntering) {
          setIsOpen(true); // Открываем меню
          if (timeoutId) {
            clearTimeout(timeoutId); // Очищаем предыдущий таймаут, если есть
          }
        } else {
          // Если курсор уходит с триггера
          if (!isMouseOverMenu.current) {
            const id = setTimeout(() => {
              setIsOpen(false); // Закрываем меню
            }, 100); // Устанавливаем задержку в 300 мс
            setTimeoutId(id); // Сохраняем идентификатор таймаута
          }
        }
      };
      
      const handleMenuMouseEnter = () => {
        isMouseOverMenu.current = true; // Устанавливаем флаг при наведении на меню
        if (timeoutId) {
          clearTimeout(timeoutId); // Очищаем таймаут, чтобы меню не закрылось
        }
      };
      
      const handleMenuMouseLeave = () => {
        isMouseOverMenu.current = false; // Сбрасываем флаг при уходе с меню
        const id = setTimeout(() => {
          if (!isMouseOverMenu.current) {
            setIsOpen(false); // Закрываем меню при уходе с него
          }
        }, 100); // Устанавливаем задержку в 300 мс
        setTimeoutId(id); // Сохраняем идентификатор таймаута
      };


const Item: React.FC<{ icon: JSX.Element, obj: string, func?: () => void, className?: string }> = ({ icon, obj, func = () => {}, className = "" }) => {
    return (
        <DropdownMenuItem className="truncate" onSelect={func}>
            <div className={`flex justify-start items-center w-full py-0.25 gap-2 w-full ${className}`}>
                {icon}<span className="">{obj}</span>
            </div>
        </DropdownMenuItem>
    );
};
    

    return (
        wallet && (
        <div className="flex flex-col items-center">
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenuTrigger  />
                <DropdownMenuContent
                ref={menuRef}
                className={`w-max h-max`}
                onMouseEnter={handleMenuMouseEnter}
                onMouseLeave={handleMenuMouseLeave}
                >
                    <Item icon={<Wallet className="h-6 w-6" />}
                        obj={T.wallet} className={"font-bold justify-center"}/>

                    <Item icon={<Flag className="h-4 w-4"/>}
                        obj={truncateStart(wallet.account.address)} className={"font-normal justify-start"}/>

                    <Item icon={<LogOut className="h-4 w-4"/>}
                        obj={T.logout} className={"font-medium justify-start"}
                    func={handleLogout}/>

                </DropdownMenuContent>
                <Button className="w-max font-bold" variant="ghost"
                ref={triggerRef}
                onMouseEnter={() => handleMouseToggle(true)}
                onMouseLeave={() => handleMouseToggle(false)}
                >
                    <div className="flex mt-0.5 items-center">
                        <Wallet className="h-6 w-6 mr-2"/>{T.wallet}
                    </div>
                </Button>
            </DropdownMenu>
        </div>
        )
    );
};


function truncateStart(string:string) {
    const n = 8; // Количество символов для отображения
    return string.length > n ? '...' + string.slice(-n) : string;
}
