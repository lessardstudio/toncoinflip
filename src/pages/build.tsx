import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { CoinFlipContract } from '@/lib/contractWrapper';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { CONTRACT_ADDRESS } from '@/lib/config';
import MainPage from './main';

export default function BuilderPage() {
    const [tonConnectUI] = useTonConnectUI();
    const wallet = useTonWallet(); // Хук для кошелька
    const connected = Boolean(wallet?.account?.address); // Более точная проверка подключения
    const [contract, setContract] = useState<CoinFlipContract | null>(null);
    const [balance, setBalance] = useState(0);
    const [error, setError] = useState<string | null>(null);
    
    // Используем адрес из конфигурации
    // const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || 'EQDTu0cHyVvEaUMF9NYk9p_MAUKtHxR_mZC15mvoB9tYwJ6r';

    // Инициализация контракта
    const initContract = useCallback(() => {
        if (!connected || !wallet) {
            // console.log("Не инициализируем контракт - кошелек не подключен");
            return;
        }
        
        try {
            // console.log("Инициализация контракта с адресом", wallet.account.address);
            
            // Упрощенный адаптер провайдера для нашего контракта
            const provider = {
                // Метод для получения данных контракта
                get: async () => ({ stack: [] }),
                
                // Метод для отправки транзакций через TonConnect UI
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
                }
            };
            
            const contractInstance = new CoinFlipContract(CONTRACT_ADDRESS, provider as any, tonConnectUI);
            setContract(contractInstance);
            // console.log("Контракт успешно инициализирован");
            
            // Запрашиваем баланс (для демо используем фиксированное значение)
            setBalance(10);
        } catch (error) {
            console.error("Ошибка инициализации контракта:", error);
            setError("Не удалось инициализировать контракт.");
        }
    }, [connected, tonConnectUI, wallet]);

    // Отладочный эффект для мониторинга состояния подключения
    useEffect(() => {
        /* console.log("Изменилось состояние кошелька:", { 
            wallet: wallet ? wallet.account.address : 'не подключен',
            connected,
            wallDetails: wallet
        }); */
        
        if (connected && wallet) {
            toast.success("Кошелек подключен: " + wallet.account.address.slice(0, 8) + "...");
            // При успешном подключении инициализируем контракт
            initContract();
        } else if (!wallet && contract) {
            // Сбрасываем состояние при отключении
            setContract(null);
            setBalance(0);
            toast.info("Кошелек отключен");
        }
    }, [wallet, connected, initContract, contract]);

    // Первоначальная проверка подключения
    useEffect(() => {
        /* console.log("TonConnect состояние:", { 
            isConnected: connected,
            walletReady: Boolean(wallet),
            wallet: wallet?.account?.address
        }); */
    }, [connected, wallet]);


    /* console.log("Рендер MainPage", { 
        connected, 
        balance, 
        error, 
        wallet: wallet?.account?.address,
        contractInitialized: Boolean(contract)
    }); */



    // Если есть ошибка, показываем её
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-6">
                <h2 className="text-xl font-bold mb-4 text-red-500">Ошибка</h2>
                <p>{error}</p>
                <button 
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
                    onClick={() => setError(null)}
                >
                    Попробовать снова
                </button>
            </div>
        );
    }
    
    return (
        <>
        <MainPage/>
        </>
    );
} 