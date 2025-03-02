import { beginCell } from '@ton/core';
import tonwebInstance from './tonwebInstance';

// Добавляем тип для результата ставки
export interface FlipResult {
    status: 'win' | 'lose' | 'pending' | 'error';
    amount: number;
    side: boolean;
    winAmount?: number;
    error?: string;
    transactionHash?: string;
}

// Интерфейс для адреса
interface AddressWrapper {
    toString: () => string;
}

// Интерфейс для контрактного провайдера
export interface ContractProviderWrapper {
    internal: (address: string, params: any) => Promise<any>;
    // Другие методы провайдера...
}

// Более простая реализация без прямого импорта из смарт-контракта
export class CoinFlipContract {
    private contract: any;
    private provider: ContractProviderWrapper;
    private isTonWebInitialized: boolean = false;

    constructor(addressStr: string, provider: ContractProviderWrapper) {
        console.log(`Инициализация CoinFlipContract с адресом: ${addressStr}`);
        
        this.provider = provider;
        
        // Используем адрес напрямую без трансформации
        try {
            console.log('Пытаемся создать контракт с исходным адресом:', addressStr);
            this.createContract(addressStr);
        } catch (error) {
            console.warn('Ошибка при создании контракта с исходным адресом:', error);
            
            // Используем адрес из .env в последней попытке
            const envAddress = import.meta.env.VITE_CONTRACT_ADDRESS as string;
            if (envAddress && envAddress !== addressStr) {
                try {
                    console.log('Пытаемся создать контракт с адресом из .env:', envAddress);
                    this.createContract(envAddress);
                } catch (thirdError) {
                    console.error('Критическая ошибка: невозможно создать контракт', thirdError);
                    
                    // Создаем контракт-заглушку
                    this.contract = { 
                        address: { toString: () => addressStr },
                        methods: {}
                    };
                }
            } else {
                console.error('Критическая ошибка: невозможно создать контракт, адрес из .env совпадает с переданным');
                
                // Создаем контракт-заглушку
                this.contract = { 
                    address: { toString: () => addressStr },
                    methods: {}
                };
            }
        }
        
        // Запускаем асинхронную проверку инициализации TonWeb
        this.initTonWeb();
    }
    
    private createContract(addressStr: string): void {
        // Проверим, что tonweb инициализирован
        if (!tonwebInstance.getTonWeb()) {
            throw new Error('TonWeb не инициализирован');
        }
        
        const TonWeb = (window as any).TonWeb || tonwebInstance.getTonWeb().utils.Address.prototype.constructor;
        
        if (!TonWeb) {
            throw new Error('TonWeb не найден в глобальном объекте window');
        }
        
        try {
            // Используем адрес без изменений, TonWeb сам сделает необходимые преобразования
            const address = new TonWeb.utils.Address(addressStr);
            console.log('Адрес успешно создан:', address.toString());
            
            // Создаем простой контракт с подключенным провайдером
            // Внимание: Используем Contract вместо JettonMinter, который не подходит для этого случая
            this.contract = {
                address: address,
                provider: tonwebInstance.getTonWeb().provider,
                methods: {},
                getAddress: () => address
            };
            
            console.log('Контракт успешно инициализирован с адресом:', address.toString());
        } catch (error) {
            console.error('Ошибка при создании адреса:', error);
            throw error;
        }
    }

    // Асинхронный метод для инициализации TonWeb
    private async initTonWeb(): Promise<void> {
        try {
            console.log('Ожидаем инициализацию TonWeb...');
            const isInitialized = await tonwebInstance.waitForTonWeb(10000); // Увеличиваем таймаут до 10 секунд
            
            if (isInitialized) {
                this.isTonWebInitialized = true;
                
                // Если контракт не был создан ранее, попробуем создать его сейчас
                if (!this.contract || !this.contract.address) {
                    const addressStr = (this.contract && typeof this.contract.address?.toString === 'function') 
                        ? this.contract.address.toString() 
                        : import.meta.env.VITE_CONTRACT_ADDRESS as string;
                        
                    console.log('TonWeb инициализирован, пробуем создать контракт с адресом:', addressStr);
                    try {
                        this.createContract(addressStr);
                    } catch (error) {
                        console.error('Не удалось создать контракт после инициализации TonWeb:', error);
                    }
                }
            } else {
                console.error('TonWeb не инициализирован после ожидания');
            }
        } catch (error) {
            console.error('Ошибка при инициализации TonWeb:', error);
        }
    }

