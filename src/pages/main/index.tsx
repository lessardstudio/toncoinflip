import { useTranslation } from "@/components/lang";
import ChoseItem from "./chose";
import BetBlock from "./bet";
import { Button } from "@/components/ui/button";
import { ItemsGames } from "./itemgames";
import MoneyBag from '/tg_money_bag.webp'
import MoneyWings from '/tg_money_with_wings.webp'
import GemStone from '/tg_gem_stone.webp'
import createBetTransaction from "@/components/tonweb/sendBetTransaction";
import { useCallback, useState, useEffect } from "react";
import { CoinFlipContract, FlipResult } from "@/lib/contractWrapper";
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { toast } from "react-toastify";
import tonwebInstance from '@/lib/tonwebInstance';

// Получаем адрес контракта из переменных окружения
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || 'EQDTu0cHyVvEaUMF9NYk9p_MAUKtHxR_mZC15mvoB9tYwJ6r';

export default function MainPage() {
    const { translations: T } = useTranslation();
    const [tonConnectUI] = useTonConnectUI();
    const wallet = useTonWallet();
    const connected = Boolean(wallet?.account?.address);
    
    // Состояния приложения
    const [contract, setContract] = useState<CoinFlipContract | null>(null);
    const [contractBalance, setContractBalance] = useState<number>(0);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    
    // Состояния для отслеживания результата игры
    const [lastFlipResult, setLastFlipResult] = useState<FlipResult | null>(null);
    const [pendingTransaction, setPendingTransaction] = useState<{hash: string, amount: number, side: boolean} | null>(null);
    const [showResult, setShowResult] = useState<boolean>(false);
    
    // Инициализация контракта
    useEffect(() => {
        if (!connected || !wallet) {
            console.log("Кошелек не подключен, контракт не инициализирован");
            return;
        }
        
        // Используем асинхронную функцию внутри useEffect
        const initContract = async () => {
            try {
                console.log("Инициализация контракта с адресом", CONTRACT_ADDRESS);
                
                // Создаем провайдер для контракта через TonConnect
                const provider = {
                    // Метод для получения данных контракта
                    get: async () => ({ stack: [] }),
                    
                    // Метод для отправки транзакций
                    internal: async (_address: any, args: any) => {
                        console.log("Вызов internal с аргументами:", args);
                        return tonConnectUI.sendTransaction({
                            validUntil: Math.floor(Date.now() / 1000) + 360,
                            messages: [
                                {
                                    address: CONTRACT_ADDRESS,
                                    amount: args.value.toString(),
                                    payload: args.body ? args.body.toBoc().toString('base64') : ''
                                }
                            ]
                        });
                    }
                };
                
                const contractInstance = new CoinFlipContract(CONTRACT_ADDRESS, provider as any);
                setContract(contractInstance);
                console.log("Контракт успешно инициализирован");
                
                // Запрашиваем баланс контракта
                getContractBalance(contractInstance);
                
                // Запрашиваем баланс кошелька пользователя
                if (wallet?.account) {
                    try {
                        // Получаем адрес кошелька
                        const walletAddress = wallet.account.address;
                        console.log("Запрос баланса кошелька по адресу:", walletAddress);
                        
                        // Пробуем сначала получить баланс через TonWeb для максимальной скорости
                        try {
                            const tonwebBalance = await tonwebInstance.getBalance(walletAddress);
                            if (tonwebBalance !== null) {
                                console.log("Обновление: баланс кошелька через TonWeb:", tonwebBalance, "TON");
                                setWalletBalance(tonwebBalance);
                                localStorage.setItem('balance_wallet', `${tonwebBalance}`);
                                return; // Выходим из функции, если получили баланс через TonWeb
                            }
                        } catch (tonwebError) {
                            console.warn("Не удалось получить баланс через TonWeb:", tonwebError);
                        }
                        
                        // Проверяем кэш
                        const cacheKey = `balance_${walletAddress}`;
                        const cachedBalance = localStorage.getItem(cacheKey);
                        const cachedTime = parseInt(localStorage.getItem(`${cacheKey}_time`) || '0');
                        const now = Date.now();
                        const CACHE_LIFETIME = 12000; // 12 секунд
                        
                        // Если есть актуальные данные в кэше, используем их
                        if (cachedBalance && now - cachedTime < CACHE_LIFETIME) {
                            const balanceInTon = parseFloat(cachedBalance) / 1_000_000_000;
                            console.log(`Используем кэшированный баланс кошелька: ${balanceInTon} TON (возраст кэша: ${Math.round((now - cachedTime)/1000)}с)`);
                            localStorage.setItem('balance_wallet', `${balanceInTon}`);
                            setWalletBalance(balanceInTon);
                        } else {
                            // Используем ContractWrapper для получения баланса
                            const balanceInTon = await contractInstance.getWalletBalance(walletAddress);
                            localStorage.setItem('balance_wallet', `${balanceInTon}`);
                            setWalletBalance(balanceInTon);
                            console.log("Баланс кошелька:", balanceInTon, "TON");
                        }
                    } catch (error) {
                        console.error("Ошибка при получении баланса кошелька:", error);
                        // Используем фиксированное значение в случае ошибки
                        localStorage.setItem('balance_wallet', `${5}`);
                        setWalletBalance(5);
                    }
                } else {
                    console.log("Кошелек не подключен, не запрашиваем баланс кошелька");
                }
            } catch (error) {
                console.error("Ошибка инициализации контракта:", error);
                toast.error("Не удалось инициализировать контракт");
            }
        };
        
        // Вызываем асинхронную функцию
        initContract();
    }, [connected, tonConnectUI, wallet]);
    
    // Эффект для проверки результата отложенной транзакции
    useEffect(() => {
        if (!pendingTransaction || !contract) return;
        
        const { hash, amount, side } = pendingTransaction;
        
        const checkTransaction = async () => {
            try {
                const result = await contract.checkFlipResult(hash, amount, side);
                
                // Если транзакция все еще в процессе, проверяем через некоторое время
                if (result.status === 'pending') {
                    console.log("Транзакция в процессе, проверим позже:", pendingTransaction);
                    return;
                }
                
                // Если получили окончательный результат (win/lose/error)
                if (result.status === 'win' || result.status === 'lose' || result.status === 'error') {
                    setLastFlipResult(result);
                    setShowResult(true);
                    setPendingTransaction(null);
                    
                    // Обновляем баланс контракта и кошелька
                    getContractBalance(contract);
                    updateWalletBalance();
                    
                    // Показываем уведомление о результате
                    if (result.status === 'win') {
                        toast.success(`Вы выиграли ${result.winAmount} TON!`);
                    } else if (result.status === 'lose') {
                        toast.info(`Вы проиграли ${result.amount} TON.`);
                    } else {
                        toast.error(`Ошибка: ${result.error}`);
                    }
                }
            } catch (error) {
                console.error("Ошибка при проверке транзакции:", error);
            }
        };
        
        // Проверяем сразу и потом каждые 3 секунды
        checkTransaction();
        const interval = setInterval(checkTransaction, 3000);
        
        return () => clearInterval(interval);
    }, [pendingTransaction, contract]);
    
    // Функция обновления баланса кошелька
    const updateWalletBalance = async () => {
        try {
            // Если есть кошелек и контракт
            if (wallet && wallet.account && wallet.account.address && contract) {
                const walletAddress = wallet.account.address.toString();
                
                // Проверяем кэш
                const cacheKey = `balance_${walletAddress}`;
                const cachedBalance = localStorage.getItem(cacheKey);
                const cachedTime = parseInt(localStorage.getItem(`${cacheKey}_time`) || '0');
                const now = Date.now();
                const CACHE_LIFETIME = 12000; // 12 секунд
                
                // Если есть актуальные данные в кэше, используем их
                if (cachedBalance && now - cachedTime < CACHE_LIFETIME) {
                    const balanceInTon = parseFloat(cachedBalance) / 1_000_000_000;
                    
                    // Проверка на NaN 
                    if (isNaN(balanceInTon)) {
                        console.error("Кэшированный баланс не является числом (NaN), получаем новый баланс");
                        // Удаляем некорректное значение из кэша
                        localStorage.removeItem(cacheKey);
                        localStorage.removeItem(`${cacheKey}_time`);
                        
                        // Запрашиваем актуальный баланс
                        const newBalance = await contract.getWalletBalance(walletAddress);
                        setWalletBalance(newBalance);
                        localStorage.setItem('balance_wallet', `${newBalance}`);
                        console.log("Обновлен баланс кошелька:", newBalance, "TON");
                    } else {
                        console.log(`Используем кэшированный баланс кошелька: ${balanceInTon} TON (возраст кэша: ${Math.round((now - cachedTime)/1000)}с)`);
                        localStorage.setItem('balance_wallet', `${balanceInTon}`);
                        setWalletBalance(balanceInTon);
                    }
                } else {
                    // Используем ContractWrapper для получения баланса
                    const balanceInTon = await contract.getWalletBalance(walletAddress);
                    
                    // Проверка на NaN
                    if (isNaN(balanceInTon)) {
                        console.error("Полученный баланс не является числом (NaN), используем значение по умолчанию");
                        setWalletBalance(5);
                        localStorage.setItem('balance_wallet', "5");
                    } else {
                        localStorage.setItem('balance_wallet', `${balanceInTon}`);
                        setWalletBalance(balanceInTon);
                        console.log("Обновление: баланс кошелька:", balanceInTon, "TON");
                    }
                }
            }
        } catch (error) {
            console.error("Ошибка при обновлении баланса кошелька:", error);
            // Не обновляем значение в случае ошибки, оставляем предыдущее
        }
    };
    
    // Получение баланса контракта
    const getContractBalance = async (contractInstance: CoinFlipContract | null) => {
        if (!contractInstance) return;
        
        try {
            const balance = await contractInstance.getBalance();
            
            // Проверка на валидность полученного баланса
            if (isNaN(balance)) {
                console.error("Получено невалидное значение баланса контракта (NaN)");
                // Устанавливаем дефолтное значение
                setContractBalance(50);
                return 50;
            }
            
            setContractBalance(balance);
            console.log("Баланс контракта:", balance, "TON");
            return balance;
        } catch (error) {
            console.error("Ошибка при получении баланса контракта:", error);
            // Устанавливаем дефолтное значение в случае ошибки
            setContractBalance(50);
            return 50;
        }
    };
    
    // Проверка лимитов ставки
    const checkBetLimits = (amount: number): boolean => {
        // Минимальная ставка
        const minBet = 0.25;
        if (amount < minBet) {
            toast.error(`Минимальная ставка: ${minBet} TON`);
            return false;
        }
        
        // Проверка баланса кошелька (с учетом комиссии)
        if (amount > walletBalance) {
            toast.error(`Недостаточно средств в кошельке. Нужно: ${amount} TON, доступно: ${walletBalance.toFixed(2)} TON`);
            return false;
        }
        
        // Проверка максимальной ставки (1/5 от баланса контракта)
        const maxBet = contractBalance / 5;
        if (amount > maxBet) {
            toast.error(`Максимальная ставка: ${maxBet.toFixed(2)} TON (1/5 от баланса контракта)`);
            return false;
        }
        
        return true;
    };
    
    // Закрыть окно результата
    const closeResult = () => {
        setShowResult(false);
        setLastFlipResult(null);
    };
    
    // Функция для обработки ставки
    const handleFlip = useCallback(async (side: boolean, amount: number) => {
        console.log(`Отправка ставки: ${side ? T.bet1 : T.bet2}, сумма: ${amount} TON`);
        
        if (!contract || !connected) {
            toast.error("Кошелек не подключен или контракт не инициализирован");
            return;
        }
        
        // Проверяем лимиты ставки
        if (!checkBetLimits(amount)) {
            return;
        }
        
        setIsLoading(true);
        
        try {
            console.log(`Отправляем транзакцию через контракт: сторона=${side}, сумма=${amount}`);
            const result = await contract.sendFlip(side, amount);
            console.log("Результат отправки транзакции:", result);
            
            if (result.status === 'pending' && result.transactionHash) {
                toast.info("Ставка размещена! Ожидайте результат.");
                
                // Сохраняем информацию о транзакции для последующей проверки
                setPendingTransaction({
                    hash: result.transactionHash,
                    amount: amount,
                    side: side
                });
            } else if (result.status === 'error') {
                toast.error(`Ошибка: ${result.error}`);
            }
        } catch (error) {
            console.error("Ошибка при отправке транзакции:", error);
            toast.error("Не удалось отправить транзакцию");
        } finally {
            setIsLoading(false);
        }
    }, [contract, connected, contractBalance, walletBalance, T.bet1, T.bet2]);
    
    // Создаем функцию отправки ставки
    const sendBetTransaction = createBetTransaction(handleFlip);
    
    const handleBet = async () => {
        const choseTon = localStorage.getItem('choseTon');
        const Bet = localStorage.getItem('bet');
        
        if (!choseTon || !Bet) {
            toast.error("Выберите сторону и сумму ставки");
            return;
        }
        
        if (!connected) {
            toast.error("Подключите кошелек для игры");
            return;
        }
        
        if (isLoading) {
            toast.info("Подождите, транзакция выполняется");
            return;
        }
        
        sendBetTransaction(Number(choseTon), Number(Bet));
    };

    // Компонент для отображения результата
    const ResultModal = () => {
        if (!showResult || !lastFlipResult) return null;
        
        const isWin = lastFlipResult.status === 'win';
        const sideName = lastFlipResult.side ? T.bet1 : T.bet2;
        
        return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                <div className="bg-[hsla(var(--main-col-bg)/1)] p-8 rounded-3xl max-w-md w-full text-center">
                    <h2 className="text-2xl font-bold mb-4">
                        {isWin ? '🎉 Победа! 🎉' : '😢 Проигрыш 😢'}
                    </h2>
                    <p className="mb-4">
                        Ваша ставка: <span className="font-bold">{lastFlipResult.amount} TON</span> на <span className="font-bold">{sideName}</span>
                    </p>
                    {isWin && (
                        <p className="text-xl text-green-500 font-bold mb-4">
                            Выигрыш: {lastFlipResult.winAmount} TON
                        </p>
                    )}
                    <button 
                        className="bg-[hsla(var(--main-col)/1)] text-[hsl(var(--main-col-bg))] px-6 py-2 rounded-xl"
                        onClick={closeResult}
                    >
                        Продолжить игру
                    </button>
                </div>
            </div>
        );
    };

    const isMobile = window.innerWidth <= 768;
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
                        <div className={`text-sm text-center pl-2 text-[hsla(var(--main-col)/0.5)] leading-8 ${isMobile ? `flex justify-center items-center`:`justify-start items-start`}`}>{T.bet}:</div>
                        <BetBlock/>
                    </div>

                    <div className={`text-lg text-nowrap text-center p-2 mt-2 rounded-xl w-full
                    bg-[hsla(var(--main-col)/1)]
                    text-[hsl(var(--main-col-bg))]
                    hover:text-[hsla(var(--main-col-bg)/0.9)]
                    hover:bg-[hsla(var(--main-col)/0.6)]
                    transition-colors ease-in-out duration-300
                    select-none cursor-pointer ${isMobile ? `py-5 px-3`:`p-2`}`}
                    onClick={handleBet}>{isLoading ? "Отправка..." : T.flipBtn}</div>
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
        
        {/* Модальное окно результата */}
        <ResultModal />
        </>
    );
}

