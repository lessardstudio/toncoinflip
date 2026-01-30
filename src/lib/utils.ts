import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Интерфейс для истории игры
export interface GameHistoryItem {
  id: string;
  timestamp: number;
  amount: number;
  side: boolean; // true = NOT, false = TON
  status: 'win' | 'lost';
  winAmount?: number;
  txHash?: string;
}

const HISTORY_STORAGE_KEY = 'tonflip_game_history';
const MAX_HISTORY_ITEMS = 1000; // Максимальное количество игр в истории

// Сохранение игры в историю
export function saveGameToHistory(game: Omit<GameHistoryItem, 'id' | 'timestamp'>): void {
  try {
    const history = getGameHistory();
    const newGame: GameHistoryItem = {
      ...game,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    // Добавляем новую игру в начало массива
    history.unshift(newGame);
    
    // Ограничиваем количество записей
    if (history.length > MAX_HISTORY_ITEMS) {
      history.splice(MAX_HISTORY_ITEMS);
    }
    
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Ошибка при сохранении игры в историю:', error);
  }
}

// Получение истории игр
export function getGameHistory(): GameHistoryItem[] {
  try {
    const historyJson = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!historyJson) return [];
    
    const history = JSON.parse(historyJson) as GameHistoryItem[];
    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.error('Ошибка при загрузке истории игр:', error);
    return [];
  }
}

// Получение последних N игр
export function getRecentGames(count: number = 10): GameHistoryItem[] {
  const history = getGameHistory();
  return history.slice(0, count);
}

// Очистка истории игр
export function clearGameHistory(): void {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (error) {
    console.error('Ошибка при очистке истории игр:', error);
  }
}

// Получение статистики игр
export function getGameStats(): {
  totalGames: number;
  wins: number;
  losses: number;
  totalWagered: number;
  totalWon: number;
} {
  return getGameStatsFromHistory(getGameHistory());
}

// РџРѕР»СѓС‡РµРЅРёРµ СЃС‚Р°С‚РёСЃС‚РёРєРё РёР· СЃРїРёСЃРєР° РёСЃС‚РѕСЂРёРё
export function getGameStatsFromHistory(history: GameHistoryItem[]): {
  totalGames: number;
  wins: number;
  losses: number;
  totalWagered: number;
  totalWon: number;
} {
  const wins = history.filter(game => game.status === 'win').length;
  const losses = history.filter(game => game.status === 'lost').length;
  const totalWagered = history.reduce((sum, game) => sum + game.amount, 0);
  const totalWon = history
    .filter(game => game.status === 'win' && game.winAmount)
    .reduce((sum, game) => sum + (game.winAmount || 0), 0);
  
  return {
    totalGames: history.length,
    wins,
    losses,
    totalWagered,
    totalWon,
  };
}