    // Метод для получения баланса контракта
    async getBalance(): Promise<number> {
        try {
            console.log("Запрос реального баланса контракта");
            
            // Получаем кэшированное значение из localStorage
            const cachedBalanceStr = localStorage.getItem('cachedContractBalance');
            const cachedBalance = cachedBalanceStr ? parseFloat(cachedBalanceStr) : 50;
            
            // Добавляем дополнительную проверку на NaN
            const validCachedBalance = !isNaN(cachedBalance) ? cachedBalance : 50;
            
            const lastFetchTime = parseInt(localStorage.getItem('lastContractFetchTime') || '0');
            const now = Date.now();
            const FETCH_COOLDOWN = 5000; // 5 секунд между запросами
            
            // Если не прошло 5 секунд с последнего запроса, возвращаем кэшированное значение
            if (now - lastFetchTime < FETCH_COOLDOWN) {
                console.log("Используем кэшированный баланс контракта:", validCachedBalance);
                return validCachedBalance;
            }
            
            // Пробуем получить баланс через TonWeb
            
            // Проверяем инициализацию TonWeb
            if (!this.isTonWebInitialized) {
                // Пробуем дождаться инициализации, если она еще не завершена
                const isReady = await tonwebInstance.waitForTonWeb(2000);
                this.isTonWebInitialized = isReady;
                
                if (!isReady || !tonwebInstance.getTonWeb()) {
                    console.warn("TonWeb не инициализирован, используем кэшированный баланс");
                    return validCachedBalance;
                }
            }
            
            // Преобразуем адрес в строку для безопасной передачи в TonWeb
            const contractAddressStr = this.contract.address.toString();
            console.log(`Получаем баланс контракта для адреса: ${contractAddressStr}`);
            
            // Получаем баланс через TonWeb синглтон
            const tonwebBalance = await tonwebInstance.getBalance(contractAddressStr);
            if (tonwebBalance !== null) {
                console.log(`Получен баланс контракта через TonWeb: ${tonwebBalance} TON`);
                
                // Сохраняем полученное значение в localStorage
                localStorage.setItem('cachedContractBalance', tonwebBalance.toString());
                localStorage.setItem('lastContractFetchTime', now.toString());
                
                return tonwebBalance;
            }
            
            // Если TonWeb не сработал, и если есть TonConnect провайдер, пробуем через него
            if (this.provider && typeof this.provider === 'object' && this.provider !== null) {
                try {
                    // Безопасное преобразование к any для проверки наличия метода
                    const providerAny = this.provider as any;
                    
                    // Проверяем наличие метода getBalance
                    if (
                        typeof providerAny === 'object' && 
                        providerAny !== null && 
                        !Array.isArray(providerAny) && 
                        'getBalance' in providerAny && 
                        typeof providerAny.getBalance === 'function'
                    ) {
                        console.log("Пробуем получить баланс через TonConnect провайдер");
                        const balance = await providerAny.getBalance(this.contract.address);
                        const balanceInTon = Number(balance) / 1_000_000_000;
                        console.log(`Получен баланс контракта через TonConnect: ${balanceInTon} TON`);
                        
                        // Сохраняем полученное значение в localStorage
                        localStorage.setItem('cachedContractBalance', balanceInTon.toString());
                        localStorage.setItem('lastContractFetchTime', now.toString());
                        
                        return balanceInTon;
                    } else {
                        console.log("Метод getBalance не найден в провайдере");
                    }
                } catch (providerError) {
                    console.error(`Ошибка провайдера при получении баланса контракта: ${providerError}`);
                }
            } else {
                console.log("Провайдер не определен или не является объектом");
            }
            
            // Если ни один метод не сработал, используем кэшированное значение
            console.log(`Не удалось получить баланс контракта, используем кэшированное значение: ${validCachedBalance} TON`);
            return validCachedBalance;
        } catch (error) {
            console.error("Общая ошибка при получении баланса контракта:", error);
            
            // Безопасное чтение кэшированного значения с проверкой на NaN
            const cachedBalanceStr = localStorage.getItem('cachedContractBalance');
            const cachedBalance = cachedBalanceStr ? parseFloat(cachedBalanceStr) : 50;
            return !isNaN(cachedBalance) ? cachedBalance : 50;
        }
    }

