import { beginCell } from '@ton/core';
import tonwebInstance from './tonwebInstance';

// Добавляем тип для результата ставки
export interface FlipResult {
    amount: number;
    side: boolean;
    error?: string;
    result?: string;
    txhash?: string;
    lt?: string;
    boc?: string;
}


// Интерфейс для адреса
interface AddressWrapper {
    toString: () => string;
}

// Интерфейс для параметров internal
interface InternalParams {
    value: number;
    body: any;
    bounce?: boolean;
    sendMode?: number;
}





// Интерфейс для контрактного провайдера
interface ContractProvider {
    internal: (address: string, params: InternalParams) => Promise<{ id?: string; boc?: string }>;
    getTransactions: (address: string, params: { limit: number; lt?: string; hash?: string }) => Promise<{ ok: boolean; result: any[] }>;
    sendBocReturnHash: (boc: string) => Promise<{ ok: boolean; result: { hash: string } }>;
    getTransactionsbyAddress: (address: string) => Promise<{ ok: boolean; result: any[] }>;
    get: () => Promise<{ stack: any[] }>;
    [key: string]: any; // Индексная сигнатура для дополнительных свойств
}

// Более простая реализация без прямого импорта из смарт-контракта
export class CoinFlipContract {
    [x: string]: any;
    private contract: any;
    // private readonly provider: ContractProvider;
    private readonly contractAddress: string;
    private readonly tonConnectUI: any;

    constructor(contractAddress: string, provider: ContractProvider | null | undefined, tonConnectUI: any) {
        if (!tonwebInstance.isValidAddress(contractAddress)) {
            throw new Error(`Invalid contract address: ${contractAddress}`);
        }
        // console.log('Provider type:', typeof provider);
        // Provider может быть недоступен до подключения кошелька.
        // Для чтения балансов и отправки транзакции через TonConnectUI он не требуется.
        if (!tonConnectUI) throw new Error('TonConnectUI is required');
        
        /* console.log('CoinFlipContract constructor:', {
            originalAddress: contractAddress,
            trimmedAddress: contractAddress.trim(),
            providerExists: !!provider,
            tonConnectUIExists: !!tonConnectUI
        }); */
        
        this.contractAddress = contractAddress.trim();
        this.provider = provider;
        this.tonConnectUI = tonConnectUI;
        this.initContract();
    }

    private async initContract(): Promise<void> {
        try {
            /* console.log('Начало инициализации контракта:', {
                contractAddress: this.contractAddress,
                isTestnet: import.meta.env.VITE_IS_TESTNET,
                tonwebExists: !!tonwebInstance,
                tonwebMethods: Object.keys(tonwebInstance)
            }); */

            // Пытаемся создать адрес через TonWeb
            /* console.log('Создаем адрес через TonWeb...'); */
            const address = await tonwebInstance.createAddress(this.contractAddress);
            /* console.log('Адрес создан:', {
                originalAddress: this.contractAddress,
                createdAddress: address,
                addressMethods: Object.keys(address || {})
            }); */
            
            // Получаем raw-адрес
            // console.log('Получаем raw-адрес...');
            const rawAddress = address.toString(true, true, true);
            //console.log('Raw адрес получен:', rawAddress);
            
            // Создаем контракт с raw-адресом
            // console.log('Создаем контракт...');
            this.contract = await tonwebInstance.createContract(rawAddress);
            /* console.log('Контракт создан:', {
                contract: this.contract,
                contractMethods: Object.keys(this.contract || {})
            }); */
        } catch (error) {
            console.error('Ошибка инициализации контракта:', {
                error,
                errorMessage: error instanceof Error ? error.message : 'Неизвестная ошибка',
                errorStack: error instanceof Error ? error.stack : undefined,
                contractAddress: this.contractAddress
            });
            
            // Пробуем использовать адрес из .env как запасной вариант
            const envAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
            /* console.log('Пробуем использовать адрес из .env:', {
                envAddress,
                currentAddress: this.contractAddress,
                isDifferent: envAddress !== this.contractAddress
            }); */

            if (envAddress && envAddress !== this.contractAddress) {
                try {
                    // console.log('Создаем адрес из .env...');
                    const envAddressObj = await tonwebInstance.createAddress(envAddress);
                    // console.log('Адрес из .env создан:', envAddressObj);

                    const rawEnvAddress = envAddressObj.toString(true, true, true);
                    // console.log('Raw адрес из .env получен:', rawEnvAddress);

                    this.contract = await tonwebInstance.createContract(rawEnvAddress);
                    /* console.log('Контракт создан с адресом из .env:', {
                        contract: this.contract,
                        contractMethods: Object.keys(this.contract || {})
                    }); */
                } catch (fallbackError) {
                    console.error('Ошибка при использовании адреса из .env:', {
                        error: fallbackError,
                        errorMessage: fallbackError instanceof Error ? fallbackError.message : 'Неизвестная ошибка',
                        envAddress
                    });
                    this.createFallbackContract();
                }
            } else {
                // console.log('Создаем fallback контракт...');
                this.createFallbackContract();
            }
        }
    }

