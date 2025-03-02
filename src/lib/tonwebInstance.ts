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

class TonWebInstance {
    private static instance: TonWebInstance | null = null;
    private tonweb: any | null = null;
    private tonwebModule: any | null = null;
    
    // Приватный конструктор для предотвращения создания через new
    private constructor() {
        this.initTonWeb();
    }
    
    private async initTonWeb() {
        try {
            // Используем только глобальный объект TonWeb, так как require и импорт вызывают проблемы
            if (window.TonWeb) {
                this.tonwebModule = window.TonWeb;
                console.log("TonWeb успешно загружен из глобального объекта window.TonWeb");
            } else {
                console.error("TonWeb не доступен глобально. Убедитесь, что скрипт tonweb.js правильно подключен в index.html");
                return;
            }

            // Получаем эндпоинт и API ключ из переменных окружения
            const apiKey = import.meta.env.VITE_TON_API_KEY || '';
            
            // Проверяем несколько возможных переменных для определения тестовой сети
            const networkVar = import.meta.env.VITE_TON_NETWORK || '';
            let isTestnet = 
                import.meta.env.VITE_IS_TESTNET === 'true' || 
                import.meta.env.VITE_TESTNET === 'true' || 
                networkVar.toLowerCase() === 'testnet';
                
            console.log("Определение сети TonWeb:", {
                networkVar,
                isTestnet,
                VITE_IS_TESTNET: import.meta.env.VITE_IS_TESTNET,
                VITE_TESTNET: import.meta.env.VITE_TESTNET, 
                VITE_TON_NETWORK: import.meta.env.VITE_TON_NETWORK
            });
            
            // Принудительно используем testnet для разработки
            const forceTestnet = true;
            if (forceTestnet) {
                console.log("Принудительное использование testnet для TonWeb");
                isTestnet = true;
            }
            
            // Выбираем локальный прокси-эндпоинт в зависимости от сети
            // Используем локальный прокси, настроенный в vite.config.ts
            const endpoint = isTestnet 
                ? '/testnet-toncenter/jsonRPC' 
                : '/toncenter/jsonRPC';
            
            console.log(`Инициализируем TonWeb с локальным прокси: ${endpoint} (${isTestnet ? 'testnet' : 'mainnet'})`);
            console.log(`Используется API ключ: ${apiKey ? 'Да' : 'Нет'}`);
            
            // Проверяем доступность TonWeb
            if (!this.tonwebModule) {
                throw new Error("TonWeb не определен");
            }

            // Проверяем наличие HttpProvider в TonWeb
            const TonWebClass = this.tonwebModule;
            if (!TonWebClass.HttpProvider) {
                console.error("HttpProvider не найден в TonWeb:", TonWebClass);
                console.log("Доступные свойства TonWeb:", Object.keys(TonWebClass));
                throw new Error("HttpProvider не найден в TonWeb");
            }
            
            // Создаем провайдера TonWeb с указанием API ключа и сети
            const tonwebProvider = new TonWebClass.HttpProvider(endpoint, { apiKey });
            
            // Создаем экземпляр TonWeb
            this.tonweb = new TonWebClass(tonwebProvider);
            console.log("TonWeb успешно инициализирован");
            
            // Выполняем тестовый запрос для проверки доступности API
            await this.testApiConnection();
        } catch (error) {
            console.error("Ошибка инициализации TonWeb:", error);
            this.tonweb = null;
        }
    }
    
    // Метод для получения экземпляра синглтона
    public static getInstance(): TonWebInstance {
        if (!TonWebInstance.instance) {
            TonWebInstance.instance = new TonWebInstance();
        }
        return TonWebInstance.instance;
    }
    
    // Метод для получения экземпляра TonWeb
    public getTonWeb(): any | null {
        return this.tonweb;
    }
    
    // Проверка готовности TonWeb
    public isTonWebReady(): boolean {
        return !!this.tonweb;
    }
    
