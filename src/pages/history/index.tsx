import { useState, useEffect } from "react";
import { useTranslation } from "@/components/lang";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ItemsGames } from "../main/itemgames";
import { getGameHistory, clearGameHistory, getGameStats, GameHistoryItem } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default function HistoryPage() {
    const { translations: T } = useTranslation();
    const navigate = useNavigate();
    const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);
    const [stats, setStats] = useState(getGameStats());

    useEffect(() => {
        const history = getGameHistory();
        setGameHistory(history);
        setStats(getGameStats());
    }, []);

    const handleClearHistory = () => {
        if (window.confirm(T.clearHistoryConfirm || 'Вы уверены, что хотите очистить историю игр?')) {
            clearGameHistory();
            setGameHistory([]);
            setStats(getGameStats());
        }
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return T.justNow || 'Только что';
        if (minutes < 60) return `${minutes} ${T.minutesAgo || 'мин. назад'}`;
        if (hours < 24) return `${hours} ${T.hoursAgo || 'ч. назад'}`;
        if (days < 7) return `${days} ${T.daysAgo || 'дн. назад'}`;
        
        return date.toLocaleDateString();
    };

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 py-8">
            {/* Заголовок */}
            <div className="flex flex-row items-center justify-between">
                <div className="flex flex-row items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        {T.back || 'Назад'}
                    </Button>
                    <h1 className="text-3xl font-bold">{T.fullHistoryTitle || 'Полная история игр'}</h1>
                </div>
                {gameHistory.length > 0 && (
                    <Button
                        variant="destructive"
                        onClick={handleClearHistory}
                    >
                        {T.clearHistory || 'Очистить историю'}
                    </Button>
                )}
            </div>

            {/* Статистика */}
            {stats.totalGames > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[hsla(var(--main-col-bg)/1)] rounded-xl p-4">
                        <div className="text-sm text-[hsla(var(--foreground)/0.7)]">{T.totalGames || 'Всего игр'}</div>
                        <div className="text-2xl font-bold">{stats.totalGames}</div>
                    </div>
                    <div className="bg-[hsla(var(--main-col-bg)/1)] rounded-xl p-4">
                        <div className="text-sm text-[hsla(var(--foreground)/0.7)]">{T.wins || 'Побед'}</div>
                        <div className="text-2xl font-bold text-green-500">{stats.wins}</div>
                    </div>
                    <div className="bg-[hsla(var(--main-col-bg)/1)] rounded-xl p-4">
                        <div className="text-sm text-[hsla(var(--foreground)/0.7)]">{T.losses || 'Поражений'}</div>
                        <div className="text-2xl font-bold text-red-500">{stats.losses}</div>
                    </div>
                    <div className="bg-[hsla(var(--main-col-bg)/1)] rounded-xl p-4">
                        <div className="text-sm text-[hsla(var(--foreground)/0.7)]">{T.totalWon || 'Выиграно'}</div>
                        <div className="text-2xl font-bold text-green-500">{stats.totalWon.toFixed(2)} TON</div>
                    </div>
                </div>
            )}

            {/* История игр */}
            {gameHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-[hsla(var(--main-col-bg)/1)] rounded-xl">
                    <p className="text-xl text-[hsla(var(--foreground)/0.5)] mb-4">
                        {T.noGamesYet || 'История игр пуста'}
                    </p>
                    <Button onClick={() => navigate('/')}>
                        {T.goToGame || 'Перейти к игре'}
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {gameHistory.map((game, index) => (
                        <div key={game.id} className="flex flex-col gap-2">
                            <ItemsGames
                                id={index}
                                object={JSON.stringify({
                                    id: index,
                                    amount: game.amount,
                                    side: game.side,
                                    result: game.status === 'win',
                                })}
                                side={game.side ? 1 : 0}
                                className="w-full"
                            />
                            <div className="text-xs text-[hsla(var(--foreground)/0.6)] text-center">
                                {formatDate(game.timestamp)}
                            </div>
                            {game.status === 'win' && game.winAmount && (
                                <div className="text-xs text-green-500 text-center font-semibold">
                                    +{game.winAmount.toFixed(2)} TON
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
