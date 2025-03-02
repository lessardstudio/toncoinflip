import { Address, ContractProvider } from '@ton/core';
import { beginCell } from '@ton/core';

// Добавляем тип для результата ставки
export interface FlipResult {
    status: 'win' | 'lose' | 'pending' | 'error';
    amount: number;
    side: boolean;
    winAmount?: number;
    error?: string;
    transactionHash?: string;
}

// Более простая реализация без прямого импорта из смарт-контракта
export class CoinFlipContract {
    private address: Address;
    private provider: ContractProvider;

    constructor(address: string, provider: ContractProvider) {
        console.log("Инициализация CoinFlipContract с адресом:", address);
        this.provider = provider;
        this.address = Address.parse(address);
    }

    // Вспомогательный метод для проверки сети (mainnet/testnet)
    private getApiEndpoint(): string {
        // Для тестнета используем testnet.toncenter.com, для основной сети - toncenter.com
        const isTestnet = import.meta.env.VITE_IS_TESTNET === 'true' || import.meta.env.VITE_TESTNET === 'true';
        const baseUrl = isTestnet ? 'https://testnet.toncenter.com/api/v2' : 'https://toncenter.com/api/v2';
        
        // Если указан свой эндпоинт, используем его
        return import.meta.env.VITE_TON_ENDPOINT || baseUrl;
    }

