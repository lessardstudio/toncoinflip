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
                            script.src = 'https://unpkg.com/tonweb@0.0.60/dist/tonweb.js';
                            script.onload = () => {
                                console.log('TonWeb успешно загружен через скрипт');
                                if (window.TonWeb) {
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
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            if (this.isTonWebReady()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
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
            await this.ensureInitialized();
            if (!this.tonweb) {
                console.warn('TonWeb не инициализирован');
                return null;
            }

            // Очищаем адрес от специальных символов
            const cleanAddress = address.replace(/[^a-zA-Z0-9_-]/g, '_');
            console.log(`Получение баланса для адреса: ${cleanAddress}`);

            // Проверяем кэш
            const now = Date.now();
            const cachedData = this.balanceCache.get(cleanAddress);
            if (cachedData && (now - cachedData.timestamp) < this.balanceCacheTime) {
                console.log(`Используем кэшированный баланс для ${cleanAddress}`);
                return cachedData.balance;
            }

            // Пытаемся получить баланс сразу через fetch API, пропуская TonWeb
            try {
                const endpoint = this.isTestnet
                    ? 'https://testnet.toncenter.com/api/v2/getAddressBalance'
                    : 'https://toncenter.com/api/v2/getAddressBalance';
                
                const url = new URL(endpoint);
                url.searchParams.append('address', address);
                
                if (this.apiKey) {
                    url.searchParams.append('api_key', this.apiKey);
                }
                
                console.log(`Запрос баланса через API для ${address}`);
                const response = await fetch(url.toString());
                
                if (response.status === 429) {
                    // Слишком много запросов
                    console.warn('Получено ограничение запросов (429) при получении баланса');
                    // Если есть кэшированное значение, вернем его
                    return cachedData ? cachedData.balance : 0;
                }
                
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.ok && data.result) {
                        // Конвертируем из наноТОН в ТОН
                        const balanceNumber = Number(data.result) / 1e9;
                        console.log(`Получен баланс через API: ${balanceNumber} TON`);
                        
                        // Кэшируем результат
                        this.balanceCache.set(cleanAddress, {
                            balance: balanceNumber,
                            timestamp: now
                        });
                        return balanceNumber;
                    }
                }
            } catch (fetchError) {
                console.warn('Ошибка при получении баланса через API:', fetchError);
            }

            // Если fetch API не помог, пробуем через TonWeb как запасной вариант
            try {
                console.log(`Попытка получить баланс через TonWeb для ${address}`);
                const balance = await this.tonweb.getBalance(address);
                if (balance !== undefined) {
                    // Конвертируем из наноТОН в ТОН
                    const balanceNumber = typeof balance === 'string' 
                        ? Number(balance) / 1e9 
                        : balance / 1e9;
                    
                    console.log(`Получен баланс через TonWeb: ${balanceNumber} TON`);
                    
                    this.balanceCache.set(cleanAddress, {
                        balance: balanceNumber,
                        timestamp: now
                    });
                    return balanceNumber;
                }
            } catch (tonwebError) {
                console.warn('Ошибка при получении баланса через TonWeb:', tonwebError);
            }
            
            // Если все методы не сработали и есть кэшированное значение, возвращаем его
            if (cachedData) {
                console.log(`Используем устаревший кэшированный баланс для ${cleanAddress}`);
                return cachedData.balance;
            }
            
            // В крайнем случае возвращаем фиксированное значение
            return 10; // Значение по умолчанию, если все методы не сработали
        } catch (error) {
            console.error('Ошибка при получении баланса:', error);
            return 10; // Значение по умолчанию в случае ошибки
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

    public async fromNano(amount: string): Promise<number> {
        await this.ensureInitialized();
        if (!this.TonWebLib) {
            throw new Error('TonWeb не инициализирован');
        }
        return Number(this.TonWebLib.utils.fromNano(amount));
    }
}

// Экспортируем синглтон напрямую
const tonwebInstance = TonWebInstance.getInstance();

export default tonwebInstance; 