    // Ожидание инициализации TonWeb
    public async waitForTonWeb(timeoutMs: number = 5000): Promise<boolean> {
        if (this.tonweb) {
            return true;
        }
        
        return new Promise<boolean>((resolve) => {
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                if (this.tonweb) {
                    clearInterval(checkInterval);
                    resolve(true);
                    return;
                }
                
                if (Date.now() - startTime > timeoutMs) {
                    clearInterval(checkInterval);
                    console.warn(`Тайм-аут ожидания инициализации TonWeb (${timeoutMs}ms)`);
                    resolve(false);
                }
            }, 100);
        });
    }
    
    // Метод для получения баланса адреса
    public async getBalance(address: string): Promise<number | null> {
        try {
            if (!this.tonweb) {
                console.error("TonWeb не инициализирован");
                return null;
            }
            
            // Проверяем кэш с быстрым доступом
            const cacheKey = `balance_${address}`;
            const cachedBalance = localStorage.getItem(cacheKey);
            const cachedTime = parseInt(localStorage.getItem(`${cacheKey}_time`) || '0');
            const now = Date.now();
            const CACHE_LIFETIME = 5000; // 5 секунд для TonWeb-запросов
            
            // Если есть свежие данные в кэше, сразу возвращаем их
            if (cachedBalance && now - cachedTime < CACHE_LIFETIME) {
                const balanceValue = Number(cachedBalance) / 1_000_000_000;
                console.log(`Используем кэшированный баланс для ${address.slice(-6)} (TonWeb-кэш): ${balanceValue} TON`);
                
                // Проверяем на NaN даже при чтении из кэша
                if (isNaN(balanceValue)) {
                    console.error("Кэшированное значение баланса невалидно (NaN)");
                    return null;
                }
                
                return balanceValue;
            }
            
            // Проверяем, не слишком ли часто делаем запросы (глобальное ограничение)
            const lastApiCallTime = parseInt(localStorage.getItem('last_tonweb_api_call') || '0');
            const API_CALL_THROTTLE = 1000; // Минимальная пауза в 1 секунду между запросами
            
            if (now - lastApiCallTime < API_CALL_THROTTLE) {
                const waitTime = API_CALL_THROTTLE - (now - lastApiCallTime);
                console.log(`Слишком много запросов к TonWeb API. Ждем ${waitTime}мс перед следующим запросом...`);
                
                // Ждем нужное время перед запросом
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            
            // Обновляем время последнего запроса
            localStorage.setItem('last_tonweb_api_call', Date.now().toString());
            
            // Преобразуем адрес в формат, понятный TonWeb
            console.log(`Получаем баланс для адреса: ${address}`);
            
            // Преобразуем адрес в формат, понятный TonWeb если нужно
            let tonwebAddress = address;
            try {
                // Проверяем, нужно ли конвертировать адрес в формат TonWeb
                if (this.tonweb.utils && this.tonweb.utils.Address) {
                    tonwebAddress = new this.tonweb.utils.Address(address).toString(true, true, true);
                    console.log(`Адрес успешно преобразован: ${tonwebAddress}`);
                }
            } catch (addressError) {
                console.warn(`Ошибка при преобразовании адреса: ${addressError}`);
                // В случае ошибки преобразования используем исходный адрес
            }
            
            console.log(`Отправляем запрос к TonWeb API для получения баланса...`);
            
            let retryWithDirectFetch = false;
            
            try {
                const balancePromise = this.tonweb.getBalance(tonwebAddress);
                
                // Устанавливаем таймаут для запроса
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Таймаут запроса к TonWeb API')), 10000);
                });
                
                // Используем Promise.race для ограничения времени ожидания
                const balance = await Promise.race([balancePromise, timeoutPromise]) as string;
                console.log(`Получен ответ от TonWeb API: ${balance}`);
                
                // Проверяем, что мы получили валидное значение
                if (typeof balance !== 'string' && typeof balance !== 'number') {
                    throw new Error(`Неверный формат ответа от TonWeb API: ${typeof balance}`);
                }
                
                // Конвертируем в число и проверяем на NaN
                const balanceNum = Number(balance);
                if (isNaN(balanceNum)) {
                    throw new Error(`Получено невалидное числовое значение (NaN) от TonWeb API: ${balance}`);
                }
                
                // Сохраняем в кэш
                localStorage.setItem(cacheKey, balanceNum.toString());
                localStorage.setItem(`${cacheKey}_time`, now.toString());
                
                // Конвертируем из наноТОН в ТОН
                const balanceInTon = balanceNum / 1_000_000_000;
                console.log(`Получен баланс через TonWeb для ${address.slice(-6)}: ${balanceInTon} TON`);
                
                return balanceInTon;
            } catch (apiError: any) {
                // Проверяем на ошибку 429 (Too Many Requests)
                if (apiError.response && apiError.response.status === 429) {
                    console.warn("Превышен лимит запросов к TonWeb API (429 Too Many Requests)");
                    
                    // Увеличиваем время ожидания перед следующими запросами
                    const backoffTime = 5000; // 5 секунд бэкофф
                    localStorage.setItem('tonweb_api_backoff', Date.now().toString());
                    localStorage.setItem('tonweb_api_backoff_time', backoffTime.toString());
                    
                    // Отметим, что нужно попробовать прямой fetch
                    retryWithDirectFetch = true;
                } else if (apiError instanceof Error && 
                           (apiError.message.includes('CORS') || 
                            apiError.message.includes('Failed to fetch') || 
                            apiError.message.includes('Network Error'))) {
                    // В случае CORS-ошибок также пробуем прямой fetch
                    console.warn("CORS-ошибка при запросе через TonWeb, пробуем прямой запрос через fetch");
                    retryWithDirectFetch = true;
                } else {
                    // Для других ошибок просто логируем и пробуем прямой fetch как запасной вариант
                    console.error(`Ошибка TonWeb API: ${apiError}`);
                    retryWithDirectFetch = true;
                }
            }
            
            // Если необходимо, пробуем прямой запрос через fetch
            if (retryWithDirectFetch) {
                try {
                    // Формируем запрос напрямую к нашему локальному прокси
                    const endpoint = '/testnet-toncenter/getAddressBalance';
                    const params = new URLSearchParams({ address: tonwebAddress });
                    const url = `${endpoint}?${params.toString()}`;
                    
                    console.log(`Выполняем прямой запрос через fetch: ${url}`);
                    
                    const response = await fetch(url);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    
                    if (data && data.result) {
                        // Конвертируем в число
                        const balanceNum = Number(data.result);
                        if (isNaN(balanceNum)) {
                            throw new Error('Получено невалидное числовое значение (NaN)');
                        }
                        
                        // Сохраняем в кэш
                        localStorage.setItem(cacheKey, balanceNum.toString());
                        localStorage.setItem(`${cacheKey}_time`, now.toString());
                        
                        // Конвертируем из наноТОН в ТОН
                        const balanceInTon = balanceNum / 1_000_000_000;
                        console.log(`Получен баланс через прямой fetch для ${address.slice(-6)}: ${balanceInTon} TON`);
                        
                        return balanceInTon;
                    } else {
                        throw new Error('Отсутствует результат в ответе API');
                    }
                } catch (fetchError) {
                    console.error(`Ошибка при прямом запросе: ${fetchError}`);
                    // В случае ошибки прямого запроса используем кэш
                }
            }
            
            // Возвращаем null, если все способы получения баланса не удались
            return null;
        } catch (error) {
            console.error(`Ошибка получения баланса через TonWeb: ${error}`);
            
            // Проверяем, не связана ли ошибка с CORS
            if (error instanceof Error && error.message && (
                error.message.includes('CORS') || 
                error.message.includes('Failed to fetch') || 
                error.message.includes('Network Error')
            )) {
                console.error("Обнаружена CORS-ошибка при обращении к TonWeb API. Возможно, проблема с прокси.");
            }
            
            // Если есть кэшированные данные, возвращаем их даже если они устарели
            const cacheKey = `balance_${address}`;
            const cachedBalance = localStorage.getItem(cacheKey);
            if (cachedBalance) {
                const balanceValue = Number(cachedBalance) / 1_000_000_000;
                console.log(`Используем устаревший кэшированный баланс для ${address.slice(-6)}: ${balanceValue} TON`);
                return !isNaN(balanceValue) ? balanceValue : null;
            }
            
            return null;
        }
    }

    // Отдельный асинхронный метод для тестирования соединения
    private async testApiConnection(): Promise<boolean> {
        if (!this.tonweb) return false;
        
        try {
            // Используем запрос getBalance для тестовой ноды TON как проверку доступности API
            const testAddress = "EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG"; // Адрес тестовой ноды
            console.log("Выполняем тестовый запрос к TonWeb API...");
            const balance = await this.tonweb.getBalance(testAddress);
            console.log("TonWeb API доступен, получен баланс тестового адреса:", balance);
            return true;
        } catch (testError) {
            console.error("Тестовый запрос к TonWeb API не удался:", testError);
            
            // Расширенная диагностика ошибки
            if (testError instanceof Error) {
                const errorMsg = testError.message.toLowerCase();
                
                if (errorMsg.includes("cors") || errorMsg.includes("origin") || 
                   errorMsg.includes("не удалось выполнить запрос") || errorMsg.includes("failed to fetch")) {
                    console.warn("Обнаружена проблема с CORS или доступом к API. Проверьте следующее:");
                    console.warn("1. Правильно ли настроен локальный прокси в vite.config.ts");
                    console.warn("2. Запущен ли сервер разработки Vite с корректными настройками");
                    console.warn("3. Доступен ли toncenter.com с вашего устройства");
                    
                    // Попытка напрямую доступа к toncenter для проверки соединения
                    try {
                        console.log("Выполняем диагностический запрос напрямую к API...");
                        const checkResponse = await fetch("https://api.ton.sh/blockchain/v1/info");
                        
                        if (checkResponse.ok) {
                            console.log("Альтернативный API доступен. Проблема в настройках прокси или эндпоинта.");
                        } else {
                            console.log("Альтернативный API недоступен. Возможно проблема с подключением к интернету.");
                        }
                    } catch (diagError) {
                        console.log("Диагностический запрос тоже не удался:", diagError);
                        console.log("Возможно проблема с интернет-подключением или блокировка API.");
                    }
                }
            }
            
            // Не будем выбрасывать ошибку, просто логируем проблему и возвращаем false
            return false;
        }
    }
}

// Создаем экземпляр TonWebInstance в момент импорта модуля
const tonwebInstance = TonWebInstance.getInstance();

// Экспортируем экземпляр синглтона по умолчанию
export default tonwebInstance; 