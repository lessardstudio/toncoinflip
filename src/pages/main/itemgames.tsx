import TON from '@/assets/ton_symbol.svg'
import NOT from '@/assets/not_symbol.svg'
import { useTranslation } from "@/components/lang";

interface GameData {
    id: number;
    amount: number;
    side: boolean;
    result: boolean | null;
}

export const ItemsGames: React.FC<{ 
    object: string;
    func?: () => void;
    className?: string;
    side?: 0 | 1;
    id: number;
}> = ({
    object,
    func = () => {},
    className = "",
    side = 0,
    id
}) => {
    const { translations: T } = useTranslation();
    let gameData: GameData;
    
    try {
        gameData = JSON.parse(object);
    } catch (error) {
        console.error('Ошибка при парсинге данных игры:', error);
        return null;
    }
    
    const getResultClass = () => {
        if (gameData.result === null) return 'bg-yellow-500/20';
        return gameData.result ? 'bg-green-500/20' : 'bg-red-500/20';
    };
    
    return (
        <div 
            className={`${className} relative group overflow-hidden w-[150px] h-[75px] rounded-[25px] ${getResultClass()}`} 
            onClick={func} 
            id={id.toString()}
        >
            <img 
                className='absolute bottom-[10%] left-[10%] rotate-12 scale-[200%] 
                group-hover:scale-[325%] group-hover:rotate-[16deg] 
                ease-in-out duration-300' 
                src={gameData.side ? NOT : TON} 
                alt={gameData.side ? T.bet2 : T.bet1} 
            />
            <div className="absolute top-2 right-2 text-sm font-medium">
                {gameData.amount} TON
            </div>
        </div>
    );
};

