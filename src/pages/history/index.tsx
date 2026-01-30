import { useState, useEffect } from "react";
import { useTranslation } from "@/components/lang";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ItemsGames } from "../main/itemgames";
import { GameHistoryItem, getGameStatsFromHistory } from "@/lib/utils";
import { fetchOnchainHistory } from "@/lib/onchainHistory";
import { ArrowLeft } from "lucide-react";
import { useTonWallet } from '@tonconnect/ui-react';

export default function HistoryPage() {
    const { translations: T } = useTranslation();
    const navigate = useNavigate();
    const wallet = useTonWallet();
    const connected = Boolean(wallet?.account?.address);
    const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);
    const [stats, setStats] = useState(getGameStatsFromHistory([]));

    useEffect(() => {
        let cancelled = false;
        const loadHistory = async () => {
            if (!wallet?.account?.address) {
                setGameHistory([]);
                setStats(getGameStatsFromHistory([]));
                return;
            }
            try {
                const history = await fetchOnchainHistory(wallet.account.address.toString(), 200);
                if (cancelled) return;
                setGameHistory(history);
                setStats(getGameStatsFromHistory(history));
            } catch (error) {
                console.error("Ошибка при загрузке истории игр из чейна:", error);
                if (cancelled) return;
                setGameHistory([]);
                setStats(getGameStatsFromHistory([]));
            }
        };
        loadHistory();
        return () => {
            cancelled = true;
        };
    }, [wallet?.account?.address]);


    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return T.justNow || 'РўРѕР»СЊРєРѕ С‡С‚Рѕ';
        if (minutes < 60) return `${minutes} ${T.minutesAgo || 'РјРёРЅ. РЅР°Р·Р°Рґ'}`;
        if (hours < 24) return `${hours} ${T.hoursAgo || 'С‡. РЅР°Р·Р°Рґ'}`;
        if (days < 7) return `${days} ${T.daysAgo || 'РґРЅ. РЅР°Р·Р°Рґ'}`;
        
        return date.toLocaleDateString();
    };

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 py-8">
            {/* Р—Р°РіРѕР»РѕРІРѕРє */}
            <div className="flex flex-row items-center justify-between">
                <div className="flex flex-row items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        {T.back || 'РќР°Р·Р°Рґ'}
                    </Button>
                    <h1 className="text-3xl font-bold">{T.fullHistoryTitle || 'РџРѕР»РЅР°СЏ РёСЃС‚РѕСЂРёСЏ РёРіСЂ'}</h1>
                </div>
            </div>

            {/* РЎС‚Р°С‚РёСЃС‚РёРєР° */}
            {stats.totalGames > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[hsla(var(--main-col-bg)/1)] rounded-xl p-4">
                        <div className="text-sm text-[hsla(var(--foreground)/0.7)]">{T.totalGames || 'Р’СЃРµРіРѕ РёРіСЂ'}</div>
                        <div className="text-2xl font-bold">{stats.totalGames}</div>
                    </div>
                    <div className="bg-[hsla(var(--main-col-bg)/1)] rounded-xl p-4">
                        <div className="text-sm text-[hsla(var(--foreground)/0.7)]">{T.wins || 'РџРѕР±РµРґ'}</div>
                        <div className="text-2xl font-bold text-green-500">{stats.wins}</div>
                    </div>
                    <div className="bg-[hsla(var(--main-col-bg)/1)] rounded-xl p-4">
                        <div className="text-sm text-[hsla(var(--foreground)/0.7)]">{T.losses || 'РџРѕСЂР°Р¶РµРЅРёР№'}</div>
                        <div className="text-2xl font-bold text-red-500">{stats.losses}</div>
                    </div>
                    <div className="bg-[hsla(var(--main-col-bg)/1)] rounded-xl p-4">
                        <div className="text-sm text-[hsla(var(--foreground)/0.7)]">{T.totalWon || 'Р’С‹РёРіСЂР°РЅРѕ'}</div>
                        <div className="text-2xl font-bold text-green-500">{stats.totalWon.toFixed(2)} TON</div>
                    </div>
                </div>
            )}

            {/* РСЃС‚РѕСЂРёСЏ РёРіСЂ */}
            {gameHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-[hsla(var(--main-col-bg)/1)] rounded-xl">
                    <p className="text-xl text-[hsla(var(--foreground)/0.5)] mb-4">
                        {connected
                            ? (T.noGamesYet || 'История игр пуста')
                            : (T.connectWalletHistory || 'Подключите кошелек, чтобы увидеть историю')}
                    </p>
                    <Button onClick={() => navigate('/')}>
                        {T.goToGame || 'РџРµСЂРµР№С‚Рё Рє РёРіСЂРµ'}
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
