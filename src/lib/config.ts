/**
 * Конфигурация приложения
 */

// Сетевые настройки
export const NETWORK = import.meta.env.VITE_TON_NETWORK || 'testnet';

// Адрес контракта
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as string;

// Настройки TonConnect
export const TONCONNECT_MANIFEST_URL = `${window.location.origin}/tonconnect-manifest.json`;

// Валидация конфигурации
if (!CONTRACT_ADDRESS) {
  console.warn('⚠️ Не задан адрес контракта (VITE_CONTRACT_ADDRESS). Используется значение по умолчанию.');
}

console.log('🔧 Конфигурация приложения:', {
  network: NETWORK,
  contractAddress: CONTRACT_ADDRESS,
  manifestUrl: TONCONNECT_MANIFEST_URL,
}); 