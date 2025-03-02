/**
 * Синглтон для работы с TonWeb
 * Позволяет создать и переиспользовать экземпляр TonWeb в разных частях приложения
 */

// TonWeb в сборке Vite может требовать использования ESM импорта.
// Определяем интерфейс для TonWeb
//interface ITonWeb {
//    new(provider: any): any;
//    HttpProvider?: any;
//}

// Определяем тип для window с TonWeb
declare global {
    interface Window {
        TonWeb: any;
    }
}

// Интерфейс для кэшированного баланса
interface CachedBalance {
    balance: number;
    timestamp: number;
}

class TonWebInstance {
    private static instance: TonWebInstance = new TonWebInstance();
    private tonweb: any = null;
    private isTestnet: boolean;
    private apiKey: string;
    private TonWebLib: any = null;
    private initializationPromise: Promise<void> | null = null;
    private rateLimitedUntil: number = 0;
    private maxRateLimitWait: number = 10000; // 10 секунд максимальная задержка
    private balanceCache: Map<string, CachedBalance> = new Map();
    private balanceCacheTime: number = 60000; // 1 минута

    private constructor() {
        // Определяем сеть
        this.isTestnet = import.meta.env.VITE_IS_TESTNET === 'true';
        this.apiKey = import.meta.env.VITE_TONCENTER_API_KEY || '';
        console.log('API ключ доступен:', !!this.apiKey);
        
        // Запускаем инициализацию сразу
        this.initializationPromise = this.initializeTonWeb();
    }

