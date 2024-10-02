import ReactCountryFlag from "react-country-flag";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Locales, useTonConnectUI } from "@tonconnect/ui-react";
import { useTranslation } from "@/components/lang";
import { useRef, useState } from "react";

export function DropMenuSwitchLang() {
  const { locale, setLocale } = useTranslation();
  const [, setOptions] = useTonConnectUI();
  const { translations: T } = useTranslation();

  const handleTrans = (locale: 'en' | 'ru') => {
    setLocale(locale);
    setOptions({ language: locale });
    localStorage.setItem('lang', locale);
  };

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null); // Для меню
  const triggerRef = useRef<HTMLButtonElement | null>(null); // Для триггера
  const isMouseOverMenu = useRef<boolean>(false); // Флаг для отслеживания, курсор над меню
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);
  
  const handleMouseToggle = (isEntering:boolean) => {
    if (isEntering) {
      setIsOpen(true); // Открываем меню
      if (timeoutId) {
        clearTimeout(timeoutId); // Очищаем предыдущий таймаут, если есть
      }
    } else {
      // Если курсор уходит с триггера
      if (!isMouseOverMenu.current) {
        const id = setTimeout(() => {
          setIsOpen(false); // Закрываем меню
        }, 100); // Устанавливаем задержку в 300 мс
        setTimeoutId(id); // Сохраняем идентификатор таймаута
      }
    }
  };
  
  const handleMenuMouseEnter = () => {
    isMouseOverMenu.current = true; // Устанавливаем флаг при наведении на меню
    if (timeoutId) {
      clearTimeout(timeoutId); // Очищаем таймаут, чтобы меню не закрылось
    }
  };
  
  const handleMenuMouseLeave = () => {
    isMouseOverMenu.current = false; // Сбрасываем флаг при уходе с меню
    const id = setTimeout(() => {
      if (!isMouseOverMenu.current) {
        setIsOpen(false); // Закрываем меню при уходе с него
      }
    }, 100); // Устанавливаем задержку в 300 мс
    setTimeoutId(id); // Сохраняем идентификатор таймаута
  };

  function iconLang(lang: 'en' | 'ru') {
    switch (lang) {
      case 'ru':
        return {
          text: <Label className="truncate">{T.rus}</Label>,
          icon: <ReactCountryFlag countryCode="RU" svg style={{ width: '1rem', height: '1rem' }} title="RU" />
        };
      case 'en':
        return {
          text: <Label className="truncate">{T.eng}</Label>,
          icon: <ReactCountryFlag countryCode="GB" svg style={{ width: '1rem', height: '1rem' }} title="GB" />
        };
      default:
        return {
          text: <Label className="truncate">{T.eng}</Label>,
          icon: <ReactCountryFlag countryCode="GB" svg style={{ width: '1rem', height: '1rem' }} title="GB" />
        };
    }
  }


const Item: React.FC<{ locale: Locales, className?: string, spanClass?: string }> = ({ locale = 'en' as Locales, className = "", spanClass = " "}) => {
    return (
        <DropdownMenuItem onSelect={() => handleTrans(locale)}>
            <div className={`flex justify-center items-center w-full py-0.5 gap-2 ${className}`}>
                {iconLang(locale).icon}<span className={`font-['Inter'] ${spanClass}`}>{iconLang(locale).text}</span>
            </div>
        </DropdownMenuItem>
    );
};
const items: Locales[] = ['ru', 'en'];

  return (
    <div className="flex flex-col items-center">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger/>
          
        <DropdownMenuContent
          ref={menuRef}
          className={`w-max h-max`}
          onMouseEnter={handleMenuMouseEnter}
          onMouseLeave={handleMenuMouseLeave}
        >
        
        
        <Item locale={locale as Locales}
        spanClass="font-bold-imp"/>
          {items.map((lang) => {
            // Проверяем, нужно ли отображать элемент
            if (lang !== locale) {
              return <Item key={lang} locale={lang} />;
            }
            return null; // Возвращаем null, если элемент не должен отображаться
          })}
        </DropdownMenuContent>
        <Button className="w-max font-bold" variant="ghost"
          ref={triggerRef}
          onMouseEnter={() => handleMouseToggle(true)}
          onMouseLeave={() => handleMouseToggle(false)}
          >
          {iconLang(locale).icon}
          <span className="pl-2 font-['Inter'] font-bold"> {T.lang}</span>
        </Button>
      </DropdownMenu>
    </div>
  );
}