    private createFallbackContract(): void {
        // console.log('Создание fallback контракта для адреса:', this.contractAddress);
        this.contract = {
            address: { 
                toString: () => this.contractAddress,
                equals: (other: any) => {
                    const otherStr = other?.toString();
                    /* console.log('Сравнение адресов:', {
                        thisAddress: this.contractAddress,
                        otherAddress: otherStr
                    }); */
                    return otherStr === this.contractAddress;
                }
            }
        };
    }

    // Метод для получения баланса контракта
    public async getBalance(): Promise<number> {
        try {
            const address = this.contract?.address?.toString() || this.contractAddress;
            /* console.log('Получение баланса для адреса:', {
                contractAddress: address,
                originalAddress: this.contractAddress,
                hasContract: !!this.contract,
                hasAddress: !!this.contract?.address
            }); */

            const balance = await tonwebInstance.getBalance(address);
            /* console.log('Баланс получен:', {
                address,
                balance,
                numberBalance: Number(balance)
            }); */
            return Number(balance) || 0;
        } catch (error) {
            console.error('Ошибка получения баланса контракта:', {
                error,
                errorMessage: error instanceof Error ? error.message : 'Неизвестная ошибка',
                contractAddress: this.contractAddress
            });
            return 0;
        }
    }

    // Метод для получения баланса кошелька
    public async getWalletBalance(walletAddress: string): Promise<number> {
        try {
            // Создаем адрес и получаем его raw-версию
            const address = await tonwebInstance.createAddress(walletAddress);
            const rawAddress = address.toString(true, true, true);
            const balance = await tonwebInstance.getBalance(rawAddress);
            return Number(balance) || 0;
        } catch (error) {
            console.error('Ошибка получения баланса кошелька:', error);
            return 0;
        }
    }

    

    public async sendFlip(side: boolean, amount: number): Promise<FlipResult> {
        try {
            console.log('Отправляю флип с параметрами: side =', side, 'amount =', amount, 'TON');
            
            // Конвертируем amount в наногоны
            const amountNano = Math.floor(amount * 1e9);
            console.log('Сумма в наногонах:', amountNano);
            
            const msgBody = beginCell()
                .storeUint(0x66b9a3fb, 32) // правильный operation code для Flip
                .storeBit(side)           // side parameter
                .endCell();

            // Формируем транзакцию напрямую для TonConnect UI
            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 360,
                messages: [{
                    address: this.contractAddress,
                    amount: amountNano.toString(),
                    payload: msgBody.toBoc().toString('base64')
                }]
            };
            
            // Отправляем транзакцию через TonConnect UI
            console.log('Отправляем транзакцию через TonConnectUI:', transaction);
            const result = await this.tonConnectUI.sendTransaction(transaction);
            console.log('Результат отправки транзакции:', result);

            if (!result) {
                throw new Error('Не получен результат транзакции');
            }

            return {
                amount: amount,
                side: side,
                txhash: result.boc ? await this.getTransactionHash(result.boc) : undefined,
                lt: result.lt,
                boc: result.boc
            };
        } catch (error) {
            console.error('Ошибка отправки транзакции:', error);
            return {
                amount: amount,
                side: side,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка'
            };
        }
    }

    private async getTransactionHash(boc: string): Promise<string> {
        try {
            const tonweb = tonwebInstance.getTonWeb();
            const bocBytes = tonweb.utils.base64ToBytes(boc);
            const cell = await tonweb.boc.Cell.oneFromBoc(bocBytes);
            const hashBytes = await cell.hash();
            return tonweb.utils.bytesToBase64(hashBytes);
        } catch (error) {
            console.error('Ошибка при получении хэша транзакции:', error);
            return '';
        }
    }

    

    

    public getContractAddress(): string {
        return this.contractAddress;
    }

    async getOwner(): Promise<AddressWrapper> {
        try {
            // console.log("Запрос владельца контракта");
            // Упрощенная версия без вызова метода контракта
            return this.contract.address;
        } catch (error) {
            console.error("Ошибка при получении владельца:", error);
            return this.contract.address;
        }
    }
}