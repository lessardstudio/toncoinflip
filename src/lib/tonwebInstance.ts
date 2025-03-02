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

import TonWeb from 'tonweb';
import { HttpProvider } from 'tonweb/dist/types/providers/http-provider';

class TonWebInstance {
    private static instance: TonWebInstance;
    private tonweb: TonWeb | null = null;
    private isTestnet: boolean;
    private apiKey: string;

    private constructor() {
        // Определяем сеть
        this.isTestnet = import.meta.env.VITE_IS_TESTNET === 'true';
        this.apiKey = import.meta.env.VITE_TONCENTER_API_KEY || '';
        this.initializeTonWeb();
    }

    private initializeTonWeb(): void {
        try {
            // Выбираем endpoint в зависимости от сети
            const endpoint = this.isTestnet
                ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
                : 'https://toncenter.com/api/v2/jsonRPC';

            // Создаем провайдер с API ключом, если он есть
            const provider = new TonWeb.HttpProvider(endpoint, {
                apiKey: this.apiKey
            });

            // Создаем экземпляр TonWeb
            this.tonweb = new TonWeb(provider);
            console.log('TonWeb успешно инициализирован для', this.isTestnet ? 'testnet' : 'mainnet');
        } catch (error) {
            console.error('Ошибка при инициализации TonWeb:', error);
            this.tonweb = null;
        }
    }

    public static getInstance(): TonWebInstance {
        if (!TonWebInstance.instance) {
            TonWebInstance.instance = new TonWebInstance();
        }
        return TonWebInstance.instance;
    }

    public getTonWeb(): TonWeb | null {
        return this.tonweb;
    }

    public getProvider(): HttpProvider | null {
        return this.tonweb?.provider as HttpProvider || null;
    }

    public isTonWebReady(): boolean {
        return this.tonweb !== null;
    }

    public async waitForTonWeb(timeout: number = 5000): Promise<boolean> {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            if (this.isTonWebReady()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return false;
    }

    public async getBalance(address: string): Promise<number | null> {
        try {
            if (!this.tonweb) {
                console.warn('TonWeb не инициализирован');
                return null;
            }

            // Нормализуем адрес, заменяя / на _
            const normalizedAddress = address.replace(/\//g, '_');
            const balance = await this.tonweb.getBalance(normalizedAddress);
            return Number(balance) / 1_000_000_000; // Конвертируем в TON
        } catch (error) {
            console.error('Ошибка при получении баланса:', error);
            return null;
        }
    }
}

export default TonWebInstance.getInstance(); 