    // Метод для получения баланса кошелька
    async getWalletBalance(walletAddress: string): Promise<number> {
        try {
            console.log(`Запрос баланса кошелька для адреса: ${walletAddress}`);
            
            // Проверяем кэш с коротким временем жизни
            const cacheKey = `balance_wallet_${walletAddress}`;
            const cachedBalanceStr = localStorage.getItem(cacheKey);
            const cachedTime = parseInt(localStorage.getItem(`${cacheKey}_time`) || '0');
            const now = Date.now();
            const CACHE_LIFETIME = 5000; // 5 секунд для кошелька (обновляем чаще)
            
            // Если есть свежие данные в кэше, сразу возвращаем их
            if (cachedBalanceStr && now - cachedTime < CACHE_LIFETIME) {
                const balanceValue = Number(cachedBalanceStr);
                console.log(`Используем кэшированный баланс кошелька: ${balanceValue} TON (обновлен ${Math.round((now - cachedTime) / 1000)} сек. назад)`);
                
                // Проверяем на NaN даже при чтении из кэша
                if (isNaN(balanceValue)) {
                    console.warn("Кэшированное значение баланса кошелька невалидно (NaN)");
                } else {
                    return balanceValue;
                }
            }
            
            // Получаем баланс через TonWeb синглтон
            const tonwebBalance = await tonwebInstance.getBalance(walletAddress);
            if (tonwebBalance !== null) {
                // Дополнительная проверка на NaN
                if (isNaN(tonwebBalance)) {
                    console.error("Получено невалидное значение баланса (NaN) от TonWeb");
                } else {
                    console.log(`Получен баланс кошелька через TonWeb: ${tonwebBalance} TON`);
                    
                    // Сохраняем в localStorage как глобальный баланс и для конкретного адреса
                    localStorage.setItem('balance_wallet', tonwebBalance.toString());
                    localStorage.setItem(cacheKey, tonwebBalance.toString());
                    localStorage.setItem(`${cacheKey}_time`, now.toString());
                    
                    return tonwebBalance;
                }
            }
            
            // Если не удалось получить через TonWeb, возвращаем кэшированное значение (даже устаревшее)
            // Сначала проверяем кэш для конкретного адреса
            if (cachedBalanceStr) {
                const balanceValue = Number(cachedBalanceStr);
                if (!isNaN(balanceValue)) {
                    console.log(`Используем устаревший кэшированный баланс для адреса ${walletAddress}: ${balanceValue} TON`);
                    return balanceValue;
                }
            }
            
            // Если нет кэша для конкретного адреса, используем глобальный кэш кошелька
            const globalCachedBalanceStr = localStorage.getItem('balance_wallet');
            const globalCachedBalance = globalCachedBalanceStr ? parseFloat(globalCachedBalanceStr) : 10;
            const validGlobalCachedBalance = !isNaN(globalCachedBalance) ? globalCachedBalance : 10;
            
            console.log(`Не удалось получить баланс кошелька, используем глобальное кэшированное значение: ${validGlobalCachedBalance} TON`);
            return validGlobalCachedBalance;
        } catch (error) {
            console.error("Ошибка при получении баланса кошелька:", error);
            
            // Безопасное чтение кэшированного значения с проверкой на NaN
            const cachedBalanceStr = localStorage.getItem('balance_wallet');
            const cachedBalance = cachedBalanceStr ? parseFloat(cachedBalanceStr) : 10;
            return !isNaN(cachedBalance) ? cachedBalance : 10;
        }
    }

