import ReactCountryFlag from "react-country-flag";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"





import { Label } from "@/components/ui/label";
import { Locales, useTonConnectUI } from "@tonconnect/ui-react";
import { useTranslation } from "@/components/lang";
import { useRef, useState } from "react";

export function DropMenuSwitchLang() {
  const { locale, setLocale } = useTranslation();
  const [, setOptions] = useTonConnectUI();
  const { translations: T } = useTranslation();
  const isMobile = window.innerWidth <= 768; // Проверка, мобильное ли устройство

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
    if (isMobile) return;
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
    if (isMobile) return;
    isMouseOverMenu.current = true; // Устанавливаем флаг при наведении на меню
    if (timeoutId) {
      clearTimeout(timeoutId); // Очищаем таймаут, чтобы меню не закрылось
    }
  };
  
  const handleMenuMouseLeave = () => {
    if(isMobile) return;
    isMouseOverMenu.current = false; // Сбрасываем флаг при уходе с меню
    const id = setTimeout(() => {
      if (!isMouseOverMenu.current) {
        setIsOpen(false); // Закрываем меню при уходе с него
        console.log(isMobile);
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

    if (isMobile) return(
    <Drawer>
      <DrawerTrigger>
            <Button className="w-max font-bold" variant="ghost"
                ref={triggerRef}>
                {iconLang(locale).icon}
                <span className="pl-2 font-['Inter'] font-bold"> {T.lang}</span>
            </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{T.choselang}</DrawerTitle>
          <DrawerDescription></DrawerDescription>
        </DrawerHeader>
        <DrawerClose>
          <Button className={`${'bg-foreground-6per w-full my-1'}`} onClick={() => handleTrans(locale)} variant={'ghost'}>
            <div className={`flex justify-center items-center w-full py-0.5 gap-2 `}>
                  {iconLang(locale).icon}<span className={`font-['Inter']`}>{iconLang(locale).text}</span>
              </div>
          </Button>
        </DrawerClose>
          {items.map((lang) => {
            // Проверяем, нужно ли отображать элемент
            if (lang !== locale) {
              return (
                <DrawerClose>
                <Button className={`${'bg-foreground-6per w-full my-1'}`} onClick={() => handleTrans(lang)} variant={'ghost'}>
                  <div className={`flex justify-center items-center w-full py-0.5 gap-2 `}>
                        {iconLang(lang).icon}<span className={`font-['Inter']`}>{iconLang(lang).text}</span>
                  </div>
                </Button>
            </DrawerClose>
              );
            }
            return null; // Возвращаем null, если элемент не должен отображаться
          })}
        <DrawerFooter>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
    );



  return (
    <div className="flex flex-col items-center">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger/>
        <DropdownMenuContent
          ref={menuRef}
          className={`w-max h-max z-10 ${isMobile && 'hidden'}`}
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