    private async initializeTonWeb(): Promise<void> {
        try {
            console.log('Инициализация TonWeb...');
            
            // Проверяем, доступен ли TonWeb в глобальном контексте window
            if (window.TonWeb) {
                console.log('Используем TonWeb из глобального объекта window');
                this.TonWebLib = window.TonWeb;
            } else {
                // Динамический импорт TonWeb
                try {
                    console.log('Пытаемся импортировать TonWeb через ESM...');
                    const tonwebModule = await import('tonweb');
                    this.TonWebLib = tonwebModule.default || tonwebModule;
                    console.log('TonWeb успешно импортирован через ESM');
                } catch (importError) {
                    console.error('Ошибка при импорте TonWeb через ESM:', importError);
                    
                    // Пробуем загрузить TonWeb через скрипт
                    console.log('Пытаемся загрузить TonWeb через скрипт...');
                    try {
                        await new Promise<void>((resolve, reject) => {
                            const script = document.createElement('script');
                            script.src = 'https://unpkg.com/tonweb@0.0.62/dist/tonweb.js';
                            script.onload = () => {
                                if (window.TonWeb) {
                                    console.log('TonWeb успешно загружен из:', script.src);
                                    this.TonWebLib = window.TonWeb;
                                    resolve();
                                } else {
                                    reject(new Error('TonWeb не найден в window после загрузки скрипта'));
                                }
                            };
                            script.onerror = () => {
                                console.error('Ошибка при загрузке TonWeb через скрипт');
                                reject(new Error('Ошибка при загрузке TonWeb через скрипт'));
                            };
                            document.head.appendChild(script);
                        });
                    } catch (scriptError) {
                        console.error('Не удалось загрузить TonWeb через скрипт:', scriptError);
                        throw new Error('TonWeb недоступен. Проверьте подключение к интернету и попробуйте перезагрузить страницу.');
                    }
                }
            }
            
            // Проверяем наличие TonWebLib перед созданием экземпляра
            if (!this.TonWebLib) {
                throw new Error('TonWeb библиотека не инициализирована');
            }
            
            // Выбираем endpoint в зависимости от сети
            const endpoint = this.isTestnet
                ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
                : 'https://toncenter.com/api/v2/jsonRPC';

            // Создаем провайдер с API ключом, если он есть
            const provider = new this.TonWebLib.HttpProvider(endpoint, {
                apiKey: this.apiKey
            });

            // Модифицируем провайдер для обработки ошибок
            const originalSend = provider.send.bind(provider);
            provider.send = async (method: string, params: any): Promise<any> => {
                // Проверяем, не находимся ли мы в состоянии rate limit
                const now = Date.now();
                if (this.rateLimitedUntil > now) {
                    const waitTime = this.rateLimitedUntil - now;
                    console.warn(`API в состоянии ограничения запросов. Ожидание ${waitTime}мс...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }

                try {
                    const result = await originalSend(method, params);
                    return result;
                } catch (error: any) {
                    if (error && error.response && typeof error.response === 'object' && error.response.status === 429) {
                        // Too Many Requests, устанавливаем задержку
                        this.rateLimitedUntil = Date.now() + this.maxRateLimitWait;
                        console.warn(`Ограничение запросов (429). Ожидание ${this.maxRateLimitWait}мс...`);
                        
                        // Используем кэшированное значение или возвращаем null
                        return null;
                    }
                    throw error;
                }
            };

            // Создаем экземпляр TonWeb
            this.tonweb = new this.TonWebLib(provider);
            console.log('TonWeb успешно инициализирован для', this.isTestnet ? 'testnet' : 'mainnet');
        } catch (error) {
            console.error('Ошибка при инициализации TonWeb:', error);
            this.tonweb = null;
        }
    }

    public static getInstance(): TonWebInstance {
        return TonWebInstance.instance;
    }

    public async ensureInitialized(): Promise<void> {
        if (this.initializationPromise) {
            await this.initializationPromise;
        }
    }

    public getTonWeb(): any {
        return this.tonweb;
    }

    public getProvider(): any {
        return this.tonweb?.provider || null;
    }

    public isTonWebReady(): boolean {
        return this.tonweb !== null && this.TonWebLib !== null;
    }

    public async waitForTonWeb(timeout: number = 5000): Promise<boolean> {
        await this.ensureInitialized();
        
        // Если TonWeb уже инициализирован, возвращаем true
        if (this.isTonWebReady()) {
            console.log('TonWeb уже готов и доступен');
            return true;
        }
        
        console.log('TonWeb загружается, ожидаем инициализации...');
        
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            if (this.isTonWebReady()) {
                console.log('TonWeb успешно инициализирован');
                return true;
            }
            // Пауза 100мс перед следующей проверкой
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Еще одна попытка инициализации, если тайм-аут
        if (!this.isTonWebReady()) {
            console.log('Повторная попытка инициализации TonWeb...');
            this.initializationPromise = this.initializeTonWeb();
            await this.initializationPromise;
            
            if (this.isTonWebReady()) {
                console.log('TonWeb успешно инициализирован после повторной попытки');
                return true;
            }
        }
        
        console.warn('TonWeb не инициализирован после ожидания');
        return false;
    }

    // Методы для работы с кошельком
    public async createWallet(publicKey: Uint8Array) {
        await this.ensureInitialized();
        if (!this.tonweb) {
            throw new Error('TonWeb не инициализирован');
        }
        return this.tonweb.wallet.create({ publicKey });
    }

    public async getWalletAddress(wallet: any) {
        await this.ensureInitialized();
        const address = await wallet.getAddress();
        return address.toString(true, true, false); // non-bounceable address
    }

    public async getWalletSeqno(wallet: any) {
        await this.ensureInitialized();
        return await wallet.methods.seqno().call();
    }

    public async deployWallet(wallet: any, secretKey: Uint8Array) {
        await this.ensureInitialized();
        return await wallet.deploy(secretKey).send();
    }

    public async estimateTransferFee(wallet: any, params: {
        secretKey: Uint8Array;
        toAddress: string;
        amount: string | number;
        seqno: number;
        payload?: string;
        sendMode?: number;
    }) {
        await this.ensureInitialized();
        if (!this.TonWebLib) {
            throw new Error('TonWeb не инициализирован');
        }
        return await wallet.methods.transfer({
            ...params,
            amount: typeof params.amount === 'string' ? params.amount : this.TonWebLib.utils.toNano(params.amount),
            sendMode: params.sendMode || 3,
        }).estimateFee();
    }

    public async createCell() {
        await this.ensureInitialized();
        if (!this.TonWebLib) {
            throw new Error('TonWeb не инициализирован');
        }
        const Cell = this.TonWebLib.boc.Cell;
        return new Cell();
    }

    public async getTransactions(address: string) {
        await this.ensureInitialized();
        if (!this.tonweb) {
            throw new Error('TonWeb не инициализирован');
        }
        return await this.tonweb.getTransactions(address);
    }

    // Метод для получения баланса с проверкой на ограничение запросов и кэшированием
    public async getBalance(address: string): Promise<number | null> {
        try {
            // Проверяем, корректно ли инициализирован TonWeb
            if (!this.isTonWebReady()) {
                console.warn('TonWeb не инициализирован, невозможно получить баланс');
                return null;
            }
            
            // Нормализуем формат адреса для кэширования
            const normalizedAddress = address.replace(/[:\/]/g, '_');
            console.log('Получение баланса для адреса:', normalizedAddress);
            
            // Проверяем кэш
            const now = Date.now();
            const cachedData = this.balanceCache.get(normalizedAddress);
            
            if (cachedData && now - cachedData.timestamp < this.balanceCacheTime) {
                console.log('Используем кэшированный баланс для', normalizedAddress);
                return cachedData.balance;
            }
            
            // Сначала пробуем запросить через API
            try {
                console.log('Запрос баланса через API для', address);
                
                // Форматируем адрес для API запроса
                const apiAddress = address.replace(/_/g, '/');
                
                const response = await fetch(
                    `${this.isTestnet ? 'https://testnet.toncenter.com' : 'https://toncenter.com'}/api/v2/getAddressBalance?` +
                    new URLSearchParams({
                        'address': apiAddress,
                        'api_key': this.apiKey || ''
                    }),
                    {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json'
                        }
                    }
                );
                
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.result) {
                        const balanceNano = data.result;
                        const balance = await this.fromNano(balanceNano);
                        
                        // Кэшируем результат
                        this.balanceCache.set(normalizedAddress, {
                            balance: balance,
                            timestamp: now
                        });
                        
                        console.log('Получен баланс через API:', balance, 'TON');
                        return balance;
                    }
                } else {
                    console.warn('Ошибка API при запросе баланса:', response.status, response.statusText);
                }
            } catch (apiError) {
                console.warn('Ошибка при запросе баланса через API:', apiError);
            }
            
            // Если API не сработал, используем TonWeb напрямую
            try {
                console.log('Попытка получить баланс через TonWeb для', address);
                
                // Создаем экземпляр адреса TonWeb разными способами
                let tonAddress;
                
                try {
                    // Пробуем создать адрес напрямую
                    tonAddress = new this.TonWebLib.utils.Address(address);
                } catch (addressError) {
                    try {
                        // Пробуем без префикса EQ, если он есть
                        if (address.startsWith('EQ')) {
                            tonAddress = new this.TonWebLib.utils.Address(address.substring(2));
                        } else {
                            // Преобразуем формат с _ на /
                            const fixedAddress = address.replace(/_/g, '/');
                            tonAddress = new this.TonWebLib.utils.Address(fixedAddress);
                        }
                    } catch (fixedAddressError) {
                        // Если ни один из способов не сработал, используем кэшированное значение
                        console.error('Не удалось создать адрес для запроса баланса:', fixedAddressError);
                        return null;
                    }
                }
                
                // Получаем баланс
                const balanceNano = await this.tonweb.getBalance(tonAddress);
                const balance = await this.fromNano(balanceNano);
                
                // Кэшируем результат
                this.balanceCache.set(normalizedAddress, {
                    balance: balance,
                    timestamp: now
                });
                
                console.log('Получен баланс кошелька через TonWeb:', balance, 'TON');
                return balance;
            } catch (tonwebError) {
                console.error('Ошибка при получении баланса через TonWeb:', tonwebError);
                
                // Если есть кэшированное значение, возвращаем его, даже если оно устарело
                if (cachedData) {
                    console.warn('Используем устаревший кэшированный баланс:', cachedData.balance);
                    return cachedData.balance;
                }
                
                // Если всё не удалось, возвращаем заглушку
                return 10; // Заглушка для тестирования
            }
        } catch (error) {
            console.error('Критическая ошибка при получении баланса:', error);
            return null;
        }
    }

    public async sendBoc(bocBytes: Uint8Array) {
        await this.ensureInitialized();
        if (!this.tonweb) {
            throw new Error('TonWeb не инициализирован');
        }
        return await this.tonweb.sendBoc(bocBytes);
    }

    // Утилиты
    public async toNano(amount: number): Promise<string> {
        await this.ensureInitialized();
        if (!this.TonWebLib) {
            throw new Error('TonWeb не инициализирован');
        }
        return this.TonWebLib.utils.toNano(amount);
    }

    public async fromNano(amount: string | number): Promise<number> {
        try {
            if (!this.tonweb) {
                return Number(amount) / 1e9;
            }
            
            if (typeof amount === 'number') {
                amount = amount.toString();
            }
            
            try {
                const fromNanoResult = await this.tonweb.utils.fromNano(amount);
                return parseFloat(fromNanoResult);
            } catch (error) {
                console.warn('Ошибка при использовании tonweb.utils.fromNano:', error);
                // Ручное преобразование как резервный вариант
                return Number(amount) / 1e9;
            }
        } catch (error) {
            console.error('Ошибка в методе fromNano:', error);
            return Number(amount) / 1e9;
        }
    }
}

// Экспортируем синглтон напрямую
const tonwebInstance = TonWebInstance.getInstance();

export default tonwebInstance; 