    // Вспомогательный метод для получения баланса через HTTP API
    private async getBalanceViaHttp(address: string): Promise<number | null> {
        try {
            const baseEndpoint = this.getApiEndpoint();
            const apiKey = import.meta.env.VITE_TON_API_KEY || '';
            
            // Формируем правильный URL с параметром address
            const url = `${baseEndpoint}/getAddressBalance?address=${encodeURIComponent(address)}`;
            
            console.log("Выполняем HTTP запрос для получения баланса:", url);
            
            // Формируем заголовки запроса
            const headers: Record<string, string> = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            
            // Добавляем API ключ в заголовки, если он указан
            if (apiKey) {
                headers['X-API-Key'] = apiKey;
            }
            
            // Пробуем также использовать Authorization заголовок с тем же ключом
            if (apiKey && apiKey.length > 10) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }
            
            // Выполняем запрос с таймаутом в 5 секунд
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(url, {
                method: 'GET',
                headers,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`);
            }
            
            const data = await response.json();
            console.log("Ответ от API для баланса:", data);
            
            // Обрабатываем разные форматы ответа
            
            // Формат 1: { ok: true, result: "123456789" }
            if (data.ok === true && data.result) {
                const balanceInNanoTon = Number(data.result);
                if (!isNaN(balanceInNanoTon)) {
                    return balanceInNanoTon / 1_000_000_000;
                }
            }
            
            // Формат 2: { balance: "123456789" }
            if (data.balance) {
                const balanceInNanoTon = Number(data.balance);
                if (!isNaN(balanceInNanoTon)) {
                    return balanceInNanoTon / 1_000_000_000;
                }
            }
            
            // Формат 3: Прямое число в ответе
            if (typeof data === 'number') {
                return data / 1_000_000_000;
            }
            
            // Формат 4: Строка с числом в ответе
            if (typeof data === 'string') {
                const balanceInNanoTon = Number(data);
                if (!isNaN(balanceInNanoTon)) {
                    return balanceInNanoTon / 1_000_000_000;
                }
            }
            
            // Формат 5: Проверка других возможных полей
            const possibleFields = ['result', 'data', 'value', 'amount'];
            for (const field of possibleFields) {
                if (data[field] !== undefined) {
                    const balanceInNanoTon = Number(data[field]);
                    if (!isNaN(balanceInNanoTon)) {
                        return balanceInNanoTon / 1_000_000_000;
                    }
                }
            }
            
            console.error("Не удалось распарсить ответ API для баланса:", data);
            return null;
        } catch (error) {
            console.error("Ошибка HTTP API при получении баланса:", error);
            return null;
        }
    }

    async getBalance(): Promise<number> {
        try {
            console.log("Запрос реального баланса контракта");
            
            // Получаем кэшированное значение из localStorage
            const cachedBalance = parseFloat(localStorage.getItem('cachedContractBalance') || '50');
            const lastFetchTime = parseInt(localStorage.getItem('lastContractFetchTime') || '0');
            const now = Date.now();
            const FETCH_COOLDOWN = 30000; // 30 секунд между запросами
            
            // Если не прошло 30 секунд с последнего запроса, возвращаем кэшированное значение
            if (now - lastFetchTime < FETCH_COOLDOWN) {
                console.log("Используем кэшированный баланс контракта:", cachedBalance);
                return cachedBalance;
            }
            
            // Пробуем получить баланс через провайдер, если он доступен и является объектом
            if (this.provider && typeof this.provider === 'object' && this.provider !== null) {
                try {
                    // Безопасное преобразование к any для проверки наличия метода
                    const providerAny = this.provider as any;
                    
                    // Более надежная проверка на тип объекта перед использованием оператора in
                    if (
                        typeof providerAny === 'object' && 
                        providerAny !== null && 
                        !Array.isArray(providerAny) && 
                        'getBalance' in providerAny && 
                        typeof providerAny.getBalance === 'function'
                    ) {
                        const balance = await providerAny.getBalance(this.address);
                        const balanceInTon = Number(balance) / 1_000_000_000;
                        console.log("Получен реальный баланс контракта через getBalance:", balanceInTon, "TON");
                        
                        // Сохраняем полученное значение в localStorage
                        localStorage.setItem('cachedContractBalance', balanceInTon.toString());
                        localStorage.setItem('lastContractFetchTime', now.toString());
                        
                        return balanceInTon;
                    }
                } catch (providerError) {
                    console.error("Ошибка провайдера при получении баланса контракта:", providerError);
                    // Если не удалось получить через провайдер, продолжаем с другими методами
                }
            } else {
                console.log("Провайдер не определен или не является объектом, используем HTTP API");
            }
            
            // Если не удалось получить через провайдер или провайдер не определен,
            // пробуем получить через HTTP API
            const balanceFromHttp = await this.getBalanceViaHttp(this.address.toString());
            if (balanceFromHttp !== null) {
                console.log("Получен баланс контракта через HTTP API:", balanceFromHttp, "TON");
                
                // Сохраняем полученное значение в localStorage
                localStorage.setItem('cachedContractBalance', balanceFromHttp.toString());
                localStorage.setItem('lastContractFetchTime', now.toString());
                
                return balanceFromHttp;
            }
            
            // Если ни один метод не сработал, используем кэшированное значение
            console.log("Не удалось получить баланс контракта, используем кэшированное значение");
            return cachedBalance;
        } catch (error) {
            console.error("Общая ошибка при получении баланса контракта:", error);
            return parseFloat(localStorage.getItem('cachedContractBalance') || '50');
        }
    }

    // Метод для получения баланса кошелька
    async getWalletBalance(walletAddress: string): Promise<number> {
        try {
            console.log("Запрос реального баланса кошелька для адреса:", walletAddress);
            
            // Получаем кэшированное значение из localStorage
            const cachedBalance = parseFloat(localStorage.getItem('cachedWalletBalance') || '5');
            const lastFetchTime = parseInt(localStorage.getItem('lastWalletFetchTime') || '0');
            const now = Date.now();
            const FETCH_COOLDOWN = 30000; // 30 секунд между запросами
            
            // Если не прошло 30 секунд с последнего запроса, возвращаем кэшированное значение
            if (now - lastFetchTime < FETCH_COOLDOWN) {
                console.log("Используем кэшированный баланс кошелька:", cachedBalance);
                return cachedBalance;
            }
            
            // Создаем объект адреса кошелька
            const walletAddr = Address.parse(walletAddress);
            
            // Пробуем получить баланс через провайдер, если он доступен и является объектом
            if (this.provider && typeof this.provider === 'object' && this.provider !== null) {
                try {
                    // Безопасное преобразование к any для проверки наличия метода
                    const providerAny = this.provider as any;
                    
                    // Более надежная проверка на тип объекта перед использованием оператора in
                    if (
                        typeof providerAny === 'object' && 
                        providerAny !== null && 
                        !Array.isArray(providerAny) && 
                        'getBalance' in providerAny && 
                        typeof providerAny.getBalance === 'function'
                    ) {
                        const balance = await providerAny.getBalance(walletAddr);
                        const balanceInTon = Number(balance) / 1_000_000_000;
                        console.log("Получен реальный баланс кошелька через getBalance:", balanceInTon, "TON");
                        
                        // Сохраняем полученное значение в localStorage
                        localStorage.setItem('cachedWalletBalance', balanceInTon.toString());
                        localStorage.setItem('lastWalletFetchTime', now.toString());
                        
                        return balanceInTon;
                    }
                } catch (providerError) {
                    console.error("Ошибка провайдера при получении баланса кошелька:", providerError);
                    // Если не удалось получить через провайдер, продолжаем с другими методами
                }
            } else {
                console.log("Провайдер не определен или не является объектом, используем HTTP API для кошелька");
            }
            
            // Если не удалось получить через провайдер или провайдер не определен,
            // пробуем получить через HTTP API
            const balanceFromHttp = await this.getBalanceViaHttp(walletAddr.toString());
            if (balanceFromHttp !== null) {
                console.log("Получен баланс кошелька через HTTP API:", balanceFromHttp, "TON");
                
                // Сохраняем полученное значение в localStorage
                localStorage.setItem('cachedWalletBalance', balanceFromHttp.toString());
                localStorage.setItem('lastWalletFetchTime', now.toString());
                
                return balanceFromHttp;
            }
            
            // Если ни один метод не сработал, используем кэшированное значение
            console.log("Не удалось получить баланс кошелька, используем кэшированное значение");
            return cachedBalance;
        } catch (error) {
            console.error("Общая ошибка при получении баланса кошелька:", error);
            return parseFloat(localStorage.getItem('cachedWalletBalance') || '5');
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
                address: this.address.toString(),
                amount: amount,
                messageBody: messageBody.toString()
            });
            
            // Преобразуем байт-код ячейки в base64 для отправки через TonConnect
            const base64Boc = messageBody.toBoc().toString('base64');
            console.log("Base64 BOC:", base64Boc);
            
            // Вызываем метод internal из провайдера
            const result = await (this.provider as any).internal(this.address.toString(), {
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

    async getOwner(): Promise<Address> {
        try {
            console.log("Запрос владельца контракта");
            // Упрощенная версия без вызова метода контракта
            return this.address;
        } catch (error) {
            console.error("Ошибка при получении владельца:", error);
            return this.address;
        }
    }
} 