
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
