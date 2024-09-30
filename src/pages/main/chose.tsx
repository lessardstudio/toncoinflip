import { useState } from "react";
import { Bounce, toast } from "react-toastify";

import tonSVG from "@/assets/ton_symbol.svg";
import notSVG from "@/assets/not_symbol.svg";
import { useTranslation } from "@/components/lang";


const translate = 'translate-y-[0.075rem]'
const translate_default = 'translate-y-[-0.3rem]'

const TON: React.FC<{isPressed?: boolean}> =({isPressed=false}) => {return (
    <path className={`ease-in-out duration-300 ${isPressed ?  translate: translate_default}`} d="M48.2918 20.0928H23.7068C19.1865 20.0928 16.3214 24.9688 18.5955 28.9107L33.7685 55.2097C34.7587 56.9269 37.24 56.9269 38.2301 55.2097L53.4061 28.9107C55.6772 24.9751 52.8121 20.0928 48.2949 20.0928H48.2918ZM33.7562 47.323L30.4518 40.9278L22.4785 26.6675C21.9525 25.7548 22.6022 24.5852 23.7037 24.5852H33.7531V47.3261L33.7562 47.323ZM49.5139 26.6644L41.5438 40.9308L38.2393 47.323V24.5821H48.2887C49.3902 24.5821 50.0399 25.7517 49.5139 26.6644Z" fill="white"/>
)};

const NOT: React.FC<{isPressed?: boolean}> =({isPressed=false}) => {return (
    <path className={`ease-in-out duration-300 ${isPressed ?  translate: translate_default}`} d="M23.7082 51.9072L48.2932 51.9072C52.8135 51.9072 55.6786 47.0312 53.4045 43.0893L38.2315 16.7903C37.2413 15.0731 34.76 15.0731 33.7699 16.7903L18.5938 43.0893C16.3228 47.0249 19.1879 51.9072 23.7051 51.9072H23.7082ZM38.2438 24.677L41.5482 31.0722L49.5215 45.3325C50.0475 46.2452 49.3978 47.4148 48.2963 47.4148H38.2469V24.6739L38.2438 24.677ZM22.4861 45.3356L30.4562 31.0692L33.7607 24.677V47.4179H23.7113C22.6098 47.4179 21.9601 46.2483 22.4861 45.3356Z" fill="white"/>
)};


const Icon: React.FC<{  icon:  React.FC<{isPressed?: boolean}>,
                        func?: () => void,
                        className?: string,
                        col_back?: string,
                        col_fg?: string,
                        isPressed?: boolean,
                        id: number
                    }> =
                        ({ icon: IconComponent,
                        func = () => {},
                        className = "",
                        col_back = "#44BDFF",
                        col_fg = "#0098EA",
                        isPressed=false,
                        id
                    }) => {
    return (
        <div className={`${className} group`} onClick={func} id={id.toString()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="72" height="90" viewBox="0 0 72 78" fill="none">
                <path d="M36 78C55.8823 78 72 61.8823 72 42C72 22.1177 55.8823 6 36 6C16.1177 6 0 22.1177 0 42C0 61.8823 16.1177 78 36 78Z" fill={col_back}/>
                <path className={`ease-in-out duration-300 ${ isPressed ?  translate: translate_default}`} d="M36 72C55.8823 72 72 55.8823 72 36C72 16.1177 55.8823 0 36 0C16.1177 0 0 16.1177 0 36C0 55.8823 16.1177 72 36 72Z" fill={col_fg}/>
                {<IconComponent isPressed={isPressed}/>}
            </svg>
        </div>
    );
};

export default function ChoseItem () {
    const lschose = localStorage.getItem('choseTon')
    const [coin, setCoin] =  useState<number>(lschose != null? Number(lschose) : 0); // 0 - ton, 1 - not
    const [items, setItems] = useState([
        { id: 0, icon: TON, col_back: "#44BDFF", col_fg: "#0098EA" },
        { id: 1, icon: NOT, col_back: "#464646", col_fg: "#000000" },
      ]);
      const { translations: T } = useTranslation();

    const handleIconClick = (id: number) => {
        // Обновляем массив объектов, изменяя только нужный элемент
        const updatedItems = items.map(item => 
            item.id === id ? { ...item, isPressed: true } : item
        );
        setItems(updatedItems);
        setCoin(id); // Ваша функция для изменения coin
        localStorage.setItem('choseTon', id.toString());
        toast(
            <div className="flex flex row items-center gap-1">
                <img className="w-6 h-6" src={id==0?tonSVG:notSVG} alt="TON" />
                {T.youChoiceNotify}{id==0?"TON":"NOT"}
            </div>, {
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: localStorage.getItem('vite-ui-theme') as string,
            transition: Bounce,
          });
    };

    return(
        <div className="flex flex-row justify-center items-center gap-x-6 bg-foreground-6per rounded-[50px] px-10 py-2">
            <div className="text-right text-foreground text-4xl font-extrabold font-['Inter']">Chose side</div>
            {items.map(item => (
            <Icon
                icon={item.icon}
                className="select-none cursor-pointer" // React использует это для рендера
                id={item.id}   // Добавляем id для передачи в функцию
                func={()=> handleIconClick(item.id)}  // Используем id для функции
                isPressed={coin == item.id ? true : false}
                col_back={item.col_back}
                col_fg={item.col_fg}
            />
            ))}
            
        </div>
        
    );
};



