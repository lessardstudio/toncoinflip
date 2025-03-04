import { useTranslation } from "@/components/lang";
import ChoseItem from "./chose";
import BetBlock from "./bet";
import { Button } from "@/components/ui/button";
import MoneyBag from '/tg_money_bag.webp'
import MoneyWings from '/tg_money_with_wings.webp'
import GemStone from '/tg_gem_stone.webp'
import createBetTransaction from "@/components/tonweb/sendBetTransaction";
import { useCallback, useState, useEffect } from "react";
import { CoinFlipContract } from "@/lib/contractWrapper";
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { toast } from "react-toastify";
import { TonClient } from '@ton/ton';
import { Address, beginCell, Cell } from '@ton/core';
import { storeMessage } from '@ton/core';
import tonwebInstance from '@/lib/tonwebInstance';
import { CoinFlipScene } from "@/components/animations/coinflip";
import './style.css';

// Получаем адрес контракта из переменных окружения
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || 'EQDTu0cHyVvEaUMF9NYk9p_MAUKtHxR_mZC15mvoB9tYwJ6r';

// Инициализируем TonClient
const tonClient = new TonClient({
    endpoint: import.meta.env.VITE_IS_TESTNET === 'true' 
        ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
        : 'https://toncenter.com/api/v2/jsonRPC',
    apiKey: import.meta.env.VITE_TONCENTER_API_KEY
});

interface ExternalMessage {
    info: {
        type: string;
    };
    body?: string;
}

interface TonTransaction {
    hash: {
        toString(format: string): string;
    };
    lt: string | bigint;
    inMessage?: ExternalMessage;
}



// Функция для повторных попыток
const retry = async (fn: () => Promise<any>, { retries = 30, delay = 1000 } = {}) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

