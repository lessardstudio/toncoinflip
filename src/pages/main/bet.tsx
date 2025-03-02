import { useState, useEffect } from "react";
import { showMaxBetError, showBetChangeError, showBetChangeSuccess } from '@/components/notify';
import { useTranslation } from "@/components/lang";
import { useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import { CoinFlipContract } from '@/lib/contractWrapper';




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
    const isMobile = window.innerWidth <= 768;
    return (
        <div className={`text-xs text-nowrap text-center ${isMobile ? `py-5 px-3`:`p-2`} rounded-xl border-color-[hsl(var(--foreground)) nowrap]
        transition-colors ease-in-out duration-300 select-none cursor-pointer
        ${className} ${isPressed && !Disable ? `bg-[hsla(var(--main-col)/0.9)] text-[hsl(var(--main-col-bg))]
            hover:bg-[hsla(var(--main-col)/0.6)] cursor-no-drop`:
        `${Disable ? 'bg-red-600/0 cursor-no-drop hover:bg-red-600/50' : 'hover:text-[hsla(var(--main-col)/1)] hover:bg-[hsla(var(--main-col)/0.15)]'} `}`}
        onClick={func} id={id.toString()}>
            {bet} TON
        </div>
    );
};


export default function BetBlock(){
    const bet0 = 0.5;
    const defaultMaxBet = 9;
    const wallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();
    const connected = Boolean(wallet?.account?.address);
    
    // Состояния для динамического maxBet
    const [contractBalance, setContractBalance] = useState<number>(50); // По умолчанию 50 TON
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [maxBetValue, setMaxBetValue] = useState<number>(defaultMaxBet);
    
    // Инициализация контракта
    const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || '';
    
    // Получаем баланс контракта и кошелька через contractWrapper
    useEffect(() => {
        const fetchBalances = async () => {
            try {
                // Получаем провайдер из TonConnect
                const provider = tonConnectUI.connector?.wallet?.provider || null;
                
                // Проверяем тип провайдера и выводим отладочную информацию
                console.log("Тип провайдера:", typeof provider, provider);
                
                // Создаем экземпляр контракта с имеющимся провайдером
                const contract = new CoinFlipContract(contractAddress, provider as any);
                
                // Получаем балансы уже в TON (после изменений в tonwebInstance.ts)
                const contractBalance = await contract.getBalance();
                const walletBalance = wallet?.account?.address 
                    ? await contract.getWalletBalance(wallet.account.address) 
                    : 0;
                
                console.log(`Баланс контракта: ${contractBalance} TON, баланс кошелька: ${walletBalance} TON`);
                
                // Устанавливаем балансы
                setContractBalance(contractBalance);
                setWalletBalance(walletBalance);
                
                // Обновляем максимальную ставку
                updateMaxBet(contractBalance, walletBalance);
                
                return { contractBalance, walletBalance };
            } catch (error) {
                console.error("Ошибка при получении балансов:", error);
            }
        };
        
        // Сразу получаем начальные данные
        fetchBalances();
        
        // И устанавливаем интервал для обновления
        const intervalId = setInterval(() => {
            fetchBalances();
        }, 5000); // Обновляем каждые 5 секунд
        
        // Очищаем интервал при размонтировании компонента
        return () => clearInterval(intervalId);
    }, [connected, wallet, contractAddress, tonConnectUI]);
    
    // Функция для обновления максимальной ставки
    const updateMaxBet = (contractBal: number, walletBal: number) => {
        const contractLimit = contractBal / 5; // 1/5 от баланса контракта
        const walletLimit = walletBal + 0.05; // Баланс кошелька + 0.05 TON
        
        // Выбираем меньшее из двух ограничений, но не больше defaultMaxBet
        const newMaxBet = Math.min(contractLimit, walletLimit, defaultMaxBet);
        setMaxBetValue(newMaxBet);
        
        console.log("Лимиты ставки:", {
            contractLimit,
            walletLimit,
            newMaxBet
        });
    };

    const maxBet = () => {
        // Добавляем использование contractBalance для отладки
        if (contractBalance < 20) {
            if (import.meta.env.VITE_DEBUG == true) console.log("Внимание: малый баланс контракта может ограничить максимальную ставку!");
        }
        
        // Используем walletBalance для отображения предупреждения, если баланс кошелька низкий
        if (walletBalance < 0.5) {
            if (import.meta.env.VITE_DEBUG == true) console.log("Предупреждение: низкий баланс кошелька может ограничить возможность ставок!");
        }
        
        // Проверяем текущее значение ставки
        const currentBet = Number(localStorage.getItem('bet'));
        if (currentBet > maxBetValue) {
            localStorage.setItem('bet', bet0.toString());
        }
        return maxBetValue;
    };
    
    const lsbet = Number(localStorage.getItem('bet')) as number;
    if (!lsbet || !(lsbet as number) || lsbet >= maxBet()) {
        localStorage.setItem('bet', bet0.toString());
    }
    const [Bet, setBet] =  useState<number>(lsbet !== null? lsbet : 0);
    const [timeoutActive, setTimeoutActive] = useState(false);


    const [items, setItems] = useState([
        { id: 0, bet: bet0*2**0,},
        { id: 1, bet: bet0*2**1,},
        { id: 2, bet: 5*2**0,},
        { id: 3, bet: 5*2**1,},
        { id: 4, bet: 1*5**2,},
        { id: 5, bet: 2*5**2,},
        { id: 6, bet: 4*5**2,},
      ]);

    const { translations: T } = useTranslation();

    const handleIconClick = (id: number, bet: number) => {
        if (timeoutActive) return;

        if (bet >= maxBet()) {
            showMaxBetError(T); // Передаём объект переводов
            const updatedItemsBet = items.map(item =>
                item.bet >= maxBet() ? { ...item, Disable: true} : item
            );
            setItems(updatedItemsBet);
            setTimeoutActive(true)
            setTimeout(() => {
                setTimeoutActive(false)
            }, 500);
            
            return;
        }

        else if (bet === Number(localStorage.getItem('bet'))) {
            showBetChangeError(T); // Передаём объект переводов
            setTimeoutActive(true)
            setTimeout(() => {
                setTimeoutActive(false)
            }, 500);
            return;
        }

        const updatedItems = items.map(item =>
            item.id === id ? { ...item, isPressed: true, Disable: item.bet >= maxBet()} : {...item, Disable: item.bet >= maxBet()}
        );
        setItems(updatedItems);
        setBet(bet as number);
        localStorage.setItem('bet', bet.toString());
        showBetChangeSuccess(T, bet);
        setTimeoutActive(true)
        setTimeout(() => {
            setTimeoutActive(false)
        }, 500);


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

