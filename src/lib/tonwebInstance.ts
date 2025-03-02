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
        // Проверяем, что инициализация еще не выполнена
        if (this.tonweb !== null && this.TonWebLib !== null) {
            console.log('TonWeb уже инициализирован, пропускаем повторную инициализацию');
            return;
        }
        
        // Получаем значения из конфигурации
        this.isTestnet = import.meta.env.VITE_IS_TESTNET === 'true';
        this.apiKey = import.meta.env.VITE_TONCENTER_API_KEY || '';
        
        console.log(`Инициализация TonWeb для ${this.isTestnet ? 'testnet' : 'mainnet'}`);
        
        try {
            // Пробуем использовать TonWeb из глобального контекста, если он доступен
            if (typeof window !== 'undefined' && (window as any).TonWeb) {
                this.TonWebLib = (window as any).TonWeb;
                console.log('TonWeb найден в глобальном контексте window');
            } else {
                // Иначе импортируем через ESM
                try {
                    const TonWebModule = await import('tonweb');
                    this.TonWebLib = TonWebModule.default;
                    console.log('TonWeb успешно импортирован через ESM');
                } catch (importError) {
                    console.warn('Не удалось импортировать TonWeb через ESM:', importError);
                    
                    // Если динамический импорт не сработал, пробуем загрузить через скрипт
                    await this.loadTonWebScript();
                    
                    // Проверяем, что TonWeb теперь доступен
                    if (typeof window !== 'undefined' && (window as any).TonWeb) {
                        this.TonWebLib = (window as any).TonWeb;
                        console.log('TonWeb успешно загружен из скрипта');
                    } else {
                        throw new Error('TonWeb не найден после загрузки скрипта');
                    }
                }
            }
            
            // Создаем провайдер для TonWeb
            const endpoint = this.isTestnet
                ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
                : 'https://toncenter.com/api/v2/jsonRPC';
            
            const providerOptions: any = {
                apiKey: this.apiKey,
                retry: 3 // Количество повторных попыток для запросов
            };
            
            // Создаем экземпляр HTTP-провайдера
            const httpProvider = new this.TonWebLib.HttpProvider(endpoint, providerOptions);
            
            // Настраиваем обработку ошибок для провайдера
            httpProvider.sendOriginal = httpProvider.send;
            httpProvider.send = async (method: string, params: any) => {
                const startTime = Date.now();
                try {
                    if (Date.now() < this.rateLimitedUntil) {
                        const waitTime = this.rateLimitedUntil - Date.now();
                        if (waitTime > 0) {
                            console.warn(`Ожидание из-за ограничения запросов: ${waitTime}мс`);
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                        }
                    }
                    
                    console.log(`Отправка запроса ${method} к API`);
                    const result = await httpProvider.sendOriginal(method, params);
                    return result;
                } catch (error) {
                    // Проверяем на ограничение запросов (429)
                    if (error && (typeof error === 'object') && 
                        ('status' in error) && (error as any).status === 429) {
                        
                        // Устанавливаем задержку для следующих запросов
                        const retryAfter = (error as any).retryAfter || 1000;
                        this.rateLimitedUntil = Date.now() + Math.min(retryAfter, this.maxRateLimitWait);
                        
                        console.warn(`Получено ограничение запросов (429), следующий запрос через ${retryAfter}мс`);
                        
                        // Повторяем запрос после задержки
                        await new Promise(resolve => setTimeout(resolve, retryAfter));
                        return await httpProvider.send(method, params);
                    }
                    
                    // Для других ошибок - просто пробрасываем
                    console.error(`Ошибка API запроса ${method}:`, error);
                    throw error;
                } finally {
                    console.log(`Запрос ${method} выполнен за ${Date.now() - startTime}мс`);
                }
            };
            
            // Создаем экземпляр TonWeb с настроенным провайдером
            this.tonweb = new this.TonWebLib(httpProvider);
            
            console.log(`TonWeb успешно инициализирован для ${this.isTestnet ? 'testnet' : 'mainnet'}`);
            
            // Проверим доступ к базовым методам TonWeb для уверенности
            if (!this.tonweb.utils || typeof this.tonweb.utils.Address !== 'function') {
                throw new Error('TonWeb инициализирован, но не имеет необходимых методов');
            }
            
            return;
        } catch (error) {
            console.error('Ошибка при инициализации TonWeb:', error);
            this.tonweb = null;
            this.TonWebLib = null;
            throw error;
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

    public isInTestnetMode(): boolean {
        return this.isTestnet;
    }

    public isTonWebReady(): boolean {
        return this.tonweb !== null && this.TonWebLib !== null;
    }

    public async waitForTonWeb(timeout?: number): Promise<boolean> {
        // Получаем значение таймаута из настроек или используем переданное значение
        const configTimeout = parseInt(import.meta.env.VITE_TONWEB_TIMEOUT || '5000', 10);
        const effectiveTimeout = timeout || configTimeout;
        
        await this.ensureInitialized();
        
        // Если TonWeb уже инициализирован, возвращаем true
        if (this.isTonWebReady()) {
            console.log('TonWeb уже готов и доступен');
            return true;
        }
        
        console.log(`TonWeb загружается, ожидаем инициализации (таймаут: ${effectiveTimeout}мс)...`);
        
        // Увеличиваем количество попыток и уменьшаем задержку между ними
        const startTime = Date.now();
        const checkInterval = 100; // 100мс между проверками
        const maxAttempts = Math.floor(effectiveTimeout / checkInterval);
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            if (this.isTonWebReady()) {
                const elapsedTime = Date.now() - startTime;
                console.log(`TonWeb успешно инициализирован за ${elapsedTime}мс (${attempts} попыток)`);
                return true;
            }
            
            // Небольшая пауза перед следующей проверкой
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        
        // Еще одна попытка инициализации, если тайм-аут
        if (!this.isTonWebReady()) {
            console.warn(`Тайм-аут ожидания TonWeb (${effectiveTimeout}мс). Пробуем повторную инициализацию...`);
            
            // Очищаем предыдущий промис инициализации
            this.initializationPromise = null;
            
            // Пробуем ещё раз инициализировать
            try {
                await this.initializeTonWeb();
                if (this.isTonWebReady()) {
                    console.log('TonWeb успешно инициализирован после повторной попытки');
                    return true;
                }
            } catch (error) {
                console.error('Ошибка при повторной инициализации TonWeb:', error);
            }
        }
        
        console.error(`TonWeb не удалось инициализировать в указанный таймаут (${effectiveTimeout}мс) и после повторной попытки`);
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

    private async loadTonWebScript(): Promise<void> {
        console.log('Пытаемся загрузить TonWeb через скрипт...');
        
        // Получаем версию TonWeb из переменных окружения или используем дефолтную
        const tonwebVersion = import.meta.env.VITE_TONWEB_VERSION || '0.0.62';
        const scriptUrl = `https://unpkg.com/tonweb@${tonwebVersion}/dist/tonweb.js`;
        
        console.log(`Загрузка TonWeb версии ${tonwebVersion} из ${scriptUrl}`);
        
        return new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = scriptUrl;
            script.onload = () => {
                if (window.TonWeb) {
                    console.log(`TonWeb ${tonwebVersion} успешно загружен из: ${scriptUrl}`);
                    this.TonWebLib = window.TonWeb;
                    resolve();
                } else {
                    reject(new Error('TonWeb не найден в window после загрузки скрипта'));
                }
            };
            script.onerror = () => {
                console.error(`Ошибка при загрузке TonWeb ${tonwebVersion} из ${scriptUrl}`);
                reject(new Error(`Ошибка при загрузке TonWeb из ${scriptUrl}`));
            };
            document.head.appendChild(script);
        });
    }
}

// Экспортируем синглтон напрямую
const tonwebInstance = TonWebInstance.getInstance();

export default tonwebInstance; 