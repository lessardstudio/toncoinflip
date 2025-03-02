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

export class TonWebHelper {
    private static instance: TonWebHelper | null = null;
    private TonWebLib: any = null;
    private tonweb: any = null;
    private isTestnet: boolean = false;
    private apiKey: string | null = null;
    private initializationPromise: Promise<void> | null = null;
    private initializationStatus: 'idle' | 'pending' | 'success' | 'error' = 'idle';
    private loadedScript: HTMLScriptElement | null = null;
    private rateLimitedUntil: number = 0;
    private maxRateLimitWait: number = 10000; // 10 секунд максимальная задержка
    private balanceCache: Map<string, CachedBalance> = new Map();
    private balanceCacheTime: number = 60000; // 1 минута

    /**
     * Получить единственный экземпляр TonWebHelper (Singleton)
     */
    public static getInstance(): TonWebHelper {
        if (!TonWebHelper.instance) {
            TonWebHelper.instance = new TonWebHelper();
        }
        return TonWebHelper.instance;
    }
    
    /**
     * Проверяет, готов ли TonWeb к использованию
     */
    public isTonWebReady(): boolean {
        return !!this.tonweb && !!this.TonWebLib;
    }
    
    /**
     * Проверяет доступность TonWeb в любом контексте
     */
    public static isTonWebAvailable(): boolean {
        if (typeof window !== 'undefined') {
            // Проверяем наличие в окне
            if ((window as any).TonWeb) {
                return true;
            }
        }
        
        // Проверяем наличие у singleton экземпляра
        if (TonWebHelper.instance && TonWebHelper.instance.isTonWebReady()) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Возвращает сырой объект TonWeb для прямого доступа к API
     */
    public getTonWeb(): any {
        if (!this.isTonWebReady()) {
            console.warn('getTonWeb: TonWeb не инициализирован, возвращаем null');
            return null;
        }
        return this.tonweb;
    }
    
    /**
     * Возвращает библиотеку TonWeb для статического доступа
     */
    public getTonWebLib(): any {
        if (!this.TonWebLib) {
            console.warn('getTonWebLib: TonWeb библиотека не загружена, возвращаем null');
            return null;
        }
        return this.TonWebLib;
    }
    
    /**
     * Возвращает статус инициализации TonWeb
     */
    public getInitializationStatus(): 'idle' | 'pending' | 'success' | 'error' {
        return this.initializationStatus;
    }
    
    /**
     * Возвращает промис инициализации TonWeb или создает новый
     */
    public async ensureInitialized(): Promise<void> {
        if (this.initializationPromise) {
            try {
                await this.initializationPromise;
            } catch (error) {
                console.error('Ошибка в существующем промисе инициализации:', error);
                // Сбрасываем промис, чтобы можно было повторить инициализацию
                this.initializationPromise = null;
                this.initializationStatus = 'error';
            }
        }
        
        if (!this.initializationPromise) {
            this.initializationPromise = this.initializeTonWeb();
        }
        
        return this.initializationPromise;
    }

    private constructor() {
        // Инициализируем базовые настройки
        this.isTestnet = this.getIsTestnet();
        this.apiKey = this.getApiKey();
        
        // Если в браузере, сразу пробуем загрузить TonWeb в DOM
        if (typeof document !== 'undefined') {
            try {
                this.loadTonWebInDOM().catch(error => {
                    console.warn('Ошибка при автоматической загрузке TonWeb в DOM:', error);
                });
            } catch (error) {
                console.warn('Не удалось запустить автоматическую загрузку TonWeb:', error);
            }
        }
        
        // Запускаем асинхронную инициализацию
        this.initializationPromise = this.initializeTonWeb();
        
        // Бэкап: запускаем через 3 секунды повторную инициализацию, если первая не завершилась
        setTimeout(() => {
            if (this.initializationStatus !== 'success' && this.initializationStatus !== 'pending') {
                console.warn('Автоматическая инициализация не завершилась, запускаем повторную...');
                // Сбрасываем состояние
                this.initializationPromise = null;
                // Повторно запускаем
                this.initializationPromise = this.initializeTonWeb();
            }
        }, 3000);
    }

    /**
     * Инициализирует TonWeb, загружая библиотеку и создавая экземпляр
     */
    private async initializeTonWeb(): Promise<void> {
        // Если уже инициализировано, возвращаем сразу
        if (this.isTonWebReady()) {
            this.initializationStatus = 'success';
            return;
        }
        
        this.initializationStatus = 'pending';
        
        try {
            // Если TonWeb уже доступен в окне, используем его
            if (typeof window !== 'undefined' && (window as any).TonWeb) {
                console.log('Используем TonWeb из глобального объекта window');
                this.TonWebLib = (window as any).TonWeb;
            } else {
                // Иначе пробуем динамически импортировать
                console.log('Пробуем динамически импортировать TonWeb');
                
                try {
                    // Попытка 1: Динамический импорт через ES модули
                    const TonWebModule = await import('tonweb');
                    this.TonWebLib = TonWebModule.default;
                    console.log('TonWeb успешно импортирован как ES модуль');
                } catch (importError) {
                    console.warn('Ошибка при импорте TonWeb как ES модуль:', importError);
                    
                    try {
                        // Попытка 2: Загрузка через DOM если есть window
                        if (typeof window !== 'undefined') {
                            console.log('Пробуем загрузить TonWeb через DOM');
                            await this.loadTonWebInDOM();
                            
                            // Проверяем, доступен ли TonWeb после загрузки скрипта
                            if ((window as any).TonWeb) {
                                this.TonWebLib = (window as any).TonWeb;
                                console.log('TonWeb успешно загружен через DOM');
                            } else {
                                throw new Error('TonWeb не доступен после загрузки скрипта');
                            }
                        } else {
                            throw new Error('window не определен, не можем загрузить скрипт');
                        }
                    } catch (scriptError) {
                        console.error('Все методы загрузки TonWeb завершились с ошибкой:', scriptError);
                        this.initializationStatus = 'error';
                        throw new Error(`Не удалось загрузить TonWeb: ${scriptError}`);
                    }
                }
            }
            
            // Если библиотека не загружена после всех попыток, выбрасываем ошибку
            if (!this.TonWebLib) {
                this.initializationStatus = 'error';
                throw new Error('TonWeb библиотека не была загружена ни одним из способов');
            }
            
            // Инициализируем API ключ и тестовую сеть
            this.isTestnet = this.getIsTestnet();
            this.apiKey = this.getApiKey();
            
            // Создаем провайдера
            let provider;
            try {
                provider = this.createProvider();
                console.log('Провайдер успешно создан', {
                    isTestnet: this.isTestnet,
                    hasApiKey: !!this.apiKey
                });
            } catch (providerError) {
                console.error('Ошибка при создании провайдера:', providerError);
                this.initializationStatus = 'error';
                throw new Error(`Не удалось создать провайдера: ${providerError}`);
            }
            
            // Создаем экземпляр TonWeb
            try {
                this.tonweb = new this.TonWebLib(provider);
                console.log('Экземпляр TonWeb успешно создан');
                this.initializationStatus = 'success';
            } catch (instanceError) {
                console.error('Ошибка при создании экземпляра TonWeb:', instanceError);
                this.initializationStatus = 'error';
                throw new Error(`Не удалось создать экземпляр TonWeb: ${instanceError}`);
            }
        } catch (error) {
            console.error('Ошибка инициализации TonWeb:', error);
            this.initializationStatus = 'error';
            throw error;
        }
    }

    public getProvider(): any {
        return this.tonweb?.provider || null;
    }

    public isInTestnetMode(): boolean {
        return this.isTestnet;
    }

    public async waitForTonWeb(timeout?: number): Promise<boolean> {
        // Получаем значение таймаута из настроек или используем переданное значение
        const configTimeout = parseInt(import.meta.env.VITE_TONWEB_TIMEOUT || '5000', 10);
        const effectiveTimeout = timeout || configTimeout;
        
        // Если TonWeb уже инициализирован, быстро возвращаем true
        if (this.isTonWebReady()) {
            console.log('TonWeb уже готов и доступен');
            return true;
        }
        
        try {
            // Проверяем, доступен ли TonWeb уже в window
            if (typeof window !== 'undefined' && (window as any).TonWeb) {
                console.log('TonWeb найден в глобальном контексте window');
                this.TonWebLib = (window as any).TonWeb;
                
                if (!this.tonweb && this.TonWebLib) {
                    // Создаем экземпляр TonWeb
                    await this.initializeTonWeb();
                }
                
                if (this.isTonWebReady()) {
                    console.log('TonWeb успешно инициализирован из глобального контекста');
                    return true;
                }
            }
            
            // Запускаем асинхронную инициализацию, если она еще не запущена
            if (!this.initializationPromise) {
                console.log('Запускаем асинхронную инициализацию TonWeb');
                this.initializationPromise = this.initializeTonWeb();
            }
            
            // Ожидаем завершения инициализации
            await this.ensureInitialized();
            
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
                
                // Если TonWeb появился в window, используем его
                if (typeof window !== 'undefined' && (window as any).TonWeb && !this.TonWebLib) {
                    console.log('TonWeb обнаружен в window во время ожидания');
                    this.TonWebLib = (window as any).TonWeb;
                    
                    // Пробуем создать новый экземпляр
                    try {
                        await this.initializeTonWeb();
                        if (this.isTonWebReady()) {
                            console.log('TonWeb успешно инициализирован из window во время ожидания');
                            return true;
                        }
                    } catch (windowInitError) {
                        console.error('Ошибка инициализации из window:', windowInitError);
                    }
                }
                
                // Небольшая пауза перед следующей проверкой
                await new Promise(resolve => setTimeout(resolve, checkInterval));
            }
            
            // Проверяем, были ли установлены необходимые свойства в разные моменты инициализации
            if (this.tonweb && !this.TonWebLib && typeof window !== 'undefined' && (window as any).TonWeb) {
                this.TonWebLib = (window as any).TonWeb;
                console.log('TonWeb библиотека обнаружена в window после ожидания');
                return true;
            }
            
            if (!this.tonweb && this.TonWebLib) {
                console.log('TonWeb библиотека есть, но не создан экземпляр, пробуем создать');
                try {
                    await this.initializeTonWeb();
                    if (this.isTonWebReady()) {
                        console.log('TonWeb успешно инициализирован после дополнительной попытки');
                        return true;
                    }
                } catch (initError) {
                    console.error('Ошибка при дополнительной инициализации:', initError);
                }
            }
            
            // Последний шанс - пробуем загрузить библиотеку через скрипт
            console.warn(`Тайм-аут ожидания TonWeb (${effectiveTimeout}мс). Пробуем загрузить через скрипт...`);
            
            try {
                // Сбрасываем предыдущее состояние
                this.TonWebLib = null;
                this.tonweb = null;
                this.initializationPromise = null;
                
                // Пробуем загрузить через DOM
                await this.loadTonWebInDOM();
                
                // Если после загрузки скрипта TonWeb появился, используем его
                if (typeof window !== 'undefined' && (window as any).TonWeb) {
                    this.TonWebLib = (window as any).TonWeb;
                    await this.initializeTonWeb();
                    if (this.isTonWebReady()) {
                        console.log('TonWeb успешно инициализирован после загрузки через скрипт');
                        return true;
                    }
                }
            } catch (scriptError) {
                console.error('Ошибка при загрузке TonWeb через скрипт:', scriptError);
            }
            
            console.error(`TonWeb не удалось инициализировать в указанный таймаут (${effectiveTimeout}мс) после всех попыток`);
            return false;
        } catch (error) {
            console.error('Критическая ошибка в методе waitForTonWeb:', error);
            return false;
        }
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

    /**
     * Загрузка TonWeb через скрипт в DOM
     */
    public async loadTonWebInDOM(): Promise<boolean> {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            console.error('loadTonWebInDOM: window или document не определены');
            return false;
        }
        
        // Проверяем, есть ли уже TonWeb
        if ((window as any).TonWeb) {
            console.log('TonWeb уже загружен в window');
            return true;
        }
        
        // Проверяем, загружен ли скрипт уже
        if (this.loadedScript) {
            console.log('Скрипт TonWeb уже был загружен ранее');
            // Ждем загрузку, если скрипт уже добавлен
            return new Promise<boolean>((resolve) => {
                const checkTonWeb = () => {
                    if ((window as any).TonWeb) {
                        console.log('TonWeb появился в window');
                        resolve(true);
                    } else {
                        setTimeout(checkTonWeb, 100);
                    }
                };
                
                checkTonWeb();
            });
        }
        
        return new Promise<boolean>((resolve, reject) => {
            // Получаем URL скрипта из переменных окружения, либо используем CDN
            const scriptUrl = import.meta.env.VITE_TONWEB_SCRIPT_URL || 
                'https://cdn.jsdelivr.net/npm/tonweb@0.0.62/dist/tonweb.js';
                
            try {
                // Создаем элемент script
                const script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = scriptUrl;
                script.async = true;
                script.defer = true;
                
                // Обработчики загрузки и ошибки
                script.onload = () => {
                    console.log(`TonWeb скрипт успешно загружен из ${scriptUrl}`);
                    this.loadedScript = script;
                    
                    if ((window as any).TonWeb) {
                        console.log('TonWeb доступен в window после загрузки скрипта');
                        this.TonWebLib = (window as any).TonWeb;
                        resolve(true);
                    } else {
                        console.error('Скрипт загрузился, но TonWeb не найден в window');
                        reject(new Error('TonWeb не найден в window после загрузки скрипта'));
                    }
                };
                
                script.onerror = (error) => {
                    console.error(`Ошибка загрузки скрипта TonWeb из ${scriptUrl}:`, error);
                    reject(new Error(`Не удалось загрузить скрипт TonWeb: ${error}`));
                };
                
                // Добавляем скрипт в DOM
                document.head.appendChild(script);
                console.log(`Скрипт TonWeb добавлен в DOM из ${scriptUrl}`);
            } catch (error) {
                console.error('Ошибка при добавлении скрипта TonWeb в DOM:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Получает значение isTestnet из конфигурации
     */
    private getIsTestnet(): boolean {
        return import.meta.env.VITE_IS_TESTNET === 'true';
    }
    
    /**
     * Получает API ключ из конфигурации
     */
    private getApiKey(): string | null {
        return import.meta.env.VITE_TONCENTER_API_KEY || null;
    }
    
    /**
     * Создает провайдера для TonWeb
     */
    private createProvider(): any {
        if (!this.TonWebLib) {
            throw new Error('TonWebLib не инициализирован, невозможно создать провайдера');
        }
        
        // Получаем URL API в зависимости от выбранной сети
        const endpoint = this.isTestnet
            ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
            : 'https://toncenter.com/api/v2/jsonRPC';
        
        // Настраиваем опции провайдера
        const providerOptions: any = {
            retry: 3 // Количество повторных попыток для запросов
        };
        
        // Добавляем API ключ, если он доступен
        if (this.apiKey) {
            providerOptions.apiKey = this.apiKey;
        }
        
        // Создаем HTTP-провайдера
        const httpProvider = new this.TonWebLib.HttpProvider(endpoint, providerOptions);
        
        // Сохраняем оригинальный метод отправки
        httpProvider.sendOriginal = httpProvider.send;
        
        // Переопределяем метод отправки для обработки ошибок
        httpProvider.send = async (method: string, params: any) => {
            const startTime = Date.now();
            try {
                // Проверяем, не находимся ли мы в периоде ожидания из-за ограничения запросов
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
        
        return httpProvider;
    }
}

// Экспортируем синглтон напрямую
const tonwebInstance = TonWebHelper.getInstance();

export default tonwebInstance; 