import { useTranslation } from "@/components/lang";
import { Theme } from "@tonconnect/ui";
import { ShieldCheck, ShieldX } from "lucide-react";
import { useState } from "react";
import { Slide, toast } from "react-toastify";



const BetItem: React.FC<{  bet: number,
                        func?: () => void,
                        className?: string,
                        isPressed?: boolean,
                        Disable?: boolean,
                        id: number
                    }> =
                        ({bet,
                        func = () => {},
                        className = "",
                        isPressed=false,
                        Disable=false,
                        id
                    }) => {
    return (
        <div className={`text-xs text-nowrap text-center p-2 rounded-xl border-color-[hsl(var(--foreground)) nowrap]
        transition-colors ease-in-out duration-300 select-none cursor-pointer
        ${className} ${isPressed ? `bg-[hsla(var(--main-col)/0.9)] text-[hsl(var(--main-col-bg))]
            hover:bg-[hsla(var(--main-col)/0.6)] cursor-no-drop`:
        `${Disable ? 'bg-red-600/0 cursor-no-drop hover:bg-red-600/50' : 'hover:text-[hsla(var(--main-col)/1)] hover:bg-[hsla(var(--main-col)/0.15)]'} `}`}
        onClick={func} id={id.toString()}>
            {bet} TON
        </div>
    );
};


export default function BetBlock(){
    const bet0= 0.5;
    const maxBet = () => {
        
        const maxbet = 9;
        (Number(localStorage.getItem('bet')) as number > maxbet)? localStorage.setItem('bet', bet0.toString()) : maxbet;
        return 9;
    };
    const lsbet = Number(localStorage.getItem('bet')) as number;
    if (!lsbet || !(lsbet as number) || lsbet >= maxBet()) {
        localStorage.setItem('bet', bet0.toString());
    }
    const [Bet, setBet] =  useState<number>(lsbet !== null? lsbet : 0);
    const [timeoutActive, setTimeoutActive] = useState(false);
    const { translations: T } = useTranslation();


    const [items, setItems] = useState([
        { id: 0, bet: bet0*2**0,},
        { id: 1, bet: bet0*2**1,},
        { id: 2, bet: 5*2**0,},
        { id: 3, bet: 5*2**1,},
        { id: 4, bet: 1*5**2,},
        { id: 5, bet: 2*5**2,},
        { id: 6, bet: 4*5**2,},
      ]);

    const handleIconClick = (id: number, bet:number) => {
        if (timeoutActive) return;
        if (bet >= maxBet()){
            toast(
                <div className="flex flex row items-center gap-1">
                    <ShieldX className="w-6 h-6 text-[red]" />
                    {T.maxbeterr}
                </div>, {
                position: 'top-center' ,
                autoClose: 1000,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: localStorage.getItem('vite-ui-theme') as string == "system"? "colored": localStorage.getItem('vite-ui-theme') as Theme,
                transition: Slide,
              });
                const updatedItemsBet = items.map(item =>
                    item.bet >= maxBet() ? { ...item, Disable: true} : item
                );
                setItems(updatedItemsBet);
                setTimeoutActive(true)
                setTimeout(() => {
                    setTimeoutActive(false)
                }, 2000);
                
                return;
        }
        else if (bet == Number(localStorage.getItem('bet'))){
            toast(
            <div className="flex flex row items-center gap-1">
                <ShieldX className="w-6 h-6 text-[red]" />
                {T.beterrchange}
            </div>, {
            position: 'top-center' ,
            autoClose: 1000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: localStorage.getItem('vite-ui-theme') as string == "system"? "colored": localStorage.getItem('vite-ui-theme') as Theme,
            transition: Slide,
          });
            setTimeoutActive(true)
            setTimeout(() => {
                setTimeoutActive(false)
            }, 2000);
            return;
        }
        // Обновляем массив объектов, изменяя только нужный элемент
        const updatedItems = items.map(item =>
            item.id === id ? { ...item, isPressed: true, Disable: item.bet >= maxBet()} : {...item, Disable: item.bet >= maxBet()}
        );
        setItems(updatedItems);
        setBet(bet as number);
        localStorage.setItem('bet', bet.toString());
        toast(
            <div className="flex flex row items-center gap-1">
                <ShieldCheck className="w-6 h-6 text-[green]" />
                {T.betchange}{bet} TON
            </div>, {
            position: 'top-center' ,
            autoClose: 1000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: localStorage.getItem('vite-ui-theme') as string == "system"? "colored": localStorage.getItem('vite-ui-theme') as Theme,
            transition: Slide,
          });
        setTimeoutActive(true)
        setTimeout(() => {
            setTimeoutActive(false)
        }, 2000);
        
    };








    return (<>
    {items.map(item => (
        <BetItem
            bet={item.bet}
            className="" // React использует это для рендера
            id={item.id}   // Добавляем id для передачи в функцию
            key={item.id}
            func={()=> handleIconClick(item.id, item.bet)}  // Используем id для функции
            isPressed={Bet == item.bet ? true : false}
            Disable={item.bet >= maxBet() ? true: false}
        />
        ))}
    </>);
    
}

