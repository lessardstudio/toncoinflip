

import TON from '@/assets/ton_symbol.svg'
import NOT from '@/assets/not_symbol.svg'





export const ItemsGames: React.FC<{ object: string
                        func?: () => void,
                        className?: string,
                        side?: (0|1)
                        id: number
                    }> =
                        ({
                        func = () => {},
                        className = "",
                        side= 0,
                        id
                    }) => {
    return (
        <div className={`${className} relative group overflow-hidden w-[150px] h-[75px] bg-[hsl(var(--background))] rounded-[25px] `} onClick={func} id={id.toString()}>
            <img className='absolute bottom-[10%] left-[10%] rotate-12 scale-[200%] 
            group-hover:scale-[325%] group-hover:rotate-[16deg] 
            ease-in-out duration-300 ' src={side == 0 ? TON : NOT } alt={side == 0? 'TON' : 'NOT' } />
            <div className="flex"></div>
        </div>
    );
};

