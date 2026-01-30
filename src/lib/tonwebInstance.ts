import TonWeb from 'tonweb';

type TonWebType = typeof TonWeb;

interface TransactionInfo {
    address: string;
    utime: number;
    hash: string;
    lt: string;
    amount: string;
    from?: string;
    to?: string;
    fee: string;
}

class TonWebInstance {
    [x: string]: any;
    private static instance: TonWebInstance | null = null;
    private readonly tonweb: any;
    private readonly provider: any;
    private readonly isTestnet: boolean;

    private constructor() {
        try {
            this.isTestnet = import.meta.env.VITE_IS_TESTNET === 'true';
            
            const apiKey = import.meta.env.VITE_TONCENTER_API_KEY;

            /* console.log('Environment variables:', {
                VITE_IS_TESTNET: import.meta.env.VITE_IS_TESTNET,
                VITE_TONCENTER_API_KEY: apiKey ? 'exists' : 'missing'
            }); */

            // Добавляем слэш в конце URL если его нет
            const baseUrl = this.isTestnet 
                ? 'https://testnet.toncenter.com/api/v2/'
                : 'https://toncenter.com/api/v2/';
            
            const endpoint = `${baseUrl}jsonRPC`;
            /* console.log('Инициализация TonWeb:', {
                isTestnet: this.isTestnet,
                endpoint,
                hasApiKey: !!import.meta.env.VITE_TONCENTER_API_KEY
            }); */

            if (!apiKey) {
                console.warn('API ключ не найден в переменных окружения');
            }

            const options = {
                apiKey: apiKey || '',
                retry: true,
                timeout: 10000
            };
            
            const TonWebLib = TonWeb as TonWebType;
            this.provider = new TonWebLib.HttpProvider(endpoint, options);
            const envMaxRetries = Number(import.meta.env.VITE_TONCENTER_MAX_RETRIES);
            const envBaseDelayMs = Number(import.meta.env.VITE_TONCENTER_RETRY_DELAY_MS);
            const envMaxDelayMs = Number(import.meta.env.VITE_TONCENTER_RETRY_MAX_DELAY_MS);

            const maxRetries = Number.isFinite(envMaxRetries) ? Math.max(0, Math.floor(envMaxRetries)) : 4;
            const baseRetryDelayMs = Number.isFinite(envBaseDelayMs) ? Math.max(100, envBaseDelayMs) : 500;
            const maxRetryDelayMs = Number.isFinite(envMaxDelayMs) ? Math.max(baseRetryDelayMs, envMaxDelayMs) : 8000;

            const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

            const parseRetryAfterMs = (value: string | null): number | null => {
                if (!value) return null;
                const seconds = Number(value);
                if (Number.isFinite(seconds)) {
                    return Math.max(0, seconds * 1000);
                }
                const dateMs = Date.parse(value);
                if (!Number.isNaN(dateMs)) {
                    return Math.max(0, dateMs - Date.now());
                }
                return null;
            };

            const getRetryDelayMs = (attempt: number, retryAfter: string | null): number => {
                const retryAfterMs = parseRetryAfterMs(retryAfter);
                const expDelay = Math.min(maxRetryDelayMs, baseRetryDelayMs * Math.pow(2, attempt));
                const jitter = Math.floor(Math.random() * 250);
                if (retryAfterMs !== null) {
                    return Math.min(maxRetryDelayMs, Math.max(expDelay, retryAfterMs)) + jitter;
                }
                return expDelay + jitter;
            };

            const isRetryableStatus = (status: number) => status === 429 || status === 503;

            
            // Добавляем обработчик ошибок для провайдера
            this.provider.sendImpl = async (apiUrl: string, request: any) => {
                const maxAttempts = Math.max(1, maxRetries + 1);

                for (let attempt = 0; attempt < maxAttempts; attempt++) {
                    const isLastAttempt = attempt === maxAttempts - 1;

                    try {
                        if (request.method === 'getAddressBalance' && request.params?.address) {
                            const address = request.params.address;
                            if (typeof address === 'string') {
                                if (address.startsWith('EQ') || address.startsWith('UQ')) {
                                    const normalizedAddress = this.normalizeAddress(address);
                                    request.params.address = normalizedAddress;
                                }
                            }
                        }

                        const response = await fetch(apiUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': options.apiKey
                            },
                            body: JSON.stringify(request)
                        });

                        if (!response.ok) {
                            const shouldRetry = isRetryableStatus(response.status) && !isLastAttempt;
                            if (shouldRetry) {
                                const delayMs = getRetryDelayMs(attempt, response.headers.get('Retry-After'));
                                await sleep(delayMs);
                                continue;
                            }
                            const error = new Error(`HTTP error! status: ${response.status}`);
                            (error as any).details = {
                                status: response.status,
                                statusText: response.statusText,
                                request
                            };
                            (error as any).nonRetryable = true;
                            throw error;
                        }

                        const result = await response.json();
                        if (result.error) {
                            const errorDetails = {
                                error: result.error,
                                request,
                                responseBody: result
                            };
                            const errorMessage = result.error.message || result.error.code || 'Unknown API error';
                            const error = new Error(errorMessage);
                            (error as any).details = errorDetails;
                            (error as any).nonRetryable = true;
                            throw error;
                        }

                        return result;
                    } catch (error) {
                        const isNonRetryable = (error as any)?.nonRetryable === true;
                        if (!isNonRetryable && !isLastAttempt) {
                            const delayMs = getRetryDelayMs(attempt, null);
                            await sleep(delayMs);
                            continue;
                        }
                        console.error('TON Center request failed:', {
                            apiUrl,
                            error: error instanceof Error ? error.message : 'Unknown error',
                            request,
                            details: (error as any)?.details
                        });
                        throw error;
                    }
                }

                throw new Error('TON Center request failed');
            };
            this.tonweb = new TonWebLib(this.provider);
            // console.log('TonWeb успешно инициализирован');
        } catch (error) {
            console.error('Ошибка при инициализации TonWeb:', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    
    public static getInstance(): TonWebInstance {
        if (!TonWebInstance.instance) {
            TonWebInstance.instance = new TonWebInstance();
        }
        return TonWebInstance.instance;
    }

    public getTonWeb(): any {
        return this.tonweb;
    }
    
    public getProvider(): any {
        return this.provider;
    }
    
    public isInTestnet(): boolean {
        return this.isTestnet;
    }

    private base64UrlToHex(base64Url: string): string {
        try {
            // Убираем префикс EQ или UQ если есть
            const cleanBase64 = base64Url.replace(/^(EQ|UQ)/, '');
            
            // Заменяем URL-safe символы на стандартные base64
            let base64 = cleanBase64.replace(/-/g, '+').replace(/_/g, '/');
            
            // Добавляем padding
            while (base64.length % 4) {
                base64 += '=';
            }
            
            // Декодируем base64 в буфер
            const buffer = Buffer.from(base64, 'base64');
            
            // Конвертируем в hex
            let hex = buffer.toString('hex').toLowerCase();
            
            // Обрезаем или дополняем до 64 символов
            if (hex.length > 64) {
                hex = hex.slice(-64);
            } else {
                hex = hex.padStart(64, '0');
            }
            
            /* console.log('Base64Url to Hex конвертация:', {
                input: base64Url,
                cleanBase64,
                paddedBase64: base64,
                bufferLength: buffer.length,
                initialHexLength: buffer.toString('hex').length,
                resultHex: hex,
                finalHexLength: hex.length
            }); */
            
            return hex;
            } catch (error) {
            console.error('Ошибка конвертации base64url в hex:', {
                input: base64Url,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка'
            });
            throw error;
        }
    }

    private normalizeAddress(address: string): string {
        try {
            address = address.trim();
            if (address.startsWith('0:')) {
                const hex = address.slice(2);
                if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
                    throw new Error('Invalid hex format');
                }
                return address;
            }
            if (address.startsWith('EQ') || address.startsWith('UQ')) {
                const hex = this.base64UrlToHex(address);
                return `0:${hex}`;
            }
            throw new Error('Unsupported address format');
        } catch (error) {
            console.error('Address normalization error:', error);
            throw error;
        }
    }

    public createAddress(addressString: string): any {
        try {
            // console.log('Создание адреса из строки:', addressString);
            
            // Нормализуем адрес
            const normalizedAddress = this.normalizeAddress(addressString);
            // console.log('Нормализованный адрес:', normalizedAddress);
            
            // Создаем адрес через TonWeb
            const address = new this.tonweb.utils.Address(normalizedAddress);
            
            // Проверяем, что адрес создался корректно
            // const rawAddress = address.toString(true, true, true);
            /* console.log('Адрес создан успешно:', {
                original: addressString,
                normalized: normalizedAddress,
                raw: rawAddress
            });
             */
            return address;
        } catch (error: unknown) {
            console.error('Ошибка создания адреса:', {
                address: addressString,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка'
            });
            
            if (error instanceof Error) {
                throw new Error(`Неверный формат адреса: ${error.message}`);
            }
            throw new Error('Неверный формат адреса');
        }
    }

    public isValidAddress(address: string): boolean {
        try {
            const normalizedAddress = this.normalizeAddress(address);
            new this.tonweb.utils.Address(normalizedAddress);
            return true;
        } catch {
            return false;
        }
    }

    // Конвертация из TON в наногрэмы
    public toNano(amount: number | string): string {
        try {
            return this.tonweb.utils.toNano(amount.toString());
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Ошибка конвертации в наногрэмы:', error.message);
            }
            return '0';
        }
    }

    // Конвертация из наногрэмов в TON
    public fromNano(amountStr: string | number | undefined): string {
        // Добавляем проверку типа и преобразование
        if (typeof amountStr !== 'string' && typeof amountStr !== 'number') {
            console.error('Некорректный тип данных для конвертации:', typeof amountStr);
            return '0';
        }
        
        const str = amountStr.toString();
        
        // Проверяем, что строка содержит только цифры
        if (!/^\d+$/.test(str)) {
            console.warn('Некорректное значение для конвертации из наногрэмов:', str);
            return '0';
        }
        
        return this.tonweb.utils.fromNano(str);
    }

    // Получение баланса адреса
    public async getBalance(address: string): Promise<string> {
        try {
            //console.log('Запрос баланса для адреса:', address);

            // Проверяем и нормализуем адрес
            if (!address) {
                throw new Error('Адрес не указан');
            }

            let normalizedAddress = this.normalizeAddress(address);
            let response = await this.provider.send('getAddressInformation', {
                address: normalizedAddress
            });
            if (address.startsWith('EQ') || address.startsWith('UQ')) {
                normalizedAddress = this.normalizeAddress(address);
                // console.log('Адрес ', address, ' нормализован:', normalizedAddress);
                response = await this.provider.send('getAddressInformation', {
                    address: address
                });
            }

            if (!this.isValidAddress(normalizedAddress)) {
                throw new Error('Неверный формат адреса');
            }

            if (!response?.result) {
                throw new Error('Не получен результат запроса баланса');
            }

            const balance = response.result.balance;
            /* console.log('Баланс получен:', {
                address: normalizedAddress,
                rawBalance: balance,
                formattedBalance: this.fromNano(balance)
            }); */

            // Добавляем проверку результата
            if (!balance || typeof balance !== 'string') {
                console.warn('Некорректный формат баланса:', balance);
                response = await this.provider.send('getAddressInformation', {
                    address: address
                });
            }

            return this.fromNano(balance);
        } catch (error: unknown) {
            console.error('Ошибка при получении баланса:', {
                address,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return '0';
        }
    }

    // Отправка BOC в сеть
    public async sendBoc(bocBytes: Uint8Array): Promise<{ hash: string }> {
        try {
            const result = await this.provider.sendBoc(bocBytes);
            if (!result?.hash) {
                throw new Error('Не получен хеш транзакции');
            }
            return { hash: result.hash };
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Ошибка при отправке BOC:', error.message);
            }
            throw error;
        }
    }

    // Получение транзакций адреса
    public async getTransactionsbyTxHash(
        txHash: string,
        address: string,
        lt?: string
    ): Promise<TransactionInfo[]> {
        try {
            let response = await this.provider.send('getTransactions', {
                hash: txHash,
                address: address,
                lt: lt
            });
            return this.mapTransactions(response.result);
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Ошибка при получении транзакций по хэшу:', error.message);
            }
            throw error;
        }
    }

    private mapTransactions(txs: any[]): TransactionInfo[] {
        return txs.map((tx: any) => ({
            address: tx.address || '',
            utime: tx.utime || 0,
            hash: tx.hash || '',
            lt: tx.lt || '0',
            amount: this.fromNano(tx.amount || '0'),
            from: tx.in_msg?.source || '',
            to: tx.out_msgs?.[0]?.destination || '',
            fee: this.fromNano(tx.fee || '0')
        }));
    }

    // Получение транзакций адреса
    public async getTransactions(
        address: string, 
        limit: number = 20
    ): Promise<TransactionInfo[]> {
        try {
            if (!this.isValidAddress(address)) {
                throw new Error('Неверный формат адреса');
            }
            const txs = await this.provider.getTransactions(address, limit);
            return txs.map((tx: any) => ({
                address: tx.address,
                utime: tx.utime,
                hash: tx.hash,
                lt: tx.lt,
                amount: this.fromNano(tx.amount || '0'),
                from: tx.from_address,
                to: tx.to_address,
                fee: this.fromNano(tx.fee || '0')
            }));
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Ошибка при получении транзакций:', error.message);
            }
            return [];
        }
    }
    
    // Создание базового контракта
    public createContract(address: string | any, options: any = {}): any {
        try {
            const tonAddress = typeof address === 'string' ? this.createAddress(address) : address;
            return new this.tonweb.Contract(this.provider, {
                address: tonAddress,
                ...options
            });
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new Error(`Ошибка при создании контракта: ${error.message}`);
            }
            throw error;
        }
    }

    // Форматирование адреса
    public formatAddress(address: string | any): string {
        try {
            const tonAddress = typeof address === 'string' ? this.createAddress(address) : address;
            return tonAddress.toString();
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Ошибка форматирования адреса:', error.message);
            }
            return address.toString();
        }
    }

    public async getTransactionHash(boc: string): Promise<string> {
        try {
            /* console.log('Начало получения хэша транзакции из BOC:', {
                bocLength: boc?.length,
                bocPreview: boc?.slice(0, 50) + '...'
            }); */
            
            if (!boc) {
                throw new Error('BOC не может быть пустым');
            }

            // Конвертируем BOC из base64 в байты и создаем Cell
            const bocBytes = this.tonweb.utils.base64ToBytes(boc);
            const cell = this.tonweb.boc.Cell.oneFromBoc(bocBytes);
            
            if (!cell) {
                throw new Error('Не удалось создать Cell из BOC');
            }

            // Получаем хэш и конвертируем в base64
            const hashBytes = await cell.hash();
            const hashBase64 = this.tonweb.utils.bytesToBase64(hashBytes);

            /* console.log('Получен хэш транзакции:', {
                hashBase64,
                length: hashBase64.length
            }); */

            return hashBase64;
        } catch (error) {
            console.error('Ошибка при получении хэша транзакции:', {
                error: error instanceof Error ? error.message : 'Неизвестная ошибка',
                bocLength: boc?.length,
                bocStart: boc?.slice(0, 50)
            });
            throw new Error('Не удалось получить хэш транзакции: ' + (error instanceof Error ? error.message : 'неизвестная ошибка'));
        }
    }

    // Получение данных контракта
    async getContractData(address: string, method: string, params: any[] = []): Promise<any> {
        try {
            const result = await this.provider.call2(address, method, params);
            return result;
        } catch (error) {
            console.error('Ошибка при получении данных контракта:', error);
            throw error;
        }
    }

    public async sendProviderRequest(method: string, params: any): Promise<any> {
        return this.provider.send(method, params);
    }
}

const tonwebInstance = TonWebInstance.getInstance();
export default tonwebInstance; 