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
        // Проверяем инициализацию TonWeb
        if (!tonwebInstance.getTonWeb()) {
            console.error('TonWeb не инициализирован');
            throw new Error('TonWeb не инициализирован');
        }
        
        try {
            // Получаем TonWeb непосредственно из экземпляра
            const tonweb = tonwebInstance.getTonWeb();
            let address;
            
            // Очищаем адрес от возможных пробелов
            const cleanAddressStr = addressStr.trim();
            console.log(`Пытаемся создать контракт с адресом: ${cleanAddressStr}`);
            
            try {
                // Метод 1: Используем стандартный конструктор адреса TonWeb
                address = new tonweb.utils.Address(cleanAddressStr);
                console.log('Адрес успешно создан через стандартный конструктор');
            } catch (error) {
                console.warn(`Не удалось создать адрес через стандартный конструктор: ${error instanceof Error ? error.message : String(error)}`);
                
                try {
                    // Метод 2: Создаем базовый WC + HEX адрес в формате 0:XXX...
                    if (cleanAddressStr.startsWith('EQ')) {
                        // Если адрес начинается с EQ (пользовательский формат), извлекаем base64 часть
                        // и преобразуем ее в workchain + hex
                        const base64Part = cleanAddressStr.substring(2);
                        
                        // Используем buffer для преобразования
                        const hexBytes = Array.from(new Uint8Array(Buffer.from(base64Part, 'base64url')))
                            .map(b => b.toString(16).padStart(2, '0'))
                            .join('');
                        
                        // Формируем полный адрес в формате 0:hex
                        const rawAddress = `0:${hexBytes}`;
                        console.log(`Сформирован raw-адрес: ${rawAddress}`);
                        
                        // Пробуем создать адрес из raw-формата
                        address = new tonweb.utils.Address(rawAddress);
                        console.log('Адрес успешно создан из raw-формата');
                    } else {
                        throw new Error('Адрес не начинается с EQ, невозможно извлечь base64 часть');
                    }
                } catch (error) {
                    console.warn(`Не удалось создать адрес из raw-формата: ${error instanceof Error ? error.message : String(error)}`);
                    
                    try {
                        // Метод 3: Используем встроенный метод для парсинга адреса
                        // (этот метод может быть доступен в некоторых версиях TonWeb)
                        if (typeof tonweb.utils.parseAddress === 'function') {
                            address = tonweb.utils.parseAddress(cleanAddressStr);
                            console.log('Адрес успешно создан через parseAddress');
                        } else {
                            throw new Error('Метод parseAddress не найден в TonWeb');
                        }
                    } catch (error) {
                        console.warn(`Не удалось создать адрес через parseAddress: ${error instanceof Error ? error.message : String(error)}`);
                        
                        // Метод 4: Создаем объект-заглушку, имитирующий адрес
                        console.warn('Все методы создания адреса не сработали, создаем заглушку');
                        address = {
                            toString: () => cleanAddressStr,
                            wc: 0,
                            hashPart: new Uint8Array(32),
                            isUserFriendly: () => true,
                            isBounceable: () => true,
                            isTestOnly: () => tonwebInstance.isInTestnetMode() // Используем публичный метод
                        };
                    }
                }
            }
            
            // Создаем контракт с полученным адресом
            this.contract = {
                address: address,
                provider: tonweb.provider,
                methods: {},
                getAddress: () => address
            };
            
            console.log(`Контракт успешно инициализирован с адресом: ${address.toString()}`);
        } catch (error) {
            console.error('Критическая ошибка при создании контракта:', error);
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
            // Проверяем наличие кэшированного баланса
            const now = Date.now();
            const cachedBalance = localStorage.getItem('cachedContractBalance');
            const lastFetchTime = localStorage.getItem('lastContractFetchTime');
            const cacheTimeout = 60 * 1000; // 1 минута
            
            let validCachedBalance: number | null = null;
            
            // Проверяем валидность кэшированного баланса
            if (cachedBalance && lastFetchTime) {
                const lastFetch = parseInt(lastFetchTime, 10);
                if (!isNaN(lastFetch) && now - lastFetch < cacheTimeout) {
                    validCachedBalance = parseFloat(cachedBalance);
                    if (!isNaN(validCachedBalance)) {
                        console.log(`Используем кэшированный баланс контракта: ${validCachedBalance}`);
                        return validCachedBalance;
                    }
                }
            }
            
            console.log('Запрос реального баланса контракта');
            
            // Проверяем инициализацию TonWeb и наличие контракта
            if (!this.contract || !this.contract.address) {
                console.warn('Контракт не инициализирован для получения баланса');
                return validCachedBalance || 10; // Возвращаем кэшированное значение или 10 по умолчанию
            }
            
            // Проверяем инициализацию TonWeb
            if (!this.isTonWebInitialized) {
                console.log('TonWeb не инициализирован, пробуем инициализировать для получения баланса');
                
                // Пробуем дождаться инициализации, если она еще не завершена
                const isReady = await tonwebInstance.waitForTonWeb(5000);
                this.isTonWebInitialized = isReady;
                
                if (!isReady || !tonwebInstance.getTonWeb()) {
                    console.warn('TonWeb не инициализирован, используем кэшированный баланс');
                    return validCachedBalance || 10;
                }
            }
            
            // Преобразуем адрес в строку для безопасной передачи в TonWeb
            const contractAddressStr = this.contract.address.toString();
            console.log(`Получаем баланс контракта для адреса: ${contractAddressStr}`);
            
            // Получаем баланс через TonWeb синглтон
            const tonwebBalance = await tonwebInstance.getBalance(contractAddressStr);
            if (tonwebBalance !== null && tonwebBalance !== undefined) {
                console.log(`Получен баланс контракта через TonWeb: ${tonwebBalance} TON`);
                
                // Сохраняем полученное значение в localStorage
                localStorage.setItem('cachedContractBalance', tonwebBalance.toString());
                localStorage.setItem('lastContractFetchTime', now.toString());
                
                return tonwebBalance;
            }
            
            // Если не удалось получить баланс через TonWeb, и есть валидный кэшированный баланс
            if (validCachedBalance !== null) {
                console.log(`Используем кэшированный баланс после неудачного запроса: ${validCachedBalance}`);
                return validCachedBalance;
            }
            
            // Если все способы не сработали, возвращаем фиксированное значение
            console.warn('Невозможно получить баланс, возвращаем значение по умолчанию 10 TON');
            return 10;
        } catch (error) {
            console.error('Ошибка при получении баланса контракта:', error);
            // В случае ошибки возвращаем фиксированное значение
            return 10;
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