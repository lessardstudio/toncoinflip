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

// export default sendBetTransaction;
