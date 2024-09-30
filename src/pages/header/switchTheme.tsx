
import { IconSun, IconMoon, IconSunMoon } from '@tabler/icons-react';

 
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu"
import { Label } from '@/components/ui/label';
import { Theme, useTonConnectUI } from '@tonconnect/ui-react';
import { ThemeType, useTheme } from '@/components/theme';
import { useTranslation } from '@/components/lang';
import { useRef, useState } from 'react';
 
export function DropMenuSwitchTheme() {
  const { translations: T } = useTranslation();
  const { theme, setTheme } = useTheme()
  const [, setOptions] = useTonConnectUI();
  function changeTheme(theme: ThemeType){
      setTheme(theme)
      setOptions({ uiPreferences: {theme: theme.toUpperCase() as Theme}});
  }

  function iconTheme(theme: ThemeType){
    switch (theme) {
      case 'light':
          return {btn: 'ghost', icon: <IconSun className='w-4 h-4'/>, label: <Label className='pl-2 truncate'>{T.light}</Label>}
        break;
      case 'dark':
        return {btn: 'ghost', icon: <IconMoon className='w-4 h-4'/>, label: <Label className='pl-2 truncate'>{T.dark}</Label>}
        break;
      case 'system':
        return {btn: 'secondary', icon: <IconSunMoon className='w-4 h-4'/>, label: <Label className='pl-2 truncate'>{T.system}</Label>}
        break;
      default:
        return {btn: 'secondary', icon: <IconSunMoon className='w-4 h-4'/>, label: <Label className='pl-2 truncate'>{T.system}</Label>}
        break;
    }
  };
  

  type varianttype = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;


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
 

  const Item: React.FC<{ theme: ThemeType }> = ({ theme = 'system' as ThemeType }) => {
    return (
        <DropdownMenuItem onSelect={() => changeTheme(theme as ThemeType)}>
          <div className='flex py-0.5 px-0.5'>
            {iconTheme(theme as ThemeType).icon}
            {/* {iconTheme(theme as ThemeType).label} */}
          </div>
        </DropdownMenuItem>
    );
};
const items: ThemeType[] = ['light', 'dark', 'system'];

  return (
    <div className="flex flex-col items-center">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger/>
        <DropdownMenuContent
        ref={menuRef}
        className={`w-min h-max`}
        onMouseEnter={handleMenuMouseEnter}
        onMouseLeave={handleMenuMouseLeave}>
        <Item theme={theme as ThemeType}/>
          {items.map((w) => {
            // Проверяем, нужно ли отображать элемент
            if (w !== theme) {
              return <Item key={w} theme={w} />;
            }
            return null; // Возвращаем null, если элемент не должен отображаться
          })}
          
        </DropdownMenuContent>
        <Button variant={iconTheme(theme as ThemeType).btn as varianttype}
        ref={triggerRef}
        onMouseEnter={() => handleMouseToggle(true)}
        onMouseLeave={() => handleMouseToggle(false)}>{iconTheme(theme as ThemeType).icon}</Button>
      </DropdownMenu>
    </div>
  )
}