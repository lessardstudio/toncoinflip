import { Slide, toast } from 'react-toastify';
import { ShieldX, ShieldCheck } from 'lucide-react'; // Убедитесь, что иконки подключены правильно
import { Theme } from '@tonconnect/ui';
import tonSVG from "@/assets/ton_symbol.svg";
import notSVG from "@/assets/not_symbol.svg";


// Общая функция для уведомлений
export const showToast = (content: JSX.Element, duration: number = 1000) => {
    toast(content, {
        position: 'top-center',
        autoClose: duration,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: localStorage.getItem('vite-ui-theme') === "system" ? "colored" : (localStorage.getItem('vite-ui-theme') as Theme),
        transition: Slide,
    });
};

// Уведомление о максимальной ставке
export const showMaxBetError = (T: any) => {
    showToast(
        <div className="flex flex-row items-center gap-1">
            <ShieldX className="w-6 h-6 text-[red]" />
            {T.maxbeterr}
        </div>
    );
};

// Уведомление об ошибке смены ставки
export const showBetChangeError = (T: any) => {
    showToast(
        <div className="flex flex-row items-center gap-1">
            <ShieldX className="w-6 h-6 text-[red]" />
            {T.beterrchange}
        </div>
    );
};

// Уведомление об успешной смене ставки
export const showBetChangeSuccess = (T: any, bet: number) => {
    showToast(
        <div className="flex flex-row items-center gap-1">
            <ShieldCheck className="w-6 h-6 text-[green]" />
            {T.betchange} {bet} TON
        </div>
    );
};



export const showCustomChoiceNotification = (id: number, T: any) => {

    showToast(
        <div className="flex flex-row items-center gap-1">
            <img className="w-6 h-6" src={id === 0 ? tonSVG : notSVG} alt="TON" />
            {T.youChoiceNotify} {id === 0 ? "TON" : "NOT"}
        </div>
    );
};


export const showChoiceErrorNotification = (id: number, T: any) => {
    showToast(
        <div className="flex flex-row items-center gap-1">
            <ShieldX className="w-6 h-6 text-[red]" />
            {T.youChoiceNotifyErr} {id === 0 ? "TON" : "NOT"}
        </div>
    );
};