// // import { useTonConnectUI } from '@tonconnect/ui-react';
// // import TonWeb from 'tonweb';

// const sendBetTransaction = async (bet: number, amount: number) => {
//     // const [tonConnectUI] = useTonConnectUI();
  
//     // // Создаем объект транзакции
//     // const transaction = {
//     //   validUntil: Date.now() + 5 * 60 * 1000,
//     //   messages: [
//     //     {
//     //       address: "<адрес_вашего_контракта>", // адрес контракта в удобном формате
//     //       amount: String(TonWeb.utils.toNano(amount)), // Сумма в нанотонах
//     //       // Преобразуем payload в строку
//     //       payload: TonWeb.utils.bytesToHex(TonWeb.utils.hexToBytes(bet.toString(16).padStart(64, '0'))), // байтовое представление ставки в HEX-формате
//     //     },
//     //   ],
//     // };
  
//     // try {
//     //   // Отправляем транзакцию
//     //   await tonConnectUI.sendTransaction(transaction);
//     //   console.log('Transaction sent successfully');
//     // } catch (error) {
//     //   console.error('Failed to send transaction', error);
//     // }
//   };

/**
 * Функция отправки ставки 
 * @param flipHandler - функция для обработки ставки
 * @returns функция, принимающая параметры ставки
 */
const createBetTransaction = (
  flipHandler: (side: boolean, amount: number) => Promise<void>
) => {
  return async (bet: number, amount: number) => {
    // преобразуем число в булево: 1 = орел, 0 = решка
    const side = bet === 1;
    await flipHandler(side, amount);
  };
};

export default createBetTransaction;
