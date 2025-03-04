import {  useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
  } from "@/components/ui/drawer"
import { Button } from "../ui/button";
import { useTranslation } from "../lang";
import { Wallet, Flag, LogOut, Landmark  } from 'lucide-react';
import { useRef, useState, useEffect } from "react";
import tonwebInstance from "@/lib/tonwebInstance";

function truncateStart(string: string) {
    const n = 8; // Количество символов для отображения
    return string.length > n ? '...' + string.slice(-n) : string;
}

export function ProfileMenu() {
    const [tonConnectUI] = useTonConnectUI();
    const wallet = useTonWallet(); // Проверяем состояние подключения
    const { translations: T } = useTranslation();

    if (!wallet) { // Если кошелек подключен
        return (
            // <TonConnectButton className="h-min w-full" />
            <Button className="font-bold relative top-[-1px] bg-[var(--main-col)]" variant="tonconnect"
            onClick={() => tonConnectUI.openModal()}>
                  <div className="flex mt-0.5 items-center justify-center">
                      <Wallet className="h-6 w-6 mr-2"/>
                      <div className="text-wrap">
                        {T.connectWallet}
                      </div>
                  </div>
            </Button>
        );
    } else { // Если кошелек не подключен
        return (<WalletObj />);
    }
}

export const WalletObj: React.FC = () => {
    const wallet = useTonWallet();
    const tonUi = useTonConnectUI(); // Используем хук для TonConnect UI
    const isMobile = window.innerWidth <= 768; // Проверка, мобильное ли устройство
    const [isOpen, setIsOpen] = useState(false);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const { translations: T } = useTranslation();
    const isMouseOverMenu = useRef<boolean>(false); // Флаг для отслеживания, курсор над меню
    const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);
    
    // Получаем баланс кошелька из localStorage
    useEffect(() => {
        const fetchBalance = async () => {
            try {
                if (!wallet) return;
                const balance = await tonwebInstance.getBalance(wallet.account.address);
                setWalletBalance(Number(balance));
                localStorage.setItem('cachedWalletBalance', balance);
            } catch (error) {
                console.error('Ошибка получения баланса:', error);
            }
        };
        
        if (wallet) {
            fetchBalance();
            const interval = setInterval(fetchBalance, 10000);
            return () => clearInterval(interval);
        }
    }, [wallet]);

    const handleLogout = () => {
        if (tonUi) {
            tonUi[0].disconnect();
        }
    };

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
    
    const ItemDiv: React.FC<{ icon: JSX.Element, obj: string, func?: () => void, className?: string , isMain?: boolean }> = ({ icon, obj, func = () => {}, className = "", isMain=false }) => {
        return (
        <DrawerClose>
            <Button className={`${ !isMain && 'bg-foreground-6per w-full my-1'}`} onClick={func} variant={'ghost'}>
                <div className={`flex justify-start items-center w-full py-0.25 gap-2 w-full ${className}`}>
                    {icon}<span className="">{obj}</span>
                </div>
            </Button>
        </DrawerClose>
        );
    };

    if (isMobile) return(
        wallet && (<Drawer>
          <DrawerTrigger>
            <Button variant={'ghost'}>
                <div className={`flex justify-start items-center w-full py-0.25 gap-2 w-full font-bold justify-center`}>
                    {<Wallet className="h-6 w-6" />}<span className="">{T.wallet}</span>
                </div>
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>
                <div className={`flex justify-start items-center w-full py-0.25 gap-2 w-full font-bold justify-center`}>
                    {<Wallet className="h-6 w-6" />}<span className="">{T.wallet}</span>
                </div>
              </DrawerTitle>
              <DrawerDescription></DrawerDescription>
            </DrawerHeader>

            <ItemDiv icon={<Flag className="h-4 w-4"/>}
                obj={truncateStart(wallet.account.address)}
                className={"font-normal justify-center items-center"}/>
            <ItemDiv icon={<Landmark  className="h-4 w-4"/>}
                        obj={`${Number(walletBalance).toFixed(2)} TON`}
                        className={"font-normal justify-center items-center"}/>

            <ItemDiv icon={<LogOut className="h-4 w-4"/>}
                obj={T.logout} className={"font-medium justify-center items-center"}
                func={handleLogout}/>
            <DrawerFooter>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>)
        );
        
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
                        obj={T.wallet}
                        className={"font-bold justify-center"}/>

                    <Item icon={<Flag className="h-4 w-4"/>}
                        obj={truncateStart(wallet.account.address)}
                        className={"font-normal justify-start"}/>
                    <Item icon={<Landmark  className="h-4 w-4"/>}
                        obj={`${Number(walletBalance).toFixed(2)} TON`}
                        className={"font-normal justify-start"}/>

                    <Item icon={<LogOut className="h-4 w-4"/>}
                        obj={T.logout} className={"font-medium justify-start"}
                        func={handleLogout}/>

                </DropdownMenuContent>
                <Button className="w-max font-bold relative top-[-1px]" variant="ghost"
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