// Функция для получения транзакции по BOC
export async function getTxByBOC(exBoc: string, walletAddress: string): Promise<{txHash: string, prevLT: number, lt: string, inMsg: ExternalMessage}> {
    const myAddress = Address.parse(walletAddress);

    return retry(async () => {
        const transactions = await tonClient.getTransactions(myAddress, {
            limit: 5,
        }) as unknown as TonTransaction[];
        
        let prevLT = 0;
        for (const tx of transactions) {
            if (Number(tx.lt) < prevLT && Number(tx.lt) !== 0) prevLT = Number(tx.lt);
            const inMsg = tx.inMessage;
            if (inMsg?.info.type === 'external-in') {
                const inBOC = inMsg?.body;
                if (typeof inBOC === 'undefined') {
                    console.error('Invalid external message');
                    continue;
                }
                
                const extHash = Cell.fromBase64(exBoc).hash().toString('hex');
                const inHash = beginCell().store(storeMessage(inMsg as any)).endCell().hash().toString('hex');

                console.log(' hash BOC', extHash);
                console.log('inMsg hash', inHash);
                console.log('checking the tx', tx.hash.toString('base64'));

                if (extHash === inHash) {
                    console.log('Tx match');
                    const txHash = tx.hash.toString('hex');
                    // const hash = beginCell().store(storeMessage(tx as any)).endCell().hash().toString('hex');
                    console.log(`Transaction: ${extHash} ${txHash} `);
                    const lt = tx.lt.toString();
                    console.log(`Transaction LT: ${lt}`);
                    return {txHash: extHash, prevLT: prevLT, lt: `${lt}`, inMsg: inMsg};
                }
            }
        }
        throw new Error('Transaction not found');
    });
}

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
    const [txloading, setTxLoading] = useState<boolean>(false);
    const [showResult, setShowResult] = useState<boolean>(false);
    const [lastFlipResult, setLastFlipResult] = useState<{status: string, amount: number, side: boolean, winAmount: number} | null>(null);
    // Состояние для истории игр
    
    // Инициализация контракта
    useEffect(() => {
        if (!connected || !wallet) {
            // console.log("Кошелек не подключен, контракт не инициализирован");
            return; 
        }
        
        // Используем асинхронную функцию внутри useEffect
        const initContract = async () => {
            try {
                // console.log("Инициализация контракта с адресом", CONTRACT_ADDRESS);
                
                // Создаем провайдер для контракта через TonConnect
                const provider = {
                    // Метод для получения данных контракта
                    get: async () => {
                        try {
                            const result = await tonwebInstance.getContractData(CONTRACT_ADDRESS, 'getGame');
                            return { stack: result };
                        } catch (error) {
                            console.error('Ошибка при вызове get:', error);
                            return { stack: [] };
                        }
                    },
                    
                    // Метод для отправки транзакций
                    internal: async (_address: any, args: any) => {
                        // console.log("Вызов internal с аргументами:", args);
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
                    },

                    // Метод для получения транзакций
                    getTransactions: async (address: string, params: { limit: number; lt?: string; hash?: string }) => {
                        try {
                            const response = await tonwebInstance.sendProviderRequest('getTransactions', {
                                address,
                                limit: params.limit,
                                lt: params.lt,
                                hash: params.hash,
                                archival: true
                            });
                            return { ok: true, result: response.result || [] };
                        } catch (error) {
                            console.error('Ошибка при получении транзакций:', error);
                            return { ok: false, result: [] };
                        }
                    },

                    // Метод для получения хэша транзакции из BOC
                    sendBocReturnHash: async (boc: string) => {
                        try {
                            const txHash = await tonwebInstance.getTransactionHash(boc);
                            return { ok: true, result: { hash: txHash } };
                        } catch (error) {
                            console.error("Ошибка при получении хэша транзакции:", error);
                            return { ok: false, result: { hash: '' } };
                        }
                    }
                };
                
                const contractInstance = new CoinFlipContract(CONTRACT_ADDRESS, provider as any, tonConnectUI);
                setContract(contractInstance);
                // console.log("Контракт успешно инициализирован");
                
                // Запрашиваем баланс контракта
                getContractBalance(contractInstance);
                
                // Запрашиваем баланс кошелька пользователя
                if (wallet?.account) {
                    await updateWalletBalance();
                }
            } catch (error) {
                console.error("Ошибка инициализации контракта:", error);
                toast.error("Не удалось инициализировать контракт");
            }
        };
        
        // Вызываем асинхронную функцию
        initContract();
    }, [connected, tonConnectUI, wallet]);


    

    // Проверка транзакции
    const checkTransaction = async (txHash: string, address: string, lt: string): Promise<{status: string, amount: number}> => {
        try {
            console.log('Входные параметры checkTransaction:', { txHash, address, lt });

            if (!contract) {
                throw new Error('Контракт не инициализирован');
            }

            if (!txHash || txHash.trim() === '') {
                throw new Error('Не указан хэш транзакции');
            }

            if (!address || address.trim() === '') {
                throw new Error('Не указан адрес');
            }

            // Формируем параметры запроса
            const params: any = {
                address: address.trim(),
                limit: 1,
                hash: txHash.trim(),
                archival: true,
            };

            // Добавляем lt только если он не пустой
            if (lt && lt.trim() !== '') {
                params.to_lt = (Number(lt)).toString().trim();
            }

            console.log('Параметры запроса к API:', params);
            const result = await tonwebInstance.sendProviderRequest('getTransactions', params);
            console.log('Результат проверки транзакции:', result);
            for (const tx of result.result) {
                if (tx.in_msg.message.toLowerCase() === 'win' || tx.in_msg.message.toLowerCase() === 'lost') {
                    return {status: tx.in_msg.message.toLowerCase(), amount: Number(tx.in_msg.value)/1e9}
                }
            }
            return {status: 'none', amount: 0};
        } catch (error) {
            console.error('Ошибка при проверке транзакции:', error);
            throw error; // Пробрасываем ошибку дальше для обработки
        }
    };
    
    // Функция обновления баланса кошелька
    const updateWalletBalance = async () => {
        try {
            // Если есть кошелек и контракт
            if (wallet && wallet.account && wallet.account.address && contract) {
                const walletAddress = wallet.account.address.toString();
                const balance = await contract.getWalletBalance(walletAddress);

                if (Number(balance) !== walletBalance) {
                    // console.log("1111 Баланс кошелька:", walletBalance, "TON");
                    setWalletBalance(Number(balance));
                    localStorage.setItem('walletBalance', balance.toString());
                    // console.log("Обновлен баланс кошелька:", balance, "TON");
                } else {
                    // console.error("Получен некорректный баланс:", balance);
                }
            }
        } catch (error) {
            console.error("Ошибка при обновлении баланса кошелька:", error);
            setWalletBalance(0);
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
            // console.log("Баланс контракта:", balance, "TON");
            updateWalletBalance();
            return balance;
        } catch (error) {
            // console.error("Ошибка при получении баланса контракта:", error);
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
        if (wallet?.account?.address) {
            const walletBalance = Number(tonwebInstance.getBalance(wallet?.account?.address?.toString()));
            if (amount > walletBalance) {
                toast.error(`Недостаточно средств в кошельке. Нужно: ${amount} TON, доступно: ${walletBalance.toFixed(2)} TON`);
                return false;
            }
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
        setTxLoading(false);
    };
    
    // Функция для обработки ставки
    const handleFlip = useCallback(async (side: boolean, amount: number) => {
        if (!contract || !connected || !wallet?.account?.address) {
            toast.error("Кошелек не подключен или контракт не инициализирован");
            return;
        }
        
        // Проверяем лимиты ставки
        if (!checkBetLimits(amount)) {
            return;
        }
        
        setIsLoading(true);
        
        try {
            const result = await contract.sendFlip(side, amount);
            
            // Получаем хэш транзакции по BOC
            if (result.boc) {
                setTxLoading(true);
                const tx = await getTxByBOC(result.boc, wallet.account.address.toString());
                let res = await checkTransaction(tx.txHash, wallet.account.address.toString(), tx.lt);
                while (res.status === 'none') {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    res = await checkTransaction(tx.txHash, wallet.account.address.toString(), tx.lt);
                }

                if (res.status === 'win' || res.status === 'lost') {
                    setTxLoading(false);
                    setLastFlipResult({status: res.status, amount: amount, side: side, winAmount: res.amount});
                    setShowResult(true);
                    setIsLoading(false);
                    await updateWalletBalance();
                }
                await updateWalletBalance();
            }
            
        } catch (error) {
            console.error("Ошибка при отправке транзакции:", error);
            toast.error("Не удалось отправить транзакцию");
        } finally {
/*             setIsLoading(false);
            setTxLoading(false);
            setShowResult(false); */
        }
    }, [contract, connected, contractBalance, walletBalance, T.bet1, T.bet2, wallet]);
    
    // Создаем функцию отправки ставки
    const sendBetTransaction = createBetTransaction(handleFlip);
    
    const handleBet = async () => {
        const choseTon = localStorage.getItem('choseTon');
        const Bet = localStorage.getItem('bet');
        
        if (!choseTon || !Bet) {
            toast.error("Выберите сторону и сумму ставки",
                {
                    position: "top-center",
                    autoClose: 5000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                }
            );
            return;
        }
        
        if (!connected) {
            toast.error("Подключите кошелек для игры",
                {
                    position: "top-center",
                    autoClose: 5000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                }
            );
            return;
        }

        if (wallet?.account?.address) {
            const amount = Number(localStorage.getItem('bet'));
            await updateWalletBalance();
            const walletBalance = Number(tonwebInstance.getBalance(wallet?.account?.address?.toString()));
            if (walletBalance && amount > walletBalance) {
                toast.error(`Недостаточно средств в кошельке. Нужно: ${amount} TON, доступно: ${walletBalance.toFixed(2)} TON`,
                {
                    position: "top-center",
                    autoClose: 5000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                }
            );
                return;
            } else if(localStorage.getItem('cachedWalletBalance') && amount > Number(localStorage.getItem('walletBalance'))) {
                toast.error(`Недостаточно средств в кошельке. Нужно: ${amount} TON, доступно: ${localStorage.getItem('cachedWalletBalance')} TON`,
                {
                    position: "top-center",
                    autoClose: 5000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                }
            );
                return;
            }
        }
        
        if (isLoading) {
            toast.info("Подождите, транзакция выполняется");
            return;
        }

        
        sendBetTransaction(Number(choseTon), Number(Bet));
    };

    // Компонент для отображения результата
    const ResultModal = () => {
        if (!showResult && txloading) return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                <div className="flex flex-col items-center justify-center bg-[hsla(var(--main-col-bg)/1)] p-8 rounded-3xl max-w-md w-full text-center">
                    <h2 className="text-2xl font-bold mb-4">
                        {T.transactionProcessing}
                    </h2>
                    <img src={GemStone} alt="GemStone" width="100" height="100" />
                    
                </div>
            </div>
        );
        else if (!showResult) return null;
        
        const isWin = lastFlipResult?.status === 'win';
        const sideName = lastFlipResult?.side ? T.bet2 : T.bet1;
        
        return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                <div className="relative bg-[hsla(var(--main-col-bg)/1)] rounded-3xl max-w-md w-full text-center">
                    <h2 className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl text-[50px] font-bold z-50 opacity-0 animate-[fadeIn_500ms_ease-in-out_3000ms_forwards] cursor-none select-none">
                        {isWin ? ` ${T.win.toUpperCase()}` : ` ${T.lost.toUpperCase()}`}
                    </h2>

                    <div className="opacity-1 animate-[fadeOut05_1000ms_ease-in-out_2500ms_forwards]">
                        <CoinFlipScene isWin={isWin} side={lastFlipResult?.side ?? false}/>
                    </div>
                    <p className="mb-4">
                        {T.betPrefix}: <span className="font-bold">{lastFlipResult?.amount} TON</span> {T.onPrefix} <span className="font-bold">{sideName}</span>
                    </p>
                    {isWin && (
                        <p className="text-xl text-green-500 font-bold mb-4 opacity-0 animate-[fadeIn_500ms_ease-in-out_3500ms_forwards]">
                            {T.winAmountPrefix}: {lastFlipResult?.winAmount} TON
                        </p>
                    )}
      
                    <button 
                        className="bg-[hsla(var(--main-col)/1)] text-[hsl(var(--main-col-bg))] px-6 py-2 rounded-xl mb-8"
                        onClick={closeResult}
                    >
                        {T.continueBtnFromResult}
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
                    onClick={handleBet}>{isLoading ? T.transactionSending : T.flipBtn}</div>
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
                
            </div>
        </div>
        
        {/* Модальное окно результата */}
        <ResultModal />
        </>
    );
}