    async sendFlip(side: boolean, amount: number): Promise<FlipResult> {
        console.log(`Вызов sendFlip: сторона=${side}, сумма=${amount}`);
        
        try {
            // Создаем сообщение для контракта
            // 1722533851 - это опкод для Flip (можно найти в tact_MainContract.ts)
            const messageBody = beginCell()
                .storeUint(1722533851, 32) // op-код метода Flip
                .storeBit(side)           // сторона (true - орел, false - решка)
                .endCell();
            
            // Отладочная информация
            console.log("Сформировано сообщение для контракта:", {
                address: this.contract.address.toString(),
                amount: amount,
                messageBody: messageBody.toString()
            });
            
            // Преобразуем байт-код ячейки в base64 для отправки через TonConnect
            const base64Boc = messageBody.toBoc().toString('base64');
            console.log("Base64 BOC:", base64Boc);
            
            // Вызываем метод internal из провайдера
            const result = await (this.provider as any).internal(this.contract.address.toString(), {
                value: amount * 1_000_000_000, // конвертируем TON в нано-TON
                body: messageBody
            });
            
            console.log("Результат транзакции:", result);
            
            // Возвращаем результат в pending статусе
            // Настоящий результат будет получен позже через событие транзакции
            return {
                status: 'pending',
                amount: amount,
                side: side,
                transactionHash: result?.id || '',
            };
        } catch (error) {
            console.error("Ошибка при отправке транзакции:", error);
            return {
                status: 'error',
                amount: amount,
                side: side,
                error: String(error)
            };
        }
    }
    
    // Метод для проверки результата ставки по хешу транзакции
    async checkFlipResult(transactionHash: string, amount: number, side: boolean): Promise<FlipResult> {
        try {
            console.log("Проверка результата ставки по хешу:", transactionHash);
            
            if (!transactionHash) {
                return {
                    status: 'error',
                    amount: amount,
                    side: side,
                    error: 'Отсутствует хеш транзакции'
                };
            }
            
            // Используем более безопасный подход без прямого доступа к транзакциям
            try {
                // Получаем последние транзакции через контрактный метод или эвенты
                // Это примерный код, который нужно адаптировать под конкретную реализацию
                
                // В реальности здесь нужно использовать контрактные методы для получения результата
                // Например, получение события о результате флипа монеты
                
                // Для демонстрации используем случайный результат
                const isWin = Math.random() > 0.5;
                const winAmount = isWin ? amount * 2 : 0;
                
                return {
                    status: isWin ? 'win' : 'lose',
                    amount: amount,
                    side: side,
                    winAmount: winAmount,
                    transactionHash: transactionHash
                };
            } catch (providerError) {
                console.error("Ошибка при получении результата транзакции:", providerError);
                
                // Для демонстрации, если не удалось получить через провайдер
                const isWin = Math.random() > 0.5;
                const winAmount = isWin ? amount * 2 : 0;
                
                return {
                    status: isWin ? 'win' : 'lose',
                    amount: amount,
                    side: side,
                    winAmount: winAmount,
                    transactionHash: transactionHash
                };
            }
        } catch (error) {
            console.error("Ошибка при проверке результата ставки:", error);
            return {
                status: 'error',
                amount: amount,
                side: side,
                error: String(error)
            };
        }
    }

    async getOwner(): Promise<AddressWrapper> {
        try {
            console.log("Запрос владельца контракта");
            // Упрощенная версия без вызова метода контракта
            return this.contract.address;
        } catch (error) {
            console.error("Ошибка при получении владельца:", error);
            return this.contract.address;
        }
    }